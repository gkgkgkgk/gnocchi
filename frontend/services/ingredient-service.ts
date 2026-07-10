/**
 * Curated ingredient catalog, backed by the /ingredients endpoint. Powers the
 * ingredient picker's autocomplete. Recipes still store ingredients inline as
 * free text — anything not in the catalog can be typed freely via
 * `createIngredient`, which just returns a local (unsaved) entry.
 */
import { api } from '@/lib/api';

export interface Ingredient {
  id: string;
  name: string;
  category?: string | null;
  ord?: number;
}

let _cache: Ingredient[] | null = null;

export async function fetchIngredients(): Promise<Ingredient[]> {
  if (_cache) return _cache;
  _cache = await api.get<Ingredient[]>('/ingredients');
  return _cache;
}

export function invalidateIngredientsCache() {
  _cache = null;
}

export async function fetchIngredientById(id: string): Promise<Ingredient | null> {
  if (!id) return null;
  const ingredients = await fetchIngredients();
  return ingredients.find((i) => i.id === id) ?? null;
}

export async function fetchIngredientsByIds(ids: string[]): Promise<Ingredient[]> {
  const ingredients = await fetchIngredients();
  return ids
    .map((id) => ingredients.find((i) => i.id === id))
    .filter((i): i is Ingredient => !!i);
}

/** Free-text ingredient the user typed that isn't in the catalog. Not persisted
 *  to the catalog — it lives inline on the recipe like any other ingredient. */
export async function createIngredient(name: string): Promise<Ingredient> {
  return { id: `local-${Date.now()}`, name };
}
