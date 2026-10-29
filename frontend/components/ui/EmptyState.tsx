import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { Mascot } from '@/components/kitchen/mascot';
import { Bob } from '@/components/kitchen/motion';
import { Plate, SheetTray, Skillet } from '@/components/kitchen/shapes';
import { useTheme } from '@/hooks/use-theme';

type Doodle = 'bowl' | 'book' | 'calendar';

interface EmptyStateProps {
  /** Which empty piece of kit the chef stands beside. */
  doodle: Doodle;
  title: string;
  line: string;
  /** Optional action (e.g. a Button) rendered under the copy. */
  action?: ReactNode;
  style?: ViewStyle;
}

/** An empty counter: the chef beside an empty pan, tray or plate, and one warm line. */
export function EmptyState({ doodle, title, line, action, style }: EmptyStateProps) {
  const theme = useTheme();
  const Kit = doodle === 'book' ? SheetTray : doodle === 'calendar' ? Plate : Skillet;

  return (
    <View style={[styles.root, { padding: theme.spacing['2xl'] }, style]}>
      <View style={styles.scene} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Bob><Mascot size={104} /></Bob>
        <View style={{ marginLeft: -12, marginBottom: -4 }}>
          {doodle === 'bowl' ? <Skillet size={92} rotate={-20} filling="empty" /> : <Kit size={86} />}
        </View>
      </View>
      <Text variant="h1" style={{ marginTop: theme.spacing.xl, textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        variant="body"
        color="fgMuted"
        style={{ marginTop: theme.spacing.sm, textAlign: 'center', maxWidth: 340 }}
      >
        {line}
      </Text>
      {action != null && <View style={{ marginTop: theme.spacing.xl }}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scene: { flexDirection: 'row', alignItems: 'flex-end' },
});
