"""Pydantic request/response schemas. Kept intentionally close to the DB
shape — no camelCase/snake_case duality this time."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# --- Recipes -------------------------------------------------------------


class RecipeIngredient(BaseModel):
    text: str
    quantity: float = 0
    unit: str = ""
    optional: bool = False


class RecipePhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    key: str
    ord: int


class PhotoReorder(BaseModel):
    """Desired photo order, given as the full list of photo ids."""

    order: list[uuid.UUID] = Field(default_factory=list)


class RecipeBase(BaseModel):
    title: str
    ingredients: list[RecipeIngredient] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    notes: str | None = None
    source_url: str | None = None
    source_type: str | None = None
    prep_time: int | None = None
    cook_time: int | None = None
    servings: int | None = None
    tags: list[str] = Field(default_factory=list)
    cover_image: str | None = None


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(BaseModel):
    """All fields optional — PATCH semantics."""

    title: str | None = None
    ingredients: list[RecipeIngredient] | None = None
    steps: list[str] | None = None
    annotated_steps: list[dict[str, Any]] | None = None
    notes: str | None = None
    source_url: str | None = None
    source_type: str | None = None
    prep_time: int | None = None
    cook_time: int | None = None
    servings: int | None = None
    tags: list[str] | None = None
    cover_image: str | None = None
    ai_insight: dict[str, Any] | None = None


class RecipeOut(RecipeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    annotated_steps: list[dict[str, Any]] | None = None
    rating: int | None = None
    cook_history: list[dict[str, Any]] = Field(default_factory=list)
    ai_insight: dict[str, Any] | None = None
    photos: list[RecipePhotoOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class RatingUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)


class CookNote(BaseModel):
    date: str
    note: str
    rating: int | None = Field(None, ge=1, le=5)
    photos: list[str] = Field(default_factory=list)


# --- Cookbooks -----------------------------------------------------------


class CookbookIn(BaseModel):
    name: str
    description: str | None = None
    cover_color: str | None = None
    recipe_ids: list[str] = Field(default_factory=list)


class CookbookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    cover_color: str | None
    recipe_ids: list[str]
    recipe_count: int = 0
    created_at: datetime


# --- Tags ---------------------------------------------------------------


class TagIO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    color: str
    icon: str


# --- Units & ingredient catalog ----------------------------------------


class UnitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    abbreviation: str
    plural: str | None = None
    system: str
    type: str
    to_base: float | None = None
    ord: int = 0


class IngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str | None = None
    ord: int = 0


# --- AI Tools -----------------------------------------------------------


class AIToolOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    icon: str
    prompt: str


# --- House preferences (singleton) -------------------------------------


class Preferences(BaseModel):
    dietary_restrictions: list[str] = Field(default_factory=list)
    favorite_food: str | None = None
    household_size: int | None = None
    # 'metric' | 'imperial' | 'as_written' (or null = as written). Controls how
    # ingredient quantities are displayed/converted.
    preferred_units: str | None = None


# --- Meal plan ----------------------------------------------------------


class ShoppingListItem(BaseModel):
    name: str
    sources: list[str] = Field(default_factory=list)
    checked: bool = False


class DayPlan(BaseModel):
    date: str  # YYYY-MM-DD
    recipes: list[str] = Field(default_factory=list)  # recipe UUIDs


class MealPlan(BaseModel):
    plan: list[DayPlan] = Field(default_factory=list)
    short_list: list[str] = Field(default_factory=list)
    shopping_list: list[ShoppingListItem] = Field(default_factory=list)


# --- Imports ------------------------------------------------------------


class UrlImportRequest(BaseModel):
    url: str


class ImportedRecipe(BaseModel):
    recipe: RecipeCreate
    source_url: str | None = None
    source_image: str | None = None


# --- AI operations ------------------------------------------------------


class AnnotateRequest(BaseModel):
    instructions: list[str]
    ingredients: list[str]


class AnnotatedInstruction(BaseModel):
    original: str
    annotated: str


class AnnotateResponse(BaseModel):
    annotated_instructions: list[AnnotatedInstruction]


class AIRecipePayload(BaseModel):
    title: str
    ingredients: list[RecipeIngredient]
    instructions: list[str]
    notes: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyzeRequest(BaseModel):
    recipe: AIRecipePayload
    preferences: Preferences | None = None


class AnalyzeResponse(BaseModel):
    insight: str
    recommended_tool: str | None = None


class ExecuteToolRequest(BaseModel):
    recipe: AIRecipePayload
    tool: AIToolOut
    user_guidance: str | None = None
    ai_reasoning: str | None = None


class ExecuteToolResponse(BaseModel):
    recipe: AIRecipePayload


class ShoppingListRequest(BaseModel):
    recipes: list[AIRecipePayload]


class ShoppingListResponse(BaseModel):
    items: list[ShoppingListItem]


class SuggestTagsRequest(BaseModel):
    title: str
    ingredients: list[str] = Field(default_factory=list)
    existing_tags: list[str] = Field(default_factory=list)


class SuggestTagsResponse(BaseModel):
    tags: list[str] = Field(default_factory=list)


class GenerateRecipeRequest(BaseModel):
    prompt: str
    preferences: Preferences | None = None


class GenerateRecipeResponse(BaseModel):
    recipe: AIRecipePayload
