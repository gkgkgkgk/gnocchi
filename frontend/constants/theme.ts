/**
 * Gnocchi design tokens. Warm paper ground, white panels, deep-ink outlines
 * with hard offset shadows, one tomato accent with sage for secondary
 * touches. Host Grotesk for headings, Instrument Sans for reading.
 *
 * The tokens are consumed via `useTheme()` (returns the current scheme's
 * token set) and via `useThemeColor()` (kept for backward compat with
 * screens that haven't been refactored yet).
 */

import { Platform } from 'react-native';

// --- Colors -------------------------------------------------------------

const lightColors = {
  bg:            '#FFF8EE',   // warm paper — main screen background
  bgElevated:    '#FFFFFF',   // panels, cards, sheets, inputs
  bgMuted:       '#F6ECDF',   // quiet surfaces (chips, segmented controls)
  bgHover:       '#F0E3D2',

  fg:            '#2A2420',   // ink
  fgMuted:       '#5F554C',   // secondary text
  fgSubtle:      '#7A7064',   // tertiary text, placeholders

  border:        '#E9DDCC',   // hairline dividers
  borderStrong:  '#B9AC9B',   // unselected controls
  outline:       '#2A2420',   // outlined pieces: cards, buttons, inputs

  accent:        '#CF4A25',   // tomato — primary action
  accentHover:   '#B83F1E',
  accentFg:      '#FFFFFF',
  accentMuted:   '#FCE3D7',   // selection tint

  secondary:     '#4F7D57',   // sage — secondary marks
  secondaryFg:   '#FFFFFF',
  secondaryMuted:'#E2F0E1',

  danger:        '#B3372B',
  dangerFg:      '#FFFFFF',
  dangerMuted:   '#F8DAD5',

  warning:       '#C98A1E',
  success:       '#4F7D57',

  // The kitchen pieces: tomato, butter (gnocchi) and basil, on paper.
  tomato:        '#E2603C',
  tomatoMuted:   '#FBDCD0',
  butter:        '#F5C24C',
  butterMuted:   '#FFF0C8',
  basil:         '#6FA371',
  basilMuted:    '#DDEEDB',
  cocoa:         '#9C5A3C',   // seared, roasted, baked brown
  steel:         '#D9D2C7',   // pans, pots and sheet trays

  overlay:       'rgba(42, 36, 32, 0.45)',

  // Legacy names still consumed by older screens.
  text:          '#2A2420',
  background:    '#FFF8EE',
  tint:          '#CF4A25',
  icon:          '#5F554C',
  tabIconDefault:'#7A7064',
  tabIconSelected: '#CF4A25',
  card:          '#FFFFFF',
  wave:          '#CF4A25',
};

const darkColors: typeof lightColors = {
  bg:            '#191512',
  bgElevated:    '#241F1B',
  bgMuted:       '#2D2722',
  bgHover:       '#352E28',

  fg:            '#F7EFE4',
  fgMuted:       '#C0B5A6',
  fgSubtle:      '#968A7C',

  border:        '#3A322B',
  borderStrong:  '#5C5147',
  outline:       '#6B5F54',

  accent:        '#F27A55',
  accentHover:   '#F58E6D',
  accentFg:      '#1D1410',
  accentMuted:   '#3D261D',

  secondary:     '#8CBF92',
  secondaryFg:   '#14201A',
  secondaryMuted:'#22302A',

  danger:        '#E2705F',
  dangerFg:      '#1D1410',
  dangerMuted:   '#3D2320',

  warning:       '#E4AE55',
  success:       '#8CBF92',

  tomato:        '#E8714D',
  tomatoMuted:   '#4A2A20',
  butter:        '#EDBE52',
  butterMuted:   '#40351C',
  basil:         '#7FB381',
  basilMuted:    '#24352A',
  cocoa:         '#A8664A',
  steel:         '#5E5650',

  overlay:       'rgba(0, 0, 0, 0.6)',

  // Legacy.
  text:          '#F7EFE4',
  background:    '#191512',
  tint:          '#F27A55',
  icon:          '#C0B5A6',
  tabIconDefault:'#968A7C',
  tabIconSelected: '#F27A55',
  card:          '#241F1B',
  wave:          '#F27A55',
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
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
};

/** Width of outlines on cards, buttons and inputs. */
export const outlineWidth = 2;

// Screen-width breakpoints (min-width, in px). Devices we actually run on:
// phones below `sm`, iPad portrait around `md`, iPad landscape / desktop at
// `lg` and up (where two-pane layouts kick in).
export const breakpoints = {
  sm: 640,   // large phone / small tablet portrait
  md: 900,   // tablet portrait → landscape threshold
  lg: 1200,  // desktop / wide tablet landscape
};

// Hard offset shadows: a solid copy of the outline nudged down-right, no
// blur. `sm` for chips and small controls, `md` for cards and buttons, `lg`
// for floating pieces.
function hardShadows(color: string) {
  const hard = (offset: number) => ({
    shadowColor: color,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  });
  return { sm: hard(2), md: hard(3), lg: hard(5) };
}

export const shadow = hardShadows(lightColors.outline);
const darkShadow = hardShadows('#000000');

// --- Typography ---------------------------------------------------------

// On web the families load from Google Fonts (see app/+html.tsx) so every
// weight renders natively; on device they come from @expo-google-fonts.
const webDisplay = '"Host Grotesk", system-ui, -apple-system, sans-serif';
const webReading = '"Instrument Sans", system-ui, -apple-system, sans-serif';

export const fonts = {
  display:   Platform.select({ web: webDisplay, default: 'HostGrotesk_700Bold' })!,
  displayBd: Platform.select({ web: webDisplay, default: 'HostGrotesk_800ExtraBold' })!,
  sans:      Platform.select({ web: webReading, default: 'InstrumentSans_400Regular' })!,
  sansMd:    Platform.select({ web: webReading, default: 'InstrumentSans_500Medium' })!,
  sansSb:    Platform.select({ web: webReading, default: 'InstrumentSans_600SemiBold' })!,
  sansBd:    Platform.select({ web: webReading, default: 'InstrumentSans_700Bold' })!,
};

// Typography presets used across the app.
export const type = {
  display:    { fontFamily: fonts.displayBd, fontSize: 36, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -1 },
  h1:         { fontFamily: fonts.displayBd, fontSize: 28, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.6 },
  h2:         { fontFamily: fonts.display,   fontSize: 21, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3:         { fontFamily: fonts.sansSb,    fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body:       { fontFamily: fonts.sans,      fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontFamily: fonts.sansMd,    fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  small:      { fontFamily: fonts.sans,      fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  smallMedium:{ fontFamily: fonts.sansMd,    fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  caption:    { fontFamily: fonts.sans,      fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  button:     { fontFamily: fonts.sansSb,    fontSize: 15, lineHeight: 18, fontWeight: '600' as const },
  label:      { fontFamily: fonts.sansSb,    fontSize: 13, lineHeight: 18, fontWeight: '600' as const, letterSpacing: 0.2 },
};

// --- Assembled theme ---------------------------------------------------

export type ColorTokens = typeof lightColors;
export type Theme = {
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  type: typeof type;
  outlineWidth: number;
  scheme: 'light' | 'dark';
};

export const lightTheme: Theme = { colors: lightColors, spacing, radius, shadow, type, outlineWidth, scheme: 'light' };
export const darkTheme:  Theme = { colors: darkColors,  spacing, radius, shadow: darkShadow, type, outlineWidth, scheme: 'dark' };

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
    sans:   webReading,
    serif:  webDisplay,
    rounded:webDisplay,
    mono:   "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
