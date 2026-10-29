import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { groundColor, pickArt } from './art';
import { Nudge, Steam } from './motion';
import { Gnocchi, Leaf, Tomato } from './shapes';

interface RecipeCoverProps {
  title: string;
  tags?: string[];
  ingredients?: string[];
  id?: string;
  height: number;
  /** Let hot dishes steam (the recipe page hero). */
  steam?: boolean;
  /** Give the dish a playful nudge (e.g. while its card is hovered). */
  wiggle?: boolean;
  style?: ViewStyle;
}

const HOT = new Set(['stew', 'soup', 'pot', 'rice', 'pasta', 'gnocchi', 'skillet', 'eggs', 'dumplings']);

/**
 * The stand-in for a recipe photo: a drawing of the dish (a taco for tacos, a
 * stew pot for a bourguignon) on a tinted counter, with a garnish or two.
 * The arrangement is stable per recipe.
 */
export function RecipeCover({ title, tags = [], ingredients = [], id = '', height, steam, wiggle, style }: RecipeCoverProps) {
  const { colors: c } = useTheme();
  const { art, seed } = pickArt(title, tags, ingredients, id);
  const pick = (n: number, salt: number) => (seed >>> salt) % n;

  const main = Math.round(height * 0.86);
  const garnish = Math.round(height * 0.3);
  const flip = pick(2, 3) === 1;
  const garnishes = art.key === 'pasta' || art.key === 'gnocchi' ? [Leaf, Gnocchi, Tomato] : [Leaf, Tomato];
  const First = garnishes[pick(garnishes.length, 5)];
  const Second = garnishes[(pick(garnishes.length, 5) + 1) % garnishes.length];
  const Main = art.Draw;

  return (
    <View
      style={[{ height, backgroundColor: groundColor(c, art.ground), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Nudge active={!!wiggle} style={{ transform: [{ translateX: flip ? -height * 0.22 : height * 0.22 }] }}>
        {steam && HOT.has(art.key) && (
          <Steam color={c.bgElevated} size={height * 0.28} style={{ position: 'absolute', top: -height * 0.12, alignSelf: 'center', zIndex: 1 }} />
        )}
        <Main size={main} rotate={[-10, 6, -4, 12][pick(4, 7)]} />
      </Nudge>
      <View style={{ position: 'absolute', top: height * 0.12, [flip ? 'right' : 'left']: '13%' }}>
        <First size={garnish} rotate={[-30, 12, 40][pick(3, 11)]} />
      </View>
      <View style={{ position: 'absolute', bottom: height * 0.1, [flip ? 'right' : 'left']: '25%' }}>
        <Second size={Math.round(garnish * 0.8)} rotate={[20, -25, 5][pick(3, 13)]} />
      </View>
    </View>
  );
}
