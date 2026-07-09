import { api } from '@/lib/api';
import type { Recipe } from './recipe-service';
import { fetchRecipeById } from './recipe-service';

export interface Cookbook {
  id: string;
  name: string;
  description?: string | null;
  cover_color?: string | null;
  recipe_ids: string[];
  recipe_count: number;
  created_at: string;
}

export async function fetchCookbooks(): Promise<Cookbook[]> {
  return api.get<Cookbook[]>('/cookbooks');
}

export async function createCookbook(
  name: string,
  recipeIds: string[],
  description?: string,
  coverColor?: string,
): Promise<Cookbook> {
  return api.post<Cookbook>('/cookbooks', {
    name,
    description,
    cover_color: coverColor,
    recipe_ids: recipeIds,
  });
}

export async function fetchCookbookRecipes(
  id: string,
): Promise<{ cookbook: Cookbook; recipes: Recipe[] }> {
  const cookbook = await api.get<Cookbook>(`/cookbooks/${id}`);
  const recipes: Recipe[] = [];
  for (const rid of cookbook.recipe_ids) {
    const r = await fetchRecipeById(rid);
    if (r) recipes.push(r);
  }
  return { cookbook, recipes };
}

export async function updateCookbook(
  id: string,
  name: string,
  recipeIds: string[],
): Promise<Cookbook> {
  return api.patch<Cookbook>(`/cookbooks/${id}`, { name, recipe_ids: recipeIds });
}

export async function deleteCookbook(id: string): Promise<void> {
  await api.delete(`/cookbooks/${id}`);
}
