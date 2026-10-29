import { ReactNode } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { blockPress, type PressState } from './press';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean; // deeper shadow, use sparingly
  inset?: boolean;    // add internal padding
  /** Pointer hover (web), e.g. to animate something inside the card. */
  onHover?: (hovered: boolean) => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

/** White outlined panel on a hard offset shadow, like a tray on the counter. */
export function Card({ children, onPress, style, elevated, inset, onHover, onPressIn, onPressOut }: CardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const base: ViewStyle = {
    backgroundColor: c.bgElevated,
    borderRadius: theme.radius.lg,
    borderWidth: theme.outlineWidth,
    borderColor: c.outline,
    ...(elevated ? theme.shadow.lg : theme.shadow.md),
    ...(inset ? { padding: theme.spacing.lg } : {}),
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={onHover && (() => onHover(true))}
        onHoverOut={onHover && (() => onHover(false))}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={(state) => [base, blockPress(theme, state as PressState, elevated ? 5 : 3), style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
