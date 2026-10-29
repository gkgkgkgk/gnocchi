import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { blockPress, focusRing, type PressState } from './press';
import { easeColors } from '@/components/kitchen/motion';

interface ChipProps {
  children: ReactNode;
  onPress?: () => void;
  /** default: quiet fill; accent: selected; outline: outlined, unselected. */
  variant?: 'default' | 'accent' | 'outline';
  /** A tag's own colour, shown as a dot so chips stay in the app palette. */
  tone?: string;
  icon?: ReactNode;
  style?: ViewStyle;
  active?: boolean;
  size?: 'sm' | 'md';
}

/** Small outlined pill for filters, tags and facts. */
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
  const selected = variant === 'accent';

  const bg = selected ? c.accentMuted : variant === 'outline' ? c.bgElevated : c.bgMuted;
  const border = selected ? c.outline : variant === 'outline' || tone ? c.borderStrong : 'transparent';

  const pad = size === 'sm'
    ? { paddingHorizontal: 10, paddingVertical: 4 }
    : { paddingHorizontal: theme.spacing.md, paddingVertical: 6 };

  const inner = (
    <View style={[styles.row, { gap: 6 }]}>
      {tone && !icon && <View style={[styles.dot, { backgroundColor: tone, borderColor: c.outline }]} />}
      {icon}
      <Text style={[size === 'sm' ? theme.type.label : theme.type.smallMedium, { color: c.fg }]}>
        {children}
      </Text>
    </View>
  );

  const base: ViewStyle = {
    borderRadius: theme.radius.pill,
    borderWidth: theme.outlineWidth,
    borderColor: border,
    backgroundColor: bg,
    opacity: active === false ? 0.5 : 1,
    ...pad,
    ...easeColors,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={(state) => [base, selected ? blockPress(theme, state as PressState, 2, 2) : focusRing(theme, state as PressState), style]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
});
