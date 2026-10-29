import { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeIn } from '@/components/kitchen/motion';
import { Tablecloth } from '@/components/kitchen/tablecloth';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Full-screen page container. Handles safe-area + theme background, and eases in. */
export function Screen({ children, padded, style, edges = ['top', 'left', 'right'] }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }, style]} edges={edges}>
      <Tablecloth />
      <FadeIn style={padded ? { padding: theme.spacing.lg } : undefined}>
        {children}
      </FadeIn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
