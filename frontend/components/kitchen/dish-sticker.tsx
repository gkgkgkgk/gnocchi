import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { groundColor, pickArt } from './art';
import { Nudge } from './motion';

interface DishStickerProps {
  title: string;
  tags?: string[];
  ingredients?: string[];
  id?: string;
  size: number;
  wiggle?: boolean;
  style?: ViewStyle;
}

/**
 * The recipe's dish drawing as a little sticker on top of its photo, so
 * photographed recipes keep the kitchen character too. Decorative only.
 */
export function DishSticker({ title, tags, ingredients, id, size, wiggle, style }: DishStickerProps) {
  const { art, seed } = pickArt(title, tags, ingredients, id);
  const Draw = art.Draw;
  return (
    <Nudge
      active={!!wiggle}
      style={[{ position: 'absolute' }, style] as any}
    >
      <Draw size={size} rotate={[-12, 10, -6][seed % 3]} />
    </Nudge>
  );
}

/** The recipe's dish drawing on its tinted counter, as a small square tile. */
export function DishTile({ title, ingredients, id, size }: { title: string; ingredients?: string[]; id?: string; size: number }) {
  const { colors } = useTheme();
  const { art } = pickArt(title, [], ingredients, id);
  const Draw = art.Draw;
  return (
    <View style={{ width: size, height: size, backgroundColor: groundColor(colors, art.ground), alignItems: 'center', justifyContent: 'center' }}>
      <Draw size={size * 0.8} />
    </View>
  );
}
