export type Origin = 'made' | 'adapted' | 'imported' | 'ai';

export const IMPORT_TYPES = ['website', 'pinterest', 'instagram', 'photo', 'text'];

/**
 * Where a recipe came from, as shown on cards and filters. The stored
 * source_type wins, so a recipe re-labelled "Made by me" in the editor stays
 * that way even though it keeps its link to the recipe it was adapted from.
 */
export function originOf(sourceType: string | null | undefined, sourceRecipeId?: string | null, sourceUrl?: string | null): Origin {
  if (sourceType === 'adapted') return 'adapted';
  if (sourceType === 'ai') return 'ai';
  if (sourceType && IMPORT_TYPES.includes(sourceType)) return 'imported';
  if (sourceType) return 'made';
  if (sourceRecipeId) return 'adapted';
  return sourceUrl ? 'imported' : 'made';
}

export const ORIGIN_LABEL: Record<Origin, string> = {
  made: 'Made by me',
  adapted: 'Adapted recipe',
  imported: 'Imported recipe',
  ai: 'Created with AI',
};

export const ORIGIN_ICON = {
  made: 'bookmark-outline',
  adapted: 'git-branch-outline',
  imported: 'download-outline',
  ai: 'sparkles-outline',
} as const;
