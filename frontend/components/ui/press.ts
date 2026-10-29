import { Platform, ViewStyle } from 'react-native';
import { type Theme } from '@/constants/theme';

/** Pressable state on web also carries hover and keyboard focus. */
export type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/**
 * The shared "block" feel for outlined controls: lift a little on hover,
 * sink into the shadow on press, and show a clear focus ring on web.
 * `rest` is the shadow offset at rest (2 for small controls, 3 for buttons).
 */
export function blockPress(theme: Theme, { pressed, hovered, focused }: PressState, rest = 3, ringOffset = 4): ViewStyle {
  const offset = pressed ? 1 : hovered ? rest + 1 : rest;
  const shift = pressed ? rest - 1 : hovered ? -1 : 0;
  return {
    shadowColor: theme.scheme === 'dark' ? '#000000' : theme.colors.outline,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    transform: [{ translateX: shift }, { translateY: shift }],
    ...(Platform.OS === 'web'
      ? ({
          transitionProperty: 'transform, box-shadow, background-color, border-color',
          transitionDuration: '160ms',
          ...(focused ? { outlineStyle: 'solid', outlineWidth: 3, outlineColor: theme.colors.accent, outlineOffset: ringOffset } : null),
        } as ViewStyle)
      : null),
  };
}

/** Just the keyboard focus ring, for controls that don't lift. */
export function focusRing(theme: Theme, { focused }: PressState): ViewStyle | null {
  if (Platform.OS !== 'web' || !focused) return null;
  return { outlineStyle: 'solid', outlineWidth: 3, outlineColor: theme.colors.accent, outlineOffset: 2 } as ViewStyle;
}
