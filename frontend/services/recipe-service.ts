import { api } from '@/lib/api';

export interface RecipeIngredient {
  text: string;
  quantity: number;
  unit: string;
}

export interface RecipePhoto {
  id: string;
  key: string;
  ord: number;
}

export interface AIInsight {
  insight: string;
  recommended_tool: string | null;
}

export interface CookHistoryEntry {
  date: string;
  note: string;
  rating?: number | null;
  photos?: string[];
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  annotated_steps?: any[] | null;
  notes?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  rating?: number | null;
  cook_history: CookHistoryEntry[];
  ai_insight?: AIInsight | null;
  tags: string[];
  cover_image?: string | null;
  photos: RecipePhoto[];
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeInput {
  title: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  tags?: string[];
  cover_image?: string | null;
}

export type UpdateRecipeInput = Partial<CreateRecipeInput> & {
  annotated_steps?: any[] | null;
  ai_insight?: AIInsight | null;
};

export async function fetchRecipes(): Promise<Recipe[]> {
  return api.get<Recipe[]>('/recipes');
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  try {
    return await api.get<Recipe>(`/recipes/${id}`);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  return api.post<Recipe>('/recipes', input);
}

export async function updateRecipe(id: string, input: UpdateRecipeInput): Promise<Recipe> {
  return api.patch<Recipe>(`/recipes/${id}`, input);
}

export async function deleteRecipe(id: string): Promise<void> {
  await api.delete(`/recipes/${id}`);
}

export async function updateRecipeTags(id: string, tagIds: string[]): Promise<Recipe> {
  return api.patch<Recipe>(`/recipes/${id}`, { tags: tagIds });
}

export async function setRecipeRating(id: string, rating: number | null): Promise<Recipe> {
  return api.patch<Recipe>(`/recipes/${id}/rating`, { rating });
}

export async function addCookNote(id: string, note: CookHistoryEntry): Promise<Recipe> {
  return api.post<Recipe>(`/recipes/${id}/cook-notes`, note);
}

export async function uploadRecipePhoto(id: string, uri: string): Promise<RecipePhoto> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fd = new FormData();
  fd.append('image', blob, 'photo.jpg');
  return api.upload<RecipePhoto>(`/recipes/${id}/photos`, fd);
}

export async function deleteRecipePhoto(recipeId: string, photoId: string): Promise<void> {
  await api.delete(`/recipes/${recipeId}/photos/${photoId}`);
}

// --- AI helpers: analyze + annotate ---
// These call the backend, then PATCH the resulting insight/annotations
// back onto the recipe row. Recipe view screen uses these.

export async function analyzeRecipeInsight(recipe: Recipe): Promise<AIInsight> {
  const { getPreferences } = await import('./profile-service');
  const preferences = await getPreferences().catch(() => ({
    dietary_restrictions: [],
    favorite_food: null,
  }));
  const res = await api.post<{ insight: string; recommended_tool: string | null }>(
    '/ai/analyze',
    {
      recipe: {
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.steps,
        notes: recipe.notes ?? '',
        metadata: {
          prep_time: recipe.prep_time ?? 0,
          cook_time: recipe.cook_time ?? 0,
          servings: recipe.servings ?? 1,
        },
      },
      preferences,
    },
  );
  return { insight: res.insight, recommended_tool: res.recommended_tool };
}

export async function saveRecipeInsight(id: string, insight: AIInsight): Promise<Recipe> {
  return api.patch<Recipe>(`/recipes/${id}`, { ai_insight: insight });
}

export async function annotateRecipeInstructions(recipe: Recipe): Promise<string[]> {
  const res = await api.post<{
    annotated_instructions: { original: string; annotated: string }[];
  }>('/ai/annotate', {
    ingredients: recipe.ingredients.map((i) => i.text),
    instructions: recipe.steps,
  });
  return res.annotated_instructions.map((r) => r.annotated);
}

export async function saveAnnotatedInstructions(
  id: string,
  annotated: any[],
): Promise<Recipe> {
  return api.patch<Recipe>(`/recipes/${id}`, { annotated_steps: annotated });
}

/**
 * Save a recipe modified by an AI tool. Backend produces an AIRecipePayload;
 * we turn it into a Recipe by POSTing to /recipes.
 */
export async function saveModifiedRecipe(
  modified: any,
  original?: Recipe,
): Promise<Recipe> {
  return createRecipe({
    title: modified.title,
    ingredients: (modified.ingredients ?? []).map((i: any) => ({
      text: i.text,
      quantity: i.quantity ?? 0,
      unit: i.unit ?? '',
    })),
    steps: modified.instructions ?? modified.steps ?? [],
    notes: modified.notes ?? original?.notes ?? null,
    prep_time: modified.metadata?.prep_time ?? original?.prep_time ?? null,
    cook_time: modified.metadata?.cook_time ?? original?.cook_time ?? null,
    servings: modified.metadata?.servings ?? original?.servings ?? null,
  });
}
