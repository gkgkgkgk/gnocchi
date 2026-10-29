import { forwardRef, useState } from 'react';
import { TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { easeColors } from '@/components/kitchen/motion';

interface InputProps extends TextInputProps {
  error?: boolean;
  containerStyle?: ViewStyle;
  size?: 'md' | 'lg';
}

/** Outlined text field; focus darkens the outline and adds an accent shadow. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { error, containerStyle, size = 'md', style, placeholderTextColor, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const c = theme.colors;
  const [focused, setFocused] = useState(false);
  const pad = size === 'lg'
    ? { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md + 2 }
    : { paddingHorizontal: theme.spacing.md + 2, paddingVertical: theme.spacing.md - 1 };

  return (
    <View style={containerStyle}>
      <TextInput
        ref={ref}
        {...rest}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        placeholderTextColor={placeholderTextColor ?? c.fgSubtle}
        style={[
          inputStyle(theme, { focused, error }),
          { fontSize: size === 'lg' ? 18 : 16 },
          pad,
          style,
        ]}
      />
    </View>
  );
});

/** The field look, shared with screens that style a raw TextInput. */
export function inputStyle(
  theme: ReturnType<typeof useTheme>,
  { focused, error }: { focused?: boolean; error?: boolean } = {},
) {
  const c = theme.colors;
  return {
    backgroundColor: c.bgElevated,
    borderRadius: theme.radius.md,
    borderWidth: theme.outlineWidth,
    borderColor: error ? c.danger : focused ? c.outline : c.borderStrong,
    color: c.fg,
    fontFamily: theme.type.body.fontFamily,
    outlineStyle: 'none',
    shadowColor: error ? c.danger : c.accent,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: focused || error ? 1 : 0,
    shadowRadius: 0,
    ...easeColors,
  } as unknown as TextStyle;
}
