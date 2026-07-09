from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import prompts, schemas
from app.llm import client
from app.scrape import scrape_pinterest, scrape_website

router = APIRouter(prefix="/import", tags=["import"])


def _to_recipe_create(parsed, source_url: str | None, source_image: str | None, source_type: str) -> schemas.ImportedRecipe:
    """LLM returns an ad-hoc Recipe shape; convert to our RecipeCreate."""
    metadata = getattr(parsed, "metadata", None)
    return schemas.ImportedRecipe(
        recipe=schemas.RecipeCreate(
            title=parsed.title,
            ingredients=[
                schemas.RecipeIngredient(text=i.text, quantity=i.quantity, unit=i.unit)
                for i in parsed.ingredients
            ],
            steps=list(parsed.instructions),
            notes=getattr(parsed, "notes", None) or None,
            prep_time=getattr(metadata, "prep_time", None) if metadata else None,
            cook_time=getattr(metadata, "cook_time", None) if metadata else None,
            servings=getattr(metadata, "servings", None) if metadata else None,
            source_url=source_url,
            source_type=source_type,
            cover_image=None,
        ),
        source_url=source_url,
        source_image=source_image,
    )


# --- Ad-hoc pydantic schema for the LLM structured-output response ---


from pydantic import BaseModel


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


@router.post("/website", response_model=schemas.ImportedRecipe)
async def import_website(body: schemas.UrlImportRequest):
    scraped = await scrape_website(body.url)
    completion = await client.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompts.SCRAPE_STRUCTURE},
            {"role": "user", "content": scraped["raw_text"]},
        ],
        response_format=_LLMRecipe,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Structuring failed")
    return _to_recipe_create(parsed, scraped["source_url"], scraped["source_image"], "website")


@router.post("/pinterest", response_model=schemas.ImportedRecipe)
async def import_pinterest(body: schemas.UrlImportRequest):
    scraped = await scrape_pinterest(body.url)
    completion = await client.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompts.SCRAPE_STRUCTURE},
            {"role": "user", "content": scraped["raw_text"]},
        ],
        response_format=_LLMRecipe,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Structuring failed")
    return _to_recipe_create(parsed, scraped["source_url"], scraped["source_image"], "pinterest")


@router.post("/photo", response_model=schemas.ImportedRecipe)
async def import_photo(image: UploadFile = File(...)):
    import base64

    image_bytes = await image.read()
    fmt = (image.content_type or "image/jpeg").split("/")[-1]
    data_url = f"data:image/{fmt};base64,{base64.b64encode(image_bytes).decode()}"

    completion = await client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": prompts.IMAGE_STRUCTURE},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Please extract the recipe from this image."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        response_format=_LLMRecipe,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Structuring failed")
    return _to_recipe_create(parsed, None, None, "photo")
