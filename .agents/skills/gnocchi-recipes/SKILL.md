---
name: gnocchi-recipes
description: Save, find, and refine household recipes in Gnocchi using its MCP tools. Use when the user gives a recipe to add, asks to change a saved recipe, or wants to iterate on a variation. Do not use for unrelated cooking questions.
---

# Gnocchi recipes

Use the Gnocchi MCP tools for the household's saved recipes. Find a likely match before creating a new entry, and fetch the full recipe before changing it. Preserve the user's ingredient amounts, units, servings, and instructions; ask only about missing information that prevents a usable recipe.

When the user gives a new recipe, organize it into a title, ingredients, steps, and any supplied timing or notes, then call `save_recipe`. Treat suggested additions or substitutions as suggestions until the user accepts them. When adapting a saved recipe, use `create_variation` so the original remains available and the new recipe links back to it. Use `update_recipe` for corrections to the same version, such as fixing a typo or quantity. After a write, read the returned recipe and tell the user what was saved and which version it came from.

The server runs as a local stdio process and calls Gnocchi's HTTP API. If the MCP tools are missing or the API is unavailable, explain the connection problem and keep working with the recipe in chat; do not claim it was saved.
