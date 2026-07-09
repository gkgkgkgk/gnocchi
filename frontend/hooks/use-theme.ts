import { useColorScheme } from './use-color-scheme';
import { darkTheme, lightTheme, type Theme } from '@/constants/theme';

/** Return the currently-active theme object (colors, spacing, radii, type). */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
