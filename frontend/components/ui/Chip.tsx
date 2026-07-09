import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface ChipProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'accent' | 'outline';
  tone?: string; // custom tint color (e.g. tag colors)
  icon?: ReactNode;
  style?: ViewStyle;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function Chip({
  children,
  onPress,
  variant = 'default',
  tone,
  icon,
  style,
  active,
  size = 'md',
}: ChipProps) {
  const theme = useTheme();
  const c = theme.colors;

  const paletteBg =
    tone ? `${tone}22` :
    variant === 'accent' ? c.accent :
    variant === 'outline' ? 'transparent' :
    c.bgMuted;

  const paletteFg =
    tone ??
    (variant === 'accent' ? c.accentFg : c.fg);

  const paletteBorder =
    tone ?? (variant === 'outline' ? c.borderStrong : 'transparent');

  const pad = size === 'sm'
    ? { paddingHorizontal: theme.spacing.sm, paddingVertical: 4 }
    : { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm - 2 };

  const inner = (
    <View style={[styles.row, { gap: theme.spacing.xs }]}>
      {icon}
      <Text style={[
        size === 'sm' ? theme.type.caption : theme.type.smallMedium,
        { color: paletteFg },
      ]}>
        {children}
      </Text>
    </View>
  );

  const base: ViewStyle = {
    borderRadius: theme.radius.pill,
    borderWidth: variant === 'outline' || tone ? 1.5 : 0,
    borderColor: paletteBorder,
    backgroundColor: paletteBg,
    opacity: active === false ? 0.5 : 1,
    ...pad,
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
