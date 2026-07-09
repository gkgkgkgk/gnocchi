"""AI operations that don't fit under /import or /ai-tools: annotate,
analyze, execute a tool, generate a shopping list."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import prompts, schemas
from app.llm import client

router = APIRouter(prefix="/ai", tags=["ai"])


# --- Ad-hoc LLM response schemas (same as imports; kept separate for clarity)


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


class _RecipeInsight(BaseModel):
    insight: str
    recommended_tool: str | None = None


@router.post("/annotate", response_model=schemas.AnnotateResponse)
async def annotate(body: schemas.AnnotateRequest):
    ingredients_list = "\n".join(f"- {i}" for i in body.ingredients)
    instructions_list = "\n".join(f"{i+1}. {s}" for i, s in enumerate(body.instructions))
    prompt = f"INGREDIENTS LIST:\n{ingredients_list}\n\nINSTRUCTIONS:\n{instructions_list}"

    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompts.ANNOTATE_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        response_format=schemas.AnnotateResponse,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Annotation failed")
    return parsed


@router.post("/analyze", response_model=schemas.AnalyzeResponse)
async def analyze(body: schemas.AnalyzeRequest):
    ingredients_text = "\n".join(f"- {i.text}" for i in body.recipe.ingredients)
    restrictions = (body.preferences.dietary_restrictions if body.preferences else []) or ["None"]
    restrictions_text = ", ".join(restrictions)

    # Available tools — for now, hardcoded fallback. Phase 5 makes this
    # aware of the ai_tools table so the model picks tools that exist.
    tools_text = '- "suggest_substitutions": When ingredients conflict with dietary restrictions'

    user_prompt = f"""Analyze this recipe for dietary compliance:

RECIPE: {body.recipe.title}

INGREDIENTS:
{ingredients_text}

DIETARY RESTRICTIONS: {restrictions_text}

Provide your analysis."""

    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompts.analyze_system(tools_text)},
            {"role": "user", "content": user_prompt},
        ],
        response_format=_RecipeInsight,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Analysis failed")
    return schemas.AnalyzeResponse(insight=parsed.insight, recommended_tool=parsed.recommended_tool)


@router.post("/execute-tool", response_model=schemas.ExecuteToolResponse)
async def execute_tool(body: schemas.ExecuteToolRequest):
    ingredients_text = "\n".join(f"- {i.text}" for i in body.recipe.ingredients)
    instructions_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(body.recipe.instructions))

    reasoning_section = (
        f"\n\nAnalysis: {body.ai_reasoning}\nConsider this when making modifications."
        if body.ai_reasoning else ""
    )
    guidance_section = (
        f"\n\nUser's guidance: {body.user_guidance}\nPlease incorporate this."
        if body.user_guidance else ""
    )

    md = body.recipe.metadata or {}
    user_prompt = f"""Original Recipe: {body.recipe.title}

Ingredients:
{ingredients_text}

Instructions:
{instructions_text}

Metadata:
- Prep Time: {md.get('prep_time', 0)} minutes
- Cook Time: {md.get('cook_time', 0)} minutes
- Servings: {md.get('servings', 1)}

Notes: {body.recipe.notes or 'None'}{reasoning_section}{guidance_section}

Please modify this recipe according to the tool's purpose. Return a complete recipe with all fields filled out."""

    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompts.execute_tool_system(body.tool.description, body.tool.prompt)},
            {"role": "user", "content": user_prompt},
        ],
        response_format=_LLMRecipe,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Tool execution failed")

    return schemas.ExecuteToolResponse(
        recipe=schemas.AIRecipePayload(
            title=parsed.title,
            ingredients=[
                schemas.RecipeIngredient(text=i.text, quantity=i.quantity, unit=i.unit)
                for i in parsed.ingredients
            ],
            instructions=list(parsed.instructions),
            notes=parsed.notes,
            metadata={
                "prep_time": parsed.metadata.prep_time,
                "cook_time": parsed.metadata.cook_time,
                "servings": parsed.metadata.servings,
            },
        )
    )


@router.post("/shopping-list", response_model=schemas.ShoppingListResponse)
async def shopping_list(body: schemas.ShoppingListRequest):
    recipes_text = "\n\n".join(
        f"### {r.title}\n" + "\n".join(f"- {i.text}" for i in r.ingredients)
        for r in body.recipes
    )

    class _Item(BaseModel):
        text: str
        source: list[str]

    class _Resp(BaseModel):
        items: list[_Item]

    completion = await client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": prompts.SHOPPING_LIST_SYSTEM},
            {"role": "user", "content": f"Generate a shopping list for these recipes:\n\n{recipes_text}"},
        ],
        response_format=_Resp,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Shopping list generation failed")
    return schemas.ShoppingListResponse(
        items=[schemas.ShoppingListItem(name=i.text, sources=i.source) for i in parsed.items]
    )
