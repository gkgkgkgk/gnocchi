import { StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';

interface FloatingActionButtonProps {
  onPress: () => void;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FloatingActionButton({
  onPress,
  label,
  icon,
}: FloatingActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.fabPressed,
      ]}
    >
      {icon && <Ionicons name={icon} size={24} color="#fff" />}
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#A1CEDC',
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1.0,
    shadowRadius: 24,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
    elevation: 4,
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
