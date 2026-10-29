import { ReactNode } from 'react';
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

type Variant = keyof Theme['type'];

interface TextProps extends Omit<RNTextProps, 'style' | 'children'> {
  children: ReactNode;
  variant?: Variant;
  color?: 'fg' | 'fgMuted' | 'fgSubtle' | 'accent' | 'secondary' | 'danger' | 'inherit';
  style?: StyleProp<TextStyle>;
}

/** Typed text primitive backed by the theme's type + colors. */
export function Text({ children, variant = 'body', color = 'fg', style, ...rest }: TextProps) {
  const theme = useTheme();
  const c = theme.colors;
  const tint =
    color === 'inherit' ? undefined :
    color === 'accent'    ? c.accent :
    color === 'secondary' ? c.secondary :
    color === 'danger'    ? c.danger :
    c[color];
  return (
    <RNText {...rest} style={[theme.type[variant], tint && { color: tint }, style]}>
      {children}
    </RNText>
  );
}
