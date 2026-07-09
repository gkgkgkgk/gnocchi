import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface InputProps extends TextInputProps {
  error?: boolean;
  containerStyle?: ViewStyle;
  size?: 'md' | 'lg';
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { error, containerStyle, size = 'md', style, placeholderTextColor, ...rest },
  ref,
) {
  const theme = useTheme();
  const c = theme.colors;
  const pad = size === 'lg'
    ? { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md + 2 }
    : { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md };

  return (
    <View style={containerStyle}>
      <TextInput
        ref={ref}
        {...rest}
        placeholderTextColor={placeholderTextColor ?? c.fgSubtle}
        style={[
          {
            backgroundColor: c.bgElevated,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: error ? c.danger : c.border,
            color: c.fg,
            fontSize: size === 'lg' ? 17 : 15,
          },
          pad,
          style,
        ]}
      />
    </View>
  );
});

const _s = StyleSheet;
