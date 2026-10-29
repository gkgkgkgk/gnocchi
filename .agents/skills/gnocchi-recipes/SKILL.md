---
name: gnocchi-recipes
description: Save, find, and refine household recipes in Gnocchi using its MCP tools. Use when the user gives a recipe to add (typed, pasted, or dictated by voice), asks to change a saved recipe, or wants to iterate on a variation. Do not use for unrelated cooking questions.
---

# Gnocchi recipes

Use the Gnocchi MCP tools for the household's saved recipes. Find a likely match before creating a new entry, and fetch the full recipe before changing it. Preserve the user's ingredient amounts, units, servings, and instructions; ask only about missing information that prevents a usable recipe.

When the user gives a new recipe, organize it into a title, ingredients, steps, and any supplied timing or notes, then call `save_recipe`. Treat suggested additions or substitutions as suggestions until the user accepts them. When adapting a saved recipe, use `create_variation` so the original remains available and the new recipe links back to it. Use `update_recipe` for corrections to the same version, such as fixing a typo or quantity. After a write, read the returned recipe and tell the user what was saved and which version it came from.

## Ingredient rows

- `text` is the ingredient name and preparation only ("Garlic, minced"). Never repeat the amount or unit in it; the app shows them as "**Garlic, minced**, 2 cloves".
- `quantity` is a number (0.5, not "1/2"); use 0 for "to taste" or unspecified amounts. `unit` is a singular unit ("cup", "tbsp", "clove") or empty for counted items ("2 tomatoes" → quantity 2, unit "").
- One ingredient per row. Mark garnish, "if desired", and "to serve" items `optional`.
- Use `section` when a recipe has separate components: a marinade, a salsa, a sauce, a dough, a filling. Name each section briefly ("Marinade", "Pico de gallo") and keep its rows together, in cooking order. Leave `section` out for simple recipes. Do not tag repeated ingredients with "(for pico)" in the text; put them in that section instead.

## Dictated recipes

A recipe spoken aloud arrives as a rambling transcript. Expect filler, false starts, corrections ("two cups, no, one and a half"), and amounts as words ("half a cup", "a couple cloves", "a can of"). Keep the user's final word on each amount. Convert spoken amounts to numbers, and keep vague ones ("a splash", "a handful") as quantity 0 with the phrase in `text`. Turn the narration into short ordered steps, each one action, keeping every time, temperature, and doneness cue the user gave. Collect tips and asides ("my mom always adds...", "works with chicken too") in `notes`.

Save directly when the transcript gives enough for a usable recipe; then summarize the title, sections, and anything you inferred, so the user can correct it with `update_recipe`. Ask first only when something essential is missing or contradictory, such as an ingredient used in the steps with no amount you can reasonably infer, or a cooking time that is cut off.

The server runs as a local stdio process and calls Gnocchi's HTTP API. If the MCP tools are missing or the API is unavailable, explain the connection problem and keep working with the recipe in chat; do not claim it was saved.
