import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useResponsive } from '@/hooks/use-responsive';
import { Mascot } from './mascot';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Kitchen pieces shown on the trailing side on wide screens. */
  art?: ReactNode;
  /** Controls shown on the trailing side at every width. */
  right?: ReactNode;
}

/** Top of a main tab: the gnocchi mark, a big title, and a line under it. */
export function PageHeader({ title, subtitle, art, right }: PageHeaderProps) {
  const { isWide } = useResponsive();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {/* On wide screens the nav rail already carries the chef. */}
        {!isWide && (
          <View style={styles.brandRow}>
            <Mascot size={34} />
            <Text variant="label" color="accent" style={{ letterSpacing: 1.2 }}>GNOCCHI</Text>
          </View>
        )}
        <Text variant="display" style={{ marginTop: isWide ? 0 : 6 }} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text variant="small" color="fgMuted" style={{ marginTop: 4 }}>{subtitle}</Text> : null}
      </View>
      {isWide && art ? (
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{art}</View>
      ) : null}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  art: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginRight: 8 },
});
