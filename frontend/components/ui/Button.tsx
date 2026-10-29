import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { blockPress, type PressState } from './press';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

/** Outlined block button with a hard offset shadow; ghost is flat text. */
export function Button({
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  style,
  fullWidth,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const c = theme.colors;

  const bg = {
    primary:   c.accent,
    secondary: c.bgElevated,
    ghost:     'transparent',
    danger:    c.danger,
  }[variant];

  const fg = {
    primary:   c.accentFg,
    secondary: c.fg,
    ghost:     c.fg,
    danger:    c.dangerFg,
  }[variant];

  const pad = {
    sm: { paddingHorizontal: theme.spacing.md, paddingVertical: 7 },
    md: { paddingHorizontal: theme.spacing.lg + 2, paddingVertical: 11 },
    lg: { paddingHorizontal: theme.spacing.xl, paddingVertical: 15 },
  }[size];

  const fontSize = { sm: 14, md: 15, lg: 17 }[size];
  const blocky = variant !== 'ghost' && !disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={(state) => [
        styles.base,
        pad,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.md,
          borderWidth: variant === 'ghost' ? 0 : theme.outlineWidth,
          borderColor: c.outline,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        blocky && blockPress(theme, state as PressState, size === 'sm' ? 2 : 3),
        variant === 'ghost' && (state as PressState).pressed && { backgroundColor: c.bgMuted },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          {children != null && (
            <Text style={[theme.type.button, { color: fg, fontSize }]}>
              {children}
            </Text>
          )}
          {iconRight}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
