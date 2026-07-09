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

export async function importFromPinterest(url: string): Promise<ImportResponse> {
  return api.post<ImportResponse>('/import/pinterest', { url });
}

export async function importFromWebsite(url: string): Promise<ImportResponse> {
  return api.post<ImportResponse>('/import/website', { url });
}
