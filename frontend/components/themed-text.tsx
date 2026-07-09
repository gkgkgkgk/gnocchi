import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

/** Legacy component. Refactored to consume the new theme's type + font
 *  stack while keeping the `type` prop's variants intact so no screen has
 *  to change. New code should prefer `components/ui/Text.tsx`. */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const variantStyle =
    type === 'title'         ? theme.type.display :
    type === 'subtitle'      ? theme.type.h2 :
    type === 'defaultSemiBold' ? theme.type.bodyMedium :
    type === 'link'          ? { ...theme.type.body, color: theme.colors.accent } :
    theme.type.body;

  return <Text style={[variantStyle, { color }, style]} {...rest} />;
}

const _s = StyleSheet;
