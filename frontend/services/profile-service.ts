/**
 * "Profile" is now "House preferences" — no users, just one set of
 * household-wide dietary restrictions + favorite food + tags. Tags moved
 * from profile_config into their own /tags endpoint.
 */

import { api } from '@/lib/api';

export interface RecipeTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export type UnitPreference = 'metric' | 'imperial' | 'as_written';

export interface Preferences {
  dietary_restrictions: string[];
  favorite_food?: string | null;
  household_size?: number | null;
  preferred_units?: UnitPreference | null;
}

export async function getUnitPreference(): Promise<UnitPreference> {
  const prefs = await getPreferences();
  return prefs.preferred_units ?? 'as_written';
}

export async function saveUnitPreference(units: UnitPreference): Promise<boolean> {
  const prefs = await getPreferences();
  await savePreferences({ ...prefs, preferred_units: units });
  return true;
}

// --- Tags (backed by the /tags endpoint) --------------------------------

export async function getUserTags(): Promise<RecipeTag[]> {
  return api.get<RecipeTag[]>('/tags');
}

export async function saveUserTags(tags: RecipeTag[]): Promise<RecipeTag[]> {
  return api.put<RecipeTag[]>('/tags', tags);
}

// --- Preferences (singleton) --------------------------------------------

export async function getPreferences(): Promise<Preferences> {
  return api.get<Preferences>('/preferences');
}

export async function savePreferences(prefs: Preferences): Promise<Preferences> {
  return api.put<Preferences>('/preferences', prefs);
}

export async function getDietaryRestrictions(): Promise<string[]> {
  const prefs = await getPreferences();
  return prefs.dietary_restrictions ?? [];
}

export async function saveDietaryRestrictions(restrictions: string[]): Promise<boolean> {
  const prefs = await getPreferences();
  await savePreferences({ ...prefs, dietary_restrictions: restrictions });
  return true;
}

export async function getFavoriteFood(): Promise<string | null> {
  const prefs = await getPreferences();
  return prefs.favorite_food ?? null;
}

export async function saveFavoriteFood(food: string): Promise<boolean> {
  const prefs = await getPreferences();
  await savePreferences({ ...prefs, favorite_food: food });
  return true;
}

// --- Legacy shims (kept so existing screens keep compiling; no-ops now) --

/** Historically returned whether a user profile existed. There's no user now. */
export async function checkUserProfile(): Promise<boolean> {
  return true;
}

/** Historically created a user profile from onboarding answers.
 *  Now: routes any dietary/favorite fields into the preferences singleton. */
export async function createUserProfile(answers: Record<string, any> = {}): Promise<boolean> {
  const patch: Preferences = { dietary_restrictions: [] };
  if (Array.isArray(answers.dietary_restrictions)) {
    patch.dietary_restrictions = answers.dietary_restrictions;
  }
  if (typeof answers.favorite_food === 'string') {
    patch.favorite_food = answers.favorite_food;
  }
  await savePreferences(patch);
  return true;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
