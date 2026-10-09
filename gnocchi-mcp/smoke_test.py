"""Manual end-to-end check against a running local Gnocchi API."""

import asyncio

from server import (
    Ingredient,
    RecipeChanges,
    RecipeDraft,
    api_request,
    create_variation,
    find_recipes,
    get_recipe,
    save_recipe,
    update_recipe,
)


async def main() -> None:
    created: list[str] = []
    try:
        original = await save_recipe(
            RecipeDraft(
                title="MCP smoke test",
                ingredients=[Ingredient(text="Pasta", quantity=1, unit="cup")],
                steps=["Boil water."],
            )
        )
        created.append(original["id"])
        assert original["source_type"] == "manual"

        variation = await create_variation(
            original["id"], RecipeChanges(title="MCP smoke test variation", notes="Less salt")
        )
        created.append(variation["id"])
        assert variation["source_recipe_id"] == original["id"]
        assert variation["ingredients"] == original["ingredients"]

        assert len(await find_recipes("Pasta")) >= 2
        updated = await update_recipe(variation["id"], RecipeChanges(notes="More lemon"))
        assert updated["notes"] == "More lemon"
        assert (await get_recipe(variation["id"]))["title"] == "MCP smoke test variation"
        print("Gnocchi MCP API smoke test passed")
    finally:
        for recipe_id in reversed(created):
            await api_request("DELETE", f"/recipes/{recipe_id}")


if __name__ == "__main__":
    asyncio.run(main())
