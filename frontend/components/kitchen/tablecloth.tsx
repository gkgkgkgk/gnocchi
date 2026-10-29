import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

const CHECK = 22;

/**
 * A faint trattoria gingham behind every page: tomato stripes crossing on the
 * paper, darker where they overlap. Panels sit on it like plates on a
 * tablecloth. Purely decorative.
 */
export function Tablecloth() {
  const { colors: c, scheme } = useTheme();
  const tint = scheme === 'dark' ? '#F27A55' : c.tomato;
  const alpha = scheme === 'dark' ? 0.05 : 0.07;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="gingham" width={CHECK * 2} height={CHECK * 2} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={CHECK} height={CHECK * 2} fill={tint} fillOpacity={alpha} />
            <Rect x={0} y={0} width={CHECK * 2} height={CHECK} fill={tint} fillOpacity={alpha} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#gingham)" />
      </Svg>
    </View>
  );
}
