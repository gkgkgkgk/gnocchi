import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Rise } from '@/components/kitchen/motion';
import { useTheme } from '@/hooks/use-theme';

export interface ToastMessage {
  text: string;
  /** e.g. "Undo" */
  actionLabel?: string;
  onAction?: () => void;
}

/** A short message block at the bottom of the screen, with one optional action. */
export function Toast({ message, onDismiss, bottom = 24 }: { message: ToastMessage | null; onDismiss: () => void; bottom?: number }) {
  const theme = useTheme();
  const c = theme.colors;
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Rise key={message.text}>
        <View
          style={[styles.toast, { backgroundColor: c.fg, borderColor: c.outline, ...theme.shadow.md }]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Text variant="bodyMedium" style={{ color: c.bg, flexShrink: 1 }}>{message.text}</Text>
          {message.actionLabel && (
            <Pressable
              onPress={() => { message.onAction?.(); onDismiss(); }}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.action, { backgroundColor: c.butter, borderColor: c.bg }]}
            >
              <Text variant="label" style={{ color: '#2A2420' }}>{message.actionLabel}</Text>
            </Pressable>
          )}
        </View>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 50 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 520,
    paddingLeft: 18, paddingRight: 10, paddingVertical: 10, borderRadius: 16, borderWidth: 2,
  },
  action: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 2 },
});
