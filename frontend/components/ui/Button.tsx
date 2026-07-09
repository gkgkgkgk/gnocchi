import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

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
}

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
}: ButtonProps) {
  const theme = useTheme();
  const c = theme.colors;

  const bg = {
    primary:   c.accent,
    secondary: c.bgMuted,
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
    sm: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
    md: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
    lg: { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg },
  }[size];

  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        pad,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant === 'ghost' && { borderWidth: 1, borderColor: c.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          {children != null && (
            <Text
              style={[
                theme.type.button,
                { color: fg, fontSize },
                (icon || iconRight) && { marginHorizontal: theme.spacing.xs },
              ]}
            >
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
