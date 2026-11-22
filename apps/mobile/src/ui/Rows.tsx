import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { hitSlop, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

/** Grouped surface with an overline title, used for settings-like lists. */
export function Section({ title, footnote, children }: { title?: string; footnote?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ marginHorizontal: space.lg, marginBottom: space.xl, gap: space.sm }}>
      {title ? <Text variant="overline" tone="textSubtle" style={{ marginHorizontal: space.sm }} accessibilityRole="header">{title}</Text> : null}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }}>{children}</View>
      {footnote ? <Text variant="caption" tone="textSubtle" style={{ marginHorizontal: space.sm }}>{footnote}</Text> : null}
    </View>
  );
}

export function Row({ title, value, detail, onPress, first, trailing, accessibilityHint }: {
  title: string; value?: string; detail?: ReactNode; onPress?: () => void; first?: boolean; trailing?: ReactNode; accessibilityHint?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${title}, ${value}` : title} accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({
        minHeight: hitSlop + 8, paddingHorizontal: space.xl, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md,
        backgroundColor: pressed ? c.surfaceAlt : 'transparent', borderTopWidth: first ? 0 : 1, borderTopColor: c.border,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text>{title}</Text>
        {value ? <Text variant="caption" tone="textMuted" numberOfLines={2}>{value}</Text> : null}
        {detail}
      </View>
      {trailing ?? (onPress ? <Text tone="textSubtle" accessibilityElementsHidden>›</Text> : null)}
    </Pressable>
  );
}

export function SwitchRow({ title, description, value, onValueChange, first }: {
  title: string; description?: string; value: boolean; onValueChange: (v: boolean) => void; first?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ minHeight: hitSlop + 8, paddingHorizontal: space.xl, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md, borderTopWidth: first ? 0 : 1, borderTopColor: c.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text>{title}</Text>
        {description ? <Text variant="caption" tone="textMuted">{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={title} accessibilityHint={description}
        trackColor={{ true: c.accent, false: c.border }} thumbColor="#fff" />
    </View>
  );
}
