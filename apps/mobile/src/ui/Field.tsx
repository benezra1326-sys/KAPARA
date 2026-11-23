import { useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';
import { fonts, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { fontFor, Text } from './Text';

/**
 * Labelled text input with an optional character counter and error.
 * Focus draws a garnet border (no browser outline on top of it).
 */
export function Field({ label, hint, error, counter, style, onFocus, onBlur, ...rest }: TextInputProps & { label: string; hint?: string; error?: string; counter?: boolean }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const len = rest.value?.length ?? 0;
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" tone="textMuted">{label}</Text>
      <TextInput accessibilityLabel={label} accessibilityHint={hint} placeholderTextColor={c.textSubtle} selectionColor={c.accent}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[{
          minHeight: rest.multiline ? 104 : 52, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: focused ? 1.5 : 1,
          borderColor: error ? c.danger : focused ? c.accent : c.border, paddingHorizontal: space.lg, paddingVertical: space.md,
          color: c.text, fontFamily: fontFor(fonts.body), fontSize: 16, textAlignVertical: rest.multiline ? 'top' : 'center',
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
        }, style]} {...rest} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
        <Text variant="caption" style={{ color: error ? c.danger : c.textSubtle, flex: 1 }}>{error ?? hint ?? ''}</Text>
        {counter && rest.maxLength ? <Text variant="caption" tone="textSubtle">{len}/{rest.maxLength}</Text> : null}
      </View>
    </View>
  );
}
