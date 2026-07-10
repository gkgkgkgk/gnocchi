import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface StarRatingProps {
  value: number | null | undefined;
  /** Omit for a read-only display. Tapping the current rating again clears it. */
  onChange?: (value: number | null) => void;
  size?: number;
  color?: string;
  gap?: number;
}

export function StarRating({ value, onChange, size = 20, color, gap = 2 }: StarRatingProps) {
  const theme = useTheme();
  const c = theme.colors;
  const active = color ?? c.warning;
  const rating = value ?? 0;
  const readOnly = !onChange;

  return (
    <View style={[styles.row, { gap }]}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        const icon = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? active : c.borderStrong}
          />
        );
        if (readOnly) return <View key={star}>{icon}</View>;
        return (
          <Pressable
            key={star}
            hitSlop={4}
            onPress={() => onChange!(star === rating ? null : star)}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
