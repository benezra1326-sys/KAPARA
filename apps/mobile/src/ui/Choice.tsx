import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { hitSlop, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

/** One answer among several: stacked rows read better than chips for nuanced labels. */
export function ChoiceList({ options, value, onChange, label }: {
  options: { id: string; label: string; hint?: string }[]; value: string | null | undefined;
  onChange: (id: string) => void; label?: string;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: space.sm }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={o.label}
            accessibilityHint={o.hint}
            onPress={() => { void Haptics.selectionAsync(); onChange(o.id); }}
            style={({ pressed }) => ({
              minHeight: hitSlop + 8, flexDirection: 'row', alignItems: 'center', gap: space.md,
              paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md,
              backgroundColor: on ? c.accentSoft : pressed ? c.surfaceAlt : c.surface,
              borderWidth: 1, borderColor: on ? c.accent : c.border,
            })}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? c.accent : c.textSubtle, alignItems: 'center', justifyContent: 'center' }}>
              {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant={on ? 'bodyStrong' : 'body'}>{o.label}</Text>
              {o.hint ? <Text variant="caption" tone="textMuted">{o.hint}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Multi-select pills (languages, cultural ties). */
export function Chips({ options, values, onToggle, label }: {
  options: { id: string; label: string }[]; values: string[]; onToggle: (id: string) => void; label?: string;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => {
        const on = values.includes(o.id);
        return (
          <Pressable key={o.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={o.label}
            onPress={() => { void Haptics.selectionAsync(); onToggle(o.id); }}
            style={({ pressed }) => ({
              minHeight: hitSlop, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radius.pill,
              backgroundColor: on ? c.text : pressed ? c.surfaceAlt : c.surface, borderWidth: 1, borderColor: on ? c.text : c.border,
            })}>
            <Text variant="label" style={{ color: on ? c.bg : c.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
