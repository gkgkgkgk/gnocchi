import { api } from '@/lib/api';

export interface ScrapedRecipe {
  title: string;
  ingredients: Array<{ text: string; quantity: number; unit: string }>;
  steps: string[];
  notes?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
}

export interface ImportResponse {
  recipe: ScrapedRecipe;
  source_url: string | null;
  source_image: string | null;
}

/**
 * The scraper needs an absolute URL. If the user pastes `pinterest.com/...`
 * (no scheme) the backend's fetch fails with "missing an 'http://' or
 * 'https://' protocol", so default a bare URL to https.
 */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function importFromPinterest(url: string): Promise<ImportResponse> {
  return api.post<ImportResponse>('/import/pinterest', { url: normalizeUrl(url) });
}

export async function importFromWebsite(url: string): Promise<ImportResponse> {
  return api.post<ImportResponse>('/import/website', { url: normalizeUrl(url) });
}

/**
 * Extract a recipe from freeform pasted text — an Instagram/TikTok caption
 * copied from the app, a recipe a friend texted, a note. Instagram no longer
 * serves post content to logged-out server fetches, so pasting the caption is
 * the reliable, ToS-clean way to import from it.
 */
export async function importFromText(text: string, sourceUrl?: string): Promise<ImportResponse> {
  return api.post<ImportResponse>('/import/text', {
    text,
    source_url: sourceUrl ? normalizeUrl(sourceUrl) : null,
  });
}
