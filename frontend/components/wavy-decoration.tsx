/**
 * Hand-drawn wavy divider. Used between sections and in empty states to
 * add a bit of warmth without being noisy.
 *
 * Two variants: `line` (a single sine-y stroke, good as a divider) and
 * `blob` (a soft asymmetric mass, good as a background accent behind a
 * title or empty state).
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface WavyDecorationProps {
  variant?: 'line' | 'blob';
  color?: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
  opacity?: number;
}

export function WavyDecoration({
  variant = 'line',
  color,
  width = 240,
  height = 24,
  style,
  opacity = 0.6,
}: WavyDecorationProps) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.accent;

  if (variant === 'line') {
    return (
      <View style={[{ width, height, opacity }, style]} pointerEvents="none">
        <Svg width={width} height={height} viewBox="0 0 240 24" fill="none">
          <Path
            d="M2 12 C 22 2, 42 22, 62 12 S 102 2, 122 12 S 162 22, 182 12 S 222 2, 238 12"
            stroke={stroke}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  // Blob variant — soft asymmetric shape.
  return (
    <View style={[{ width, height, opacity }, style]} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 200 120" fill="none">
        <Path
          d="M40 20 C 10 30, 5 70, 30 90 C 55 110, 100 100, 130 105 C 170 112, 195 80, 190 55 C 185 25, 140 5, 100 15 C 75 21, 60 15, 40 20 Z"
          fill={stroke}
        />
      </Svg>
    </View>
  );
}
