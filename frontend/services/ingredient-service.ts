/**
 * Legacy shim. In the new backend, ingredients are stored inline on each
 * recipe as `{text, quantity, unit}`; there is no shared ingredients table.
 * These functions are kept only so existing screens that referenced them
 * keep compiling — they return empty results and are safe no-ops.
 */

export interface Ingredient {
  id: string;
  name: string;
}

export async function fetchIngredients(): Promise<Ingredient[]> {
  return [];
}

export async function fetchIngredientById(): Promise<Ingredient | null> {
  return null;
}

export async function fetchIngredientsByIds(): Promise<Ingredient[]> {
  return [];
}

export async function createIngredient(name: string): Promise<Ingredient> {
  return { id: `local-${Date.now()}`, name };
}
