import { TextInput, View, type TextInputProps } from 'react-native';
import { fonts, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

/** Labelled text input with an optional character counter and error. */
export function Field({ label, hint, error, counter, style, ...rest }: TextInputProps & { label: string; hint?: string; error?: string; counter?: boolean }) {
    const { c } = useTheme();
    const len = rest.value?.length ?? 0;
    return (
      <View style={{ gap: space.xs }}>
        <Text variant="label" tone="textMuted">{label}</Text>
        <TextInput accessibilityLabel={label} accessibilityHint={hint} placeholderTextColor={c.textSubtle}
          style={[{
            minHeight: rest.multiline ? 104 : 52, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1,
            borderColor: error ? c.danger : c.border, paddingHorizontal: space.lg, paddingVertical: space.md,
            color: c.text, fontFamily: fonts.body, fontSize: 16, textAlignVertical: rest.multiline ? 'top' : 'center',
          }, style]} {...rest} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
          <Text variant="caption" style={{ color: error ? c.danger : c.textSubtle, flex: 1 }}>{error ?? hint ?? ''}</Text>
          {counter && rest.maxLength ? <Text variant="caption" tone="textSubtle">{len}/{rest.maxLength}</Text> : null}
        </View>
      </View>
    );
}
