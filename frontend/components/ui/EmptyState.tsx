import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use-theme';

type Doodle = 'bowl' | 'book' | 'calendar';

interface EmptyStateProps {
  doodle: Doodle;
  title: string;
  line: string;
  /** Optional action (e.g. a Button) rendered under the copy. */
  action?: ReactNode;
  style?: ViewStyle;
}

/**
 * Illustrated empty state: a single hand-drawn doodle + one warm line.
 * The doodles are loose line art in the theme's accent/secondary so they
 * read as friendly rather than clip-art. See Phase 3 of PLAN.md.
 */
export function EmptyState({ doodle, title, line, action, style }: EmptyStateProps) {
  const theme = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.root, { padding: theme.spacing['2xl'] }, style]}>
      <Doodles doodle={doodle} stroke={c.accent} accent={c.secondary} />
      <Text variant="h2" style={{ marginTop: theme.spacing.xl, textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        variant="body"
        color="fgMuted"
        style={{ marginTop: theme.spacing.sm, textAlign: 'center', maxWidth: 320 }}
      >
        {line}
      </Text>
      {action != null && <View style={{ marginTop: theme.spacing.xl }}>{action}</View>}
    </View>
  );
}

function Doodles({ doodle, stroke, accent }: { doodle: Doodle; stroke: string; accent: string }) {
  const sw = 3.5;
  const common = {
    stroke,
    strokeWidth: sw,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (doodle === 'book') {
    return (
      <Svg width={132} height={104} viewBox="0 0 132 104">
        {/* spine */}
        <Line x1={66} y1={26} x2={66} y2={92} {...common} />
        {/* left + right covers */}
        <Path d="M66 26 C 48 14, 24 14, 12 22 L 12 84 C 24 76, 48 76, 66 88 Z" {...common} />
        <Path d="M66 26 C 84 14, 108 14, 120 22 L 120 84 C 108 76, 84 76, 66 88 Z" {...common} />
        {/* page lines */}
        <Path d="M24 34 C 36 30, 50 30, 58 36" stroke={accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M24 48 C 36 44, 50 44, 58 50" stroke={accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M74 36 C 82 30, 96 30, 108 34" stroke={accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M74 50 C 82 44, 96 44, 108 48" stroke={accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </Svg>
    );
  }

  if (doodle === 'calendar') {
    return (
      <Svg width={120} height={112} viewBox="0 0 120 112">
        {/* body */}
        <Path d="M18 26 L 102 26 L 102 98 L 18 98 Z" {...common} />
        {/* header bar */}
        <Line x1={18} y1={44} x2={102} y2={44} {...common} />
        {/* rings */}
        <Line x1={38} y1={14} x2={38} y2={32} {...common} />
        <Line x1={82} y1={14} x2={82} y2={32} {...common} />
        {/* date dots */}
        <Circle cx={40} cy={62} r={4} fill={accent} />
        <Circle cx={60} cy={62} r={4} fill={accent} />
        <Circle cx={80} cy={62} r={4} fill={accent} />
        <Circle cx={40} cy={80} r={4} fill={accent} />
        <Circle cx={60} cy={80} r={4} fill={stroke} />
        <Circle cx={80} cy={80} r={4} fill={accent} />
      </Svg>
    );
  }

  // bowl (recipes)
  return (
    <Svg width={128} height={104} viewBox="0 0 128 104">
      {/* steam */}
      <Path d="M50 20 C 44 28, 56 32, 50 40" stroke={accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M78 18 C 72 26, 84 30, 78 38" stroke={accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* rim */}
      <Path d="M18 52 C 40 44, 88 44, 110 52" {...common} />
      {/* bowl body */}
      <Path d="M20 54 C 28 82, 100 82, 108 54" {...common} />
      {/* base */}
      <Path d="M50 86 C 58 92, 70 92, 78 86" {...common} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
