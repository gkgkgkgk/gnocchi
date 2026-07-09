import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'auto' | 'full';
  style?: ViewStyle;
}

/** A centered modal sheet. Use for confirmations, single-purpose forms. */
export function Sheet({ visible, onClose, children, size = 'auto', style }: SheetProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable style={styles.stopper} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              {
                backgroundColor: theme.colors.bgElevated,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.xl,
                width: size === 'full' ? '95%' : '100%',
                maxWidth: 480,
                ...theme.shadow.lg,
              },
              style,
            ]}
          >
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  stopper: { width: '100%', maxWidth: 480, alignItems: 'stretch' },
});
