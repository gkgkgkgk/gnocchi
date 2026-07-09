/**
 * Gnocchi design tokens. Warm off-white base, terracotta accent, sage
 * secondary, Fraunces + Inter typography.
 *
 * The tokens are consumed via `useTheme()` (returns the current scheme's
 * token set) and via `useThemeColor()` (kept for backward compat with
 * screens that haven't been refactored yet).
 */

import { Platform } from 'react-native';

// --- Colors -------------------------------------------------------------

const lightColors = {
  bg:            '#FBF7F1',   // warm cream — main screen background
  bgElevated:    '#FFFFFF',   // cards, sheets
  bgMuted:       '#F1EBE0',   // subtle surfaces (chips, filter bar)
  bgHover:       '#EFE7D8',

  fg:            '#1E1B18',   // primary text (ink)
  fgMuted:       '#5C544A',   // secondary text
  fgSubtle:      '#8B8377',   // tertiary text, placeholder

  border:        '#E5DDD0',
  borderStrong:  '#C8BEAA',

  accent:        '#E07856',   // terracotta — primary CTA
  accentHover:   '#CE6944',
  accentFg:      '#FFFFFF',
  accentMuted:   '#F5D9CE',

  secondary:     '#7A9B76',   // sage — secondary CTA
  secondaryFg:   '#FFFFFF',
  secondaryMuted:'#D6E1D2',

  danger:        '#B84B3B',
  dangerFg:      '#FFFFFF',
  dangerMuted:   '#F1D3CD',

  warning:       '#D89533',
  success:       '#5F8D64',

  overlay:       'rgba(30, 27, 24, 0.5)',

  // Legacy names still consumed by older screens.
  text:          '#1E1B18',
  background:    '#FBF7F1',
  tint:          '#E07856',
  icon:          '#5C544A',
  tabIconDefault:'#8B8377',
  tabIconSelected: '#E07856',
  card:          '#FFFFFF',
  wave:          '#E07856',
};

const darkColors = {
  bg:            '#1A1613',
  bgElevated:    '#211C18',
  bgMuted:       '#28221E',
  bgHover:       '#2E2823',

  fg:            '#F5EEE1',
  fgMuted:       '#B0A797',
  fgSubtle:      '#7A7365',

  border:        '#302923',
  borderStrong:  '#4A403A',

  accent:        '#EA8869',
  accentHover:   '#F09A7E',
  accentFg:      '#1A1613',
  accentMuted:   '#3A2620',

  secondary:     '#94B58F',
  secondaryFg:   '#1A1613',
  secondaryMuted:'#243024',

  danger:        '#D96555',
  dangerFg:      '#1A1613',
  dangerMuted:   '#3A2320',

  warning:       '#E4A754',
  success:       '#7DAF82',

  overlay:       'rgba(0, 0, 0, 0.6)',

  // Legacy.
  text:          '#F5EEE1',
  background:    '#1A1613',
  tint:          '#EA8869',
  icon:          '#B0A797',
  tabIconDefault:'#7A7365',
  tabIconSelected: '#EA8869',
  card:          '#211C18',
  wave:          '#EA8869',
};

// --- Spacing / radii / shadows ------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

// --- Typography ---------------------------------------------------------

export const fonts = {
  serif:   Platform.select({ web: '"Fraunces", ui-serif, Georgia, serif',                default: 'Fraunces_400Regular' })!,
  serifBd: Platform.select({ web: '"Fraunces", ui-serif, Georgia, serif',                default: 'Fraunces_700Bold' })!,
  sans:    Platform.select({ web: '"Inter", system-ui, -apple-system, sans-serif',       default: 'Inter_400Regular' })!,
  sansMd:  Platform.select({ web: '"Inter", system-ui, -apple-system, sans-serif',       default: 'Inter_500Medium' })!,
  sansSb:  Platform.select({ web: '"Inter", system-ui, -apple-system, sans-serif',       default: 'Inter_600SemiBold' })!,
  sansBd:  Platform.select({ web: '"Inter", system-ui, -apple-system, sans-serif',       default: 'Inter_700Bold' })!,
};

// Typography presets used across the app.
export const type = {
  display:    { fontFamily: fonts.serifBd, fontSize: 34, lineHeight: 40, fontWeight: '700' as const },
  h1:         { fontFamily: fonts.serifBd, fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  h2:         { fontFamily: fonts.serifBd, fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  h3:         { fontFamily: fonts.sansSb,  fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body:       { fontFamily: fonts.sans,    fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontFamily: fonts.sansMd,  fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  small:      { fontFamily: fonts.sans,    fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  smallMedium:{ fontFamily: fonts.sansMd,  fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption:    { fontFamily: fonts.sans,    fontSize: 11, lineHeight: 14, fontWeight: '400' as const },
  button:     { fontFamily: fonts.sansSb,  fontSize: 15, lineHeight: 18, fontWeight: '600' as const },
  label:      { fontFamily: fonts.sansSb,  fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
};

// --- Assembled theme ---------------------------------------------------

export type ColorTokens = typeof lightColors;
export type Theme = {
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  type: typeof type;
  scheme: 'light' | 'dark';
};

export const lightTheme: Theme = { colors: lightColors, spacing, radius, shadow, type, scheme: 'light' };
export const darkTheme:  Theme = { colors: darkColors,  spacing, radius, shadow, type, scheme: 'dark' };

// --- Legacy Colors export (backward compat with un-refactored screens) --

export const Colors = {
  light: lightColors,
  dark:  darkColors,
};

export const Fonts = Platform.select({
  ios: {
    sans:   'system-ui',
    serif:  'ui-serif',
    rounded:'ui-rounded',
    mono:   'ui-monospace',
  },
  default: {
    sans:   'normal',
    serif:  'serif',
    rounded:'normal',
    mono:   'monospace',
  },
  web: {
    sans:   "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:  "Georgia, 'Times New Roman', serif",
    rounded:"'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:   "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
