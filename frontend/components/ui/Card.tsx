import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevated?: boolean; // more shadow, use sparingly
  inset?: boolean;    // add internal padding
}

export function Card({ children, onPress, style, elevated, inset }: CardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const base: ViewStyle = {
    backgroundColor: c.bgElevated,
    borderRadius: theme.radius.lg,
    borderWidth: theme.scheme === 'dark' ? 0 : 1,
    borderColor: c.border,
    ...(elevated ? theme.shadow.md : theme.shadow.sm),
    ...(inset ? { padding: theme.spacing.lg } : {}),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.9 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

const _s = StyleSheet;
