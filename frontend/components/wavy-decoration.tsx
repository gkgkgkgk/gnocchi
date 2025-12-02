import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface WavyDecorationProps {
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-left';
  size?: 'small' | 'medium' | 'large';
}

export function WavyDecoration({ position = 'top', size = 'medium' }: WavyDecorationProps) {
  const waveColor = useThemeColor({}, 'wave');
  
  const dimensions = {
    small: { width: 150, height: 80 },
    medium: { width: 250, height: 120 },
    large: { width: 350, height: 160 },
  };

  const { width, height } = dimensions[size];

  const getPositionStyle = () => {
    switch (position) {
      case 'top':
        return { position: 'absolute' as const, top: 0, left: 0 };
      case 'bottom':
        return { position: 'absolute' as const, bottom: 0, right: 0 };
      case 'top-right':
        return { position: 'absolute' as const, top: 0, right: 0 };
      case 'bottom-left':
        return { position: 'absolute' as const, bottom: 0, left: 0 };
      default:
        return { position: 'absolute' as const, top: 0, left: 0 };
    }
  };

  const getRotation = () => {
    switch (position) {
      case 'bottom':
        return '180deg';
      case 'top-right':
        return '90deg';
      case 'bottom-left':
        return '270deg';
      default:
        return '0deg';
    }
  };

  return (
    <View style={[styles.container, getPositionStyle(), { width, height, transform: [{ rotate: getRotation() }] }]} pointerEvents="none">
      {/* Create wavy effect with overlapping circles */}
      <View style={[styles.wave, { backgroundColor: waveColor, width: width * 0.4, height: height * 0.6, left: 0, top: 0 }]} />
      <View style={[styles.wave, { backgroundColor: waveColor, width: width * 0.35, height: height * 0.5, left: width * 0.25, top: height * 0.15 }]} />
      <View style={[styles.wave, { backgroundColor: waveColor, width: width * 0.45, height: height * 0.65, left: width * 0.45, top: -height * 0.1 }]} />
      <View style={[styles.wave, { backgroundColor: waveColor, width: width * 0.3, height: height * 0.45, left: width * 0.7, top: height * 0.2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 0,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.25,
  },
});
