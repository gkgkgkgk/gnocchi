"""Recipe imports: URL scraping (Pinterest, generic websites) + photo OCR.

Fast path: many recipe sites embed schema.org/Recipe as JSON-LD. When we
find it, we skip the LLM entirely and return a Recipe built directly from
the structured data. Falls back to Claude for pages that don't."""

from __future__ import annotations

import base64
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app import prompts, schemas
from app.llm import MODEL_FAST, call_structured
from app.scrape import scrape_pinterest, scrape_website

router = APIRouter(prefix="/import", tags=["import"])


# --- Ad-hoc pydantic schema for the LLM-extracted Recipe. Uses the same
# top-level shape as our real Recipe so we can copy fields across without
# renames.


class _LLMIngredient(BaseModel):
    text: str
    quantity: float = 0
    unit: str = ""


class _LLMMetadata(BaseModel):
    prep_time: int = 0
    cook_time: int = 0
    servings: int = 1


class _LLMRecipe(BaseModel):
    title: str
    ingredients: list[_LLMIngredient]
    instructions: list[str]
    notes: str = ""
    metadata: _LLMMetadata


def _to_imported(parsed: _LLMRecipe, source_url: str | None, source_image: str | None, source_type: str) -> schemas.ImportedRecipe:
    return schemas.ImportedRecipe(
        recipe=schemas.RecipeCreate(
            title=parsed.title,
            ingredients=[
                schemas.RecipeIngredient(text=i.text, quantity=i.quantity, unit=i.unit)
                for i in parsed.ingredients
            ],
            steps=list(parsed.instructions),
            notes=parsed.notes or None,
            prep_time=parsed.metadata.prep_time or None,
            cook_time=parsed.metadata.cook_time or None,
            servings=parsed.metadata.servings or None,
            source_url=source_url,
            source_type=source_type,
            cover_image=None,
        ),
        source_url=source_url,
        source_image=source_image,
    )


def _from_jsonld(data: dict[str, Any]) -> _LLMRecipe:
    """Convert a schema.org/Recipe JSON-LD blob into our _LLMRecipe shape.
    Handles the common variations: string vs {@type:HowToStep,text:...} for
    instructions, ISO-8601 durations for times, various image shapes."""
    import re

    def _duration_to_minutes(v: Any) -> int:
        if not v:
            return 0
        # PT30M, PT1H30M, PT1H
        m = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?", str(v))
        if not m:
            return 0
        h = int(m.group(1) or 0)
        mins = int(m.group(2) or 0)
        return h * 60 + mins

    def _first_int(v: Any) -> int:
        if v is None:
            return 0
        if isinstance(v, int):
            return v
        m = re.search(r"\d+", str(v))
        return int(m.group(0)) if m else 0

    raw_ings = data.get("recipeIngredient") or data.get("ingredients") or []
    ingredients: list[_LLMIngredient] = []
    for line in raw_ings:
        s = str(line).strip()
        if not s:
            continue
        # Best-effort qty extraction from "2 cups flour", "1/2 tsp salt", etc.
        m = re.match(r"^([\d]+(?:[.\/][\d]+)?|\d+\s+\d+\/\d+)\s+([A-Za-z.]+)?\s*(.*)$", s)
        qty = 0.0
        unit = ""
        if m:
            qraw = m.group(1)
            if "/" in qraw and " " in qraw:
                whole, frac = qraw.split(" ", 1)
                a, b = frac.split("/")
                qty = float(whole) + float(a) / float(b)
            elif "/" in qraw:
                a, b = qraw.split("/")
                qty = float(a) / float(b)
            else:
                qty = float(qraw)
            unit = (m.group(2) or "").strip(".") if m.group(2) else ""
        ingredients.append(_LLMIngredient(text=s, quantity=qty, unit=unit))

    raw_ins = data.get("recipeInstructions") or []
    instructions: list[str] = []
    if isinstance(raw_ins, str):
        # HTML blob — split on newlines/periods.
        instructions = [p.strip() for p in re.split(r"[\n\r]+", raw_ins) if p.strip()]
    else:
        for it in raw_ins:
            if isinstance(it, str):
                instructions.append(it.strip())
            elif isinstance(it, dict):
                # HowToStep or HowToSection
                if it.get("@type") == "HowToSection":
                    for sub in it.get("itemListElement") or []:
                        if isinstance(sub, dict) and sub.get("text"):
                            instructions.append(str(sub["text"]).strip())
                        elif isinstance(sub, str):
                            instructions.append(sub.strip())
                else:
                    text = it.get("text") or it.get("name") or ""
                    if text:
                        instructions.append(str(text).strip())

    return _LLMRecipe(
        title=str(data.get("name") or "Untitled").strip(),
        ingredients=ingredients,
        instructions=instructions,
        notes="",
        metadata=_LLMMetadata(
            prep_time=_duration_to_minutes(data.get("prepTime")),
            cook_time=_duration_to_minutes(data.get("cookTime")),
            servings=_first_int(data.get("recipeYield")) or 1,
        ),
    )


async def _extract_via_llm(text: str) -> _LLMRecipe:
    return await call_structured(
        model=MODEL_FAST,
        system=prompts.SCRAPE_STRUCTURE,
        user=text,
        tool_name="record_recipe",
        tool_description="Record the extracted recipe with structured fields.",
        schema=_LLMRecipe,
    )


@router.post("/website", response_model=schemas.ImportedRecipe)
async def import_website(body: schemas.UrlImportRequest):
    scraped = await scrape_website(body.url)
    if scraped.get("jsonld"):
        return _to_imported(_from_jsonld(scraped["jsonld"]), scraped["source_url"], scraped["source_image"], "website")
    parsed = await _extract_via_llm(scraped["raw_text"])
    return _to_imported(parsed, scraped["source_url"], scraped["source_image"], "website")


@router.post("/pinterest", response_model=schemas.ImportedRecipe)
async def import_pinterest(body: schemas.UrlImportRequest):
    scraped = await scrape_pinterest(body.url)
    if scraped.get("jsonld"):
        return _to_imported(_from_jsonld(scraped["jsonld"]), scraped["source_url"], scraped["source_image"], "pinterest")
    parsed = await _extract_via_llm(scraped["raw_text"])
    return _to_imported(parsed, scraped["source_url"], scraped["source_image"], "pinterest")


@router.post("/photo", response_model=schemas.ImportedRecipe)
async def import_photo(image: UploadFile = File(...)):
    image_bytes = await image.read()
    media_type = image.content_type or "image/jpeg"
    encoded = base64.standard_b64encode(image_bytes).decode()
    parsed = await call_structured(
        model=MODEL_FAST,
        system=prompts.IMAGE_STRUCTURE,
        user=[
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": encoded},
            },
            {"type": "text", "text": "Extract the recipe from this image."},
        ],
        tool_name="record_recipe",
        tool_description="Record the extracted recipe with structured fields.",
        schema=_LLMRecipe,
    )
    return _to_imported(parsed, None, None, "photo")
