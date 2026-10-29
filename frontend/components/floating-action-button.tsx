import { StyleSheet, Pressable, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { blockPress, type PressState } from './ui/press';
import { useTheme } from '@/hooks/use-theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** The big tomato block in the corner. */
export function FloatingActionButton({ onPress, label, icon = 'add' }: FloatingActionButtonProps) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(state) => [
        styles.fab,
        {
          backgroundColor: c.accent,
          borderRadius: theme.radius.lg,
          borderWidth: theme.outlineWidth,
          borderColor: c.outline,
        },
        blockPress(theme, state as PressState, 4),
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name={icon} size={22} color={c.accentFg} />
        {label && (
          <Text variant="button" style={{ color: c.accentFg, fontSize: 16 }}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    paddingHorizontal: 20,
    paddingVertical: 15,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
});
