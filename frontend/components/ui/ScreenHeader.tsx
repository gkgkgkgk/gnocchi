import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use-theme';
import { blockPress, type PressState } from './press';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  /** Rendered on the trailing edge (e.g. a save button or icon). */
  right?: ReactNode;
}

/** Consistent top bar: back chevron, centered title, optional trailing slot. */
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.outline, paddingHorizontal: theme.spacing.lg }]}>
      <View style={styles.side}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={(state) => [styles.backBtn, { backgroundColor: theme.colors.bgElevated, borderColor: theme.colors.outline }, blockPress(theme, state as PressState, 2, 2)]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.fg} />
          </Pressable>
        )}
      </View>

      {title ? (
        <Text variant="h3" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}

      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    minHeight: 58,
  },
  side: { width: 52, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
});
