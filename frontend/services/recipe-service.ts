import { api } from '@/lib/api';

// --- Types --------------------------------------------------------------

export interface RecipeIngredient {
  text: string;
  quantity: number;
  // Loose during Phase 1.5: old screens read this as `{name, abbreviation}`,
  // new code treats it as a plain string. Use `unitToString(i.unit)` when
  // you need a definite string. Cleaned up in Phase 3.
  unit: any;
  optional?: boolean;
  ingredient?: { id?: string; name: string };
  unit_id?: string;
  ingredient_id?: string;
  id?: string;
}

/** Extract the unit as a plain string whether given a string or `{name,abbreviation}`. */
export function unitToString(u: any): string {
  if (!u) return '';
  if (typeof u === 'string') return u;
  return u.abbreviation || u.name || '';
}

export interface RecipePhoto {
  id: string;
  key: string;
  ord: number;
}

export interface AIInsight {
  insight: string;
  recommended_tool: string | null;

  // Legacy aliases.
  text?: string;
  suggested_tool?: string | null;
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

  // Legacy aliases the screens still reference.
  image_url?: string | null;
  imageUrl?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  images?: string[];
  metadata?: {
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    tags?: string[];
  };
}

export interface CreateRecipeInput {
  title: string;
  ingredients: any[]; // loose — adapter normalizes
  steps: string[];
  notes?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  tags?: string[];
  cover_image?: string | null;

  // Legacy aliases from the current screens.
  image_url?: string | null;
  imageUrl?: string | null;
  metadata?: {
    prepTime?: number | string;
    cookTime?: number | string;
    servings?: number | string;
    prep_time?: number | string;
    cook_time?: number | string;
    tags?: string[];
  };
}

export type UpdateRecipeInput = Partial<CreateRecipeInput> & {
  annotated_steps?: any[] | null;
  ai_insight?: AIInsight | null;
};

// --- Adapters -----------------------------------------------------------

/**
 * "1 1/2" → 1.5, "1/2" → 0.5, "1.5" → 1.5, "" → 0.
 */
function parseQuantity(q: string | number | undefined | null): number {
  if (q == null) return 0;
  if (typeof q === 'number') return q;
  const s = String(q).trim();
  if (!s) return 0;
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Strip a leading quantity + unit from an ingredient's raw text so
 * downstream formatters can prepend them without doubling up.
 * "1 pound salmon" + (qty=1, unit=pound) → "salmon"
 * "salmon" + (qty=1, unit=pound) → "salmon"
 */
function cleanIngredientName(text: string, quantity: number, unit: string): string {
  let name = (text ?? '').trim();
  if (!name) return '';
  const qStr = quantity ? String(quantity) : '';
  if (qStr && name.startsWith(qStr)) name = name.slice(qStr.length).trimStart();
  if (unit) {
    // Match "unit" or "units" as a whole word.
    const re = new RegExp(`^${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b\\s*`, 'i');
    name = name.replace(re, '');
  }
  name = name.replace(/^of\s+/i, '');
  return name.trim() || (text ?? '').trim();
}

function parseIntOrNull(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

/** Resolve a cover-image reference to a URL the browser can render. */
function coverUrl(cover?: string | null): string | undefined {
  if (!cover) return undefined;
  if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
  return api.imageUrl(cover);
}

/**
 * Reshape a backend recipe row for the current UI. Keeps every field the
 * backend returned, adds legacy aliases the screens read. This layer is
 * temporary — Phase 3's UI rewrite deletes both the adapter and the aliases.
 */
function adaptForUI(r: any): Recipe {
  const image = coverUrl(r.cover_image);
  return {
    ...r,
    ingredients: (r.ingredients ?? []).map((i: any) => {
      const unitStr = i.unit ?? '';
      const qty = typeof i.quantity === 'number' ? i.quantity : parseQuantity(i.quantity);
      const cleanName = cleanIngredientName(i.text ?? '', qty, unitStr);
      return {
        text: i.text ?? '',
        quantity: qty,
        optional: !!i.optional,
        // The old screens read `.name` and `.abbreviation`; new code reads
        // `.unit` as a plain string. Make it an object with a toString so
        // both patterns work (String(unitObj) → unit string).
        unit: unitStr
          ? Object.assign({ name: unitStr, abbreviation: unitStr }, { toString: () => unitStr })
          : { name: '', abbreviation: '' },
        // Legacy shape read by the recipe view: it does
        //   formatIngredientLine(qty, unit.name, item.text)
        // where the third arg is the ingredient name — NOT the full text.
        // `cleanName` strips the leading qty/unit so the formatter doesn't
        // double up.
        ingredient: { name: cleanName },
        unit_id: unitStr,
        ingredient_id: '',
        id: '',
      };
    }),
    ai_insight: r.ai_insight
      ? {
          insight: r.ai_insight.insight ?? r.ai_insight.text ?? '',
          recommended_tool:
            r.ai_insight.recommended_tool ?? r.ai_insight.suggested_tool ?? null,
          text: r.ai_insight.insight ?? r.ai_insight.text ?? '',
          suggested_tool:
            r.ai_insight.recommended_tool ?? r.ai_insight.suggested_tool ?? null,
        }
      : null,
    // Legacy image aliases.
    image_url: image ?? null,
    imageUrl: image ?? null,
    images: [
      ...(r.photos ?? []).map((p: any) => api.imageUrl(p.key) ?? ''),
      ...(image && !(r.photos ?? []).some((p: any) => api.imageUrl(p.key) === image)
        ? [image]
        : []),
    ].filter(Boolean),
    prepTime: r.prep_time,
    cookTime: r.cook_time,
    metadata: {
      prepTime: r.prep_time ?? 0,
      cookTime: r.cook_time ?? 0,
      servings: r.servings ?? 0,
      tags: r.tags ?? [],
    },
  };
}

/**
 * Reshape a loose UI payload into the backend's expected create/update body.
 * Accepts any of the field aliases the old screens still emit.
 */
function adaptForBackend(input: any): Record<string, any> {
  const meta = input.metadata ?? {};
  const body: Record<string, any> = {
    title: input.title,
    ingredients: (input.ingredients ?? [])
      .filter((i: any) => i && (i.text || i.ingredientName))
      .map((i: any) => ({
        text:
          i.text ||
          [i.quantity, i.unitAbbreviation ?? unitToString(i.unit), i.ingredientName]
            .filter(Boolean)
            .join(' ')
            .trim(),
        quantity: parseQuantity(i.quantity),
        unit:
          i.unitAbbreviation ||
          unitToString(i.unit) ||
          '',
        optional: !!i.optional,
      })),
    steps: (input.steps ?? []).filter(Boolean),
    notes: input.notes ?? null,
    source_url: input.source_url ?? null,
    source_type: input.source_type ?? null,
    cover_image:
      input.cover_image ?? input.image_url ?? input.imageUrl ?? null,
    prep_time: parseIntOrNull(
      meta.prep_time ?? meta.prepTime ?? input.prep_time ?? input.prepTime,
    ),
    cook_time: parseIntOrNull(
      meta.cook_time ?? meta.cookTime ?? input.cook_time ?? input.cookTime,
    ),
    servings: parseIntOrNull(meta.servings ?? input.servings),
    tags: input.tags ?? meta.tags ?? undefined,
  };
  if (input.annotated_steps !== undefined) body.annotated_steps = input.annotated_steps;
  if (input.ai_insight !== undefined) {
    body.ai_insight = input.ai_insight
      ? {
          insight: input.ai_insight.insight ?? input.ai_insight.text ?? '',
          recommended_tool:
            input.ai_insight.recommended_tool ?? input.ai_insight.suggested_tool ?? null,
        }
      : null;
  }
  // Trim undefined so PATCH stays PATCH.
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  return body;
}

// --- Endpoints ----------------------------------------------------------

export async function fetchRecipes(): Promise<Recipe[]> {
  const rows = await api.get<any[]>('/recipes');
  return rows.map(adaptForUI);
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  try {
    const row = await api.get<any>(`/recipes/${id}`);
    return adaptForUI(row);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const row = await api.post<any>('/recipes', adaptForBackend(input));
  return adaptForUI(row);
}

export async function updateRecipe(id: string, input: UpdateRecipeInput): Promise<Recipe> {
  const row = await api.patch<any>(`/recipes/${id}`, adaptForBackend(input));
  return adaptForUI(row);
}

export async function deleteRecipe(id: string): Promise<void> {
  await api.delete(`/recipes/${id}`);
}

export async function updateRecipeTags(id: string, tagIds: string[]): Promise<Recipe> {
  const row = await api.patch<any>(`/recipes/${id}`, { tags: tagIds });
  return adaptForUI(row);
}

export async function setRecipeRating(id: string, rating: number | null): Promise<Recipe> {
  const row = await api.patch<any>(`/recipes/${id}/rating`, { rating });
  return adaptForUI(row);
}

export async function addCookNote(id: string, note: CookHistoryEntry): Promise<Recipe> {
  const row = await api.post<any>(`/recipes/${id}/cook-notes`, note);
  return adaptForUI(row);
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

// --- AI helpers ---------------------------------------------------------

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
        ingredients: recipe.ingredients.map((i) => ({
          text: i.text,
          quantity: i.quantity,
          unit: unitToString(i.unit),
        })),
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
  return {
    insight: res.insight,
    recommended_tool: res.recommended_tool,
    text: res.insight,
    suggested_tool: res.recommended_tool,
  };
}

export async function saveRecipeInsight(id: string, insight: AIInsight): Promise<Recipe> {
  const row = await api.patch<any>(`/recipes/${id}`, {
    ai_insight: {
      insight: insight.insight ?? insight.text ?? '',
      recommended_tool: insight.recommended_tool ?? insight.suggested_tool ?? null,
    },
  });
  return adaptForUI(row);
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
  const row = await api.patch<any>(`/recipes/${id}`, { annotated_steps: annotated });
  return adaptForUI(row);
}

/**
 * Save a recipe modified by an AI tool. Backend returns an AIRecipePayload
 * shape (`instructions` instead of `steps`, `metadata` nested); adaptForBackend
 * flattens it into a real Recipe row.
 */
export async function saveModifiedRecipe(
  modified: any,
  original?: Recipe,
): Promise<Recipe> {
  return createRecipe({
    title: modified.title,
    ingredients: modified.ingredients ?? [],
    steps: modified.instructions ?? modified.steps ?? [],
    notes: modified.notes ?? original?.notes ?? null,
    prep_time: modified.metadata?.prep_time ?? original?.prep_time ?? null,
    cook_time: modified.metadata?.cook_time ?? original?.cook_time ?? null,
    servings: modified.metadata?.servings ?? original?.servings ?? null,
  });
}
