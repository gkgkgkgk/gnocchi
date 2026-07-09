import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use-theme';

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
    <View style={[styles.row, { borderBottomColor: theme.colors.border, paddingHorizontal: theme.spacing.lg }]}>
      <View style={styles.side}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={26} color={theme.colors.fg} />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  side: { width: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  title: { flex: 1, textAlign: 'center' },
});
