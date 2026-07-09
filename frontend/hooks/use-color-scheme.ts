import { useResolvedScheme } from '@/contexts/theme-context';

/**
 * The active colour scheme after applying the user's in-app preference
 * (System / Light / Dark). Falls back to the OS scheme outside a
 * ThemeProvider. See `contexts/theme-context.tsx`.
 */
export function useColorScheme() {
  return useResolvedScheme();
}
