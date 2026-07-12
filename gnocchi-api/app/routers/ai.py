"""AI operations: annotate, analyze, execute a tool, generate a shopping list.

Every endpoint funnels through `call_structured` in app.llm, which forces a
tool-call structured response and caches the (usually large) system prompt."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app import prompts, schemas
from app.llm import MODEL_FAST, MODEL_STRONG, call_structured

router = APIRouter(prefix="/ai", tags=["ai"])


# --- Ad-hoc LLM shapes ---


class _LLMIngredient(BaseModel):
    text: str
    quantity: float = 0
    unit: str = ""
    optional: bool = False


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


class _LLMChatRecipe(_LLMRecipe):
    # A short conversational message describing what was created/changed.
    chat_reply: str = ""


class _LLMRecipeChat(_LLMRecipe):
    # Conversational answer + whether the recipe was actually changed.
    reply: str = ""
    changed: bool = False


class _RecipeInsight(BaseModel):
    insight: str
    recommended_tool: str | None = None


class _ShoppingItem(BaseModel):
    text: str
    source: list[str]


class _ShoppingResp(BaseModel):
    items: list[_ShoppingItem]


# --- Endpoints ---


@router.post("/annotate", response_model=schemas.AnnotateResponse)
async def annotate(body: schemas.AnnotateRequest):
    ingredients_list = "\n".join(f"- {i}" for i in body.ingredients)
    instructions_list = "\n".join(f"{i+1}. {s}" for i, s in enumerate(body.instructions))
    user = f"INGREDIENTS LIST:\n{ingredients_list}\n\nINSTRUCTIONS:\n{instructions_list}"

    return await call_structured(
        model=MODEL_FAST,
        system=prompts.ANNOTATE_SYSTEM,
        user=user,
        tool_name="record_annotations",
        tool_description="Record the annotated instructions.",
        schema=schemas.AnnotateResponse,
    )


@router.post("/analyze", response_model=schemas.AnalyzeResponse)
async def analyze(body: schemas.AnalyzeRequest):
    ingredients_text = "\n".join(f"- {i.text}" for i in body.recipe.ingredients)
    restrictions = (body.preferences.dietary_restrictions if body.preferences else []) or ["None"]
    restrictions_text = ", ".join(restrictions)
    tools_text = '- "suggest_substitutions": When ingredients conflict with dietary restrictions'

    user = f"""Analyze this recipe for dietary compliance:

RECIPE: {body.recipe.title}

INGREDIENTS:
{ingredients_text}

DIETARY RESTRICTIONS: {restrictions_text}

Provide your analysis."""

    parsed = await call_structured(
        model=MODEL_FAST,
        system=prompts.analyze_system(tools_text),
        user=user,
        tool_name="record_insight",
        tool_description="Record the recipe insight and optional recommended tool.",
        schema=_RecipeInsight,
    )
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

    user = f"""Original Recipe: {body.recipe.title}

Ingredients:
{ingredients_text}

Instructions:
{instructions_text}

Metadata:
- Prep Time: {md.get('prep_time', 0)} minutes
- Cook Time: {md.get('cook_time', 0)} minutes
- Servings: {md.get('servings', 1)}

Notes: {body.recipe.notes or 'None'}{reasoning_section}{guidance_section}

Return a complete modified recipe."""

    parsed = await call_structured(
        model=MODEL_FAST,
        system=prompts.execute_tool_system(body.tool.description, body.tool.prompt),
        user=user,
        tool_name="record_modified_recipe",
        tool_description="Record the modified recipe with all fields.",
        schema=_LLMRecipe,
    )
    return schemas.ExecuteToolResponse(
        recipe=schemas.AIRecipePayload(
            title=parsed.title,
            ingredients=[
                schemas.RecipeIngredient(text=i.text, quantity=i.quantity, unit=i.unit, optional=i.optional)
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
    parsed = await call_structured(
        model=MODEL_FAST,
        system=prompts.SHOPPING_LIST_SYSTEM,
        user=f"Generate a shopping list for these recipes:\n\n{recipes_text}",
        tool_name="record_shopping_list",
        tool_description="Record the aggregated shopping list.",
        schema=_ShoppingResp,
    )
    return schemas.ShoppingListResponse(
        items=[schemas.ShoppingListItem(name=i.text, sources=i.source) for i in parsed.items]
    )


@router.post("/suggest-tags", response_model=schemas.SuggestTagsResponse)
async def suggest_tags(body: schemas.SuggestTagsRequest):
    ingredients_text = "\n".join(f"- {i}" for i in body.ingredients) or "(none listed)"
    existing = ", ".join(body.existing_tags) or "(none yet)"
    user = f"RECIPE: {body.title}\n\nINGREDIENTS:\n{ingredients_text}\n\nSuggest tags."
    return await call_structured(
        model=MODEL_FAST,
        system=prompts.suggest_tags_system(existing),
        user=user,
        tool_name="record_tags",
        tool_description="Record 2–5 suggested tags for the recipe.",
        schema=schemas.SuggestTagsResponse,
        max_tokens=256,
    )


def _format_recipe_for_prompt(r: schemas.AIRecipePayload) -> str:
    ings = "\n".join(
        f"- {' '.join(str(p) for p in [i.quantity or '', i.unit or '', i.text] if p)}"
        for i in r.ingredients
    )
    steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(r.instructions))
    md = r.metadata or {}
    return (
        f"Title: {r.title}\n\nIngredients:\n{ings}\n\nInstructions:\n{steps}\n\n"
        f"Prep: {md.get('prep_time', 0)} min · Cook: {md.get('cook_time', 0)} min · "
        f"Servings: {md.get('servings', 1)}\n"
        f"Notes: {r.notes or 'None'}"
    )


@router.post("/generate-recipe", response_model=schemas.GenerateRecipeResponse)
async def generate_recipe(body: schemas.GenerateRecipeRequest):
    restrictions = (body.preferences.dietary_restrictions if body.preferences else []) or []
    restrictions_text = ", ".join(restrictions) if restrictions else "None"

    parts = [f"Household dietary restrictions (must honor): {restrictions_text}"]
    if body.current_recipe is not None:
        parts.append(
            "This is an iteration. Here is the CURRENT recipe:\n\n"
            + _format_recipe_for_prompt(body.current_recipe)
        )
        parts.append(f"The person now says:\n\"{body.prompt}\"\n\nRevise the recipe accordingly.")
    else:
        parts.append(f"Their pitch:\n\"{body.prompt}\"\n\nInvent one great recipe that fits.")

    user = "\n\n".join(parts)

    parsed = await call_structured(
        model=MODEL_STRONG,
        system=prompts.GENERATE_RECIPE_SYSTEM,
        user=user,
        tool_name="record_recipe",
        tool_description="Record the complete recipe plus a short chat_reply describing what you did.",
        schema=_LLMChatRecipe,
    )
    return schemas.GenerateRecipeResponse(
        recipe=schemas.AIRecipePayload(
            title=parsed.title,
            ingredients=[
                schemas.RecipeIngredient(text=i.text, quantity=i.quantity, unit=i.unit, optional=i.optional)
                for i in parsed.ingredients
            ],
            instructions=list(parsed.instructions),
            notes=parsed.notes,
            metadata={
                "prep_time": parsed.metadata.prep_time,
                "cook_time": parsed.metadata.cook_time,
                "servings": parsed.metadata.servings,
            },
        ),
        reply=parsed.chat_reply,
    )


@router.post("/recipe-chat", response_model=schemas.RecipeChatResponse)
async def recipe_chat(body: schemas.RecipeChatRequest):
    restrictions = (body.preferences.dietary_restrictions if body.preferences else []) or []
    restrictions_text = ", ".join(restrictions) if restrictions else "None"

    convo = ""
    if body.history:
        convo = "\n\nEarlier in this conversation:\n" + "\n".join(
            f"{t.role}: {t.text}" for t in body.history[-8:]
        )

    user = (
        f"CURRENT RECIPE:\n\n{_format_recipe_for_prompt(body.recipe)}\n\n"
        f"Dietary restrictions (must honor): {restrictions_text}{convo}\n\n"
        f"They say:\n\"{body.message}\""
    )

    parsed = await call_structured(
        model=MODEL_FAST,
        system=prompts.RECIPE_CHAT_SYSTEM,
        user=user,
        tool_name="respond",
        tool_description="Answer the person and return the (possibly revised) recipe.",
        schema=_LLMRecipeChat,
    )
    return schemas.RecipeChatResponse(
        reply=parsed.reply,
        changed=parsed.changed,
        recipe=schemas.AIRecipePayload(
            title=parsed.title,
            ingredients=[
                schemas.RecipeIngredient(text=i.text, quantity=i.quantity, unit=i.unit, optional=i.optional)
                for i in parsed.ingredients
            ],
            instructions=list(parsed.instructions),
            notes=parsed.notes,
            metadata={
                "prep_time": parsed.metadata.prep_time,
                "cook_time": parsed.metadata.cook_time,
                "servings": parsed.metadata.servings,
            },
        ),
    )
