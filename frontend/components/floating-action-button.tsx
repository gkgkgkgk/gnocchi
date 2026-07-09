import { StyleSheet, Pressable, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { useTheme } from '@/hooks/use-theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FloatingActionButton({ onPress, label, icon = 'add' }: FloatingActionButtonProps) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: pressed ? c.accentHover : c.accent,
          borderRadius: theme.radius.pill,
          ...theme.shadow.lg,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name={icon} size={22} color={c.accentFg} />
        {label && (
          <Text variant="button" style={{ color: c.accentFg }}>
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
    paddingHorizontal: 22,
    paddingVertical: 16,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
});
