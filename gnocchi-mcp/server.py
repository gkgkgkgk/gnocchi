"""Small local MCP bridge to the Gnocchi HTTP API.

Run with GNOCCHI_API_URL=http://localhost:8001 python server.py. The MCP
transport is stdio, so the HTTP API never needs to expose an MCP endpoint.
"""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

import httpx
from mcp.server import MCPServer
from pydantic import BaseModel, Field


class Ingredient(BaseModel):
    text: str = Field(description="Ingredient name or description")
    quantity: float = 0
    unit: str = ""
    optional: bool = False


class RecipeDraft(BaseModel):
    title: str
    ingredients: list[Ingredient] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    notes: str | None = None
    prep_time: int | None = None
    cook_time: int | None = None
    servings: int | None = None
    tags: list[str] = Field(default_factory=list)
    source_url: str | None = None


class RecipeChanges(BaseModel):
    title: str | None = None
    ingredients: list[Ingredient] | None = None
    steps: list[str] | None = None
    notes: str | None = None
    prep_time: int | None = None
    cook_time: int | None = None
    servings: int | None = None
    tags: list[str] | None = None


API_URL = os.getenv("GNOCCHI_API_URL", "http://localhost:8001").rstrip("/")
API_TOKEN = os.getenv("GNOCCHI_API_TOKEN", "")
mcp = MCPServer("Gnocchi")


async def api_request(method: str, path: str, body: dict[str, Any] | None = None) -> Any:
    headers = {"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {}
    try:
        async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
            response = await client.request(method, f"{API_URL}{path}", json=body)
            response.raise_for_status()
            return response.json() if response.content else None
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500]
        raise ValueError(f"Gnocchi returned HTTP {exc.response.status_code}: {detail}") from exc
    except httpx.RequestError as exc:
        raise ValueError(f"Cannot reach Gnocchi at {API_URL}: {exc}") from exc


@mcp.tool()
async def find_recipes(query: str = "") -> list[dict[str, Any]]:
    """Find saved recipes by title, ingredient, tag, or note; empty query lists all."""
    recipes = await api_request("GET", "/recipes")
    needle = query.casefold().strip()
    if needle:
        recipes = [
            recipe for recipe in recipes
            if needle in " ".join([
                recipe.get("title") or "",
                recipe.get("notes") or "",
                *(recipe.get("tags") or []),
                *(item.get("text") or "" for item in recipe.get("ingredients") or []),
            ]).casefold()
        ]
    return [{
        "id": recipe["id"],
        "title": recipe["title"],
        "source_type": recipe.get("source_type"),
        "source_recipe_id": recipe.get("source_recipe_id"),
        "tags": recipe.get("tags", []),
        "updated_at": recipe.get("updated_at"),
    } for recipe in recipes]


@mcp.tool()
async def get_recipe(recipe_id: str) -> dict[str, Any]:
    """Read a saved recipe, including ingredients, steps, notes, and origin."""
    return await api_request("GET", f"/recipes/{quote(recipe_id, safe='')}")


@mcp.tool()
async def save_recipe(recipe: RecipeDraft) -> dict[str, Any]:
    """Save a new recipe created with the user. Its source is marked as AI-assisted."""
    body = recipe.model_dump(exclude_none=True)
    body["source_type"] = "ai"
    return await api_request("POST", "/recipes", body)


@mcp.tool()
async def create_variation(source_recipe_id: str, changes: RecipeChanges) -> dict[str, Any]:
    """Save a new variation linked to an existing recipe, preserving the original."""
    source = await get_recipe(source_recipe_id)
    body = {key: source.get(key) for key in RecipeDraft.model_fields}
    body.update(changes.model_dump(exclude_unset=True))
    body["source_recipe_id"] = source["id"]
    body["source_type"] = "adapted"
    return await api_request("POST", "/recipes", body)


@mcp.tool()
async def update_recipe(recipe_id: str, changes: RecipeChanges) -> dict[str, Any]:
    """Correct an existing saved recipe in place. Use create_variation for adaptations."""
    body = changes.model_dump(exclude_unset=True)
    if not body:
        raise ValueError("Provide at least one field to update")
    return await api_request("PATCH", f"/recipes/{quote(recipe_id, safe='')}", body)


if __name__ == "__main__":
    mcp.run(transport="stdio")
