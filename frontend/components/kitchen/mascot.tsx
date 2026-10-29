import { Image, ImageStyle, StyleProp } from 'react-native';

const CHEF = require('@/assets/images/gnocchi_chef.png');

/** The little gnocchi chef: Gnocchi's logo and host. */
export function Mascot({ size = 48, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={CHEF}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}
