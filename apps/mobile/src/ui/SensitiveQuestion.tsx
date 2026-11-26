import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { hitSlop, space } from '@kapara/design';
import { CULTURAL_TAG_SUGGESTIONS, type FieldMeta } from '../me/fields';
import type { SensitiveField } from '../me/store';
import { useTheme } from '../theme';
import { ChoiceList, Chips } from './Choice';
import { Field } from './Field';
import { Text } from './Text';

/**
 * One Jewish-life question: nuanced options, "I'd rather not say", and a
 * free note in the member's own words. Visibility is handled separately.
 */
export function SensitiveQuestion({ meta, value, onChange, compact }: { meta: FieldMeta; value: SensitiveField; onChange: (f: SensitiveField) => void; compact?: boolean }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [custom, setCustom] = useState('');
  const set = (patch: Partial<SensitiveField>) => onChange({ ...value, ...patch } as SensitiveField);
  const tags = Array.isArray(value.value) ? (value.value as string[]) : [];

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.xs }}>
        <Text variant={compact ? 'heading' : 'title'} accessibilityRole="header">{t(`jl.q.${meta.key}`)}</Text>
        <Text tone="textMuted">{t(`jl.help.${meta.key}`)}</Text>
      </View>

      {meta.kind === 'single' && meta.options ? (
        <ChoiceList label={t(`jl.q.${meta.key}`)} value={value.preferNotToSay ? null : (value.value as string | null)}
          options={meta.options.map((o) => ({ id: o, label: t(`jl.options.${meta.key}.${o}`) }))}
          onChange={(id) => set({ value: id as never, preferNotToSay: false })} />
      ) : null}

      {meta.kind === 'text' ? (
        <Field label={t(`jl.short.${meta.key}`)} value={typeof value.value === 'string' ? value.value : ''} maxLength={80}
          onChangeText={(v) => set({ value: (v || null) as never, preferNotToSay: false })} placeholder={t('jl.communityPlaceholder')} />
      ) : null}

      {meta.kind === 'tags' ? (
        <View style={{ gap: space.md }}>
          <Chips label={t(`jl.q.${meta.key}`)} values={tags}
            options={[...new Set([...CULTURAL_TAG_SUGGESTIONS, ...tags])].map((id) => ({ id, label: t(`jl.tags.${id}`, { defaultValue: id }) }))}
            onToggle={(id) => {
              const next = tags.includes(id) ? tags.filter((x) => x !== id) : [...tags, id].slice(0, 6);
              set({ value: (next.length ? next : null) as never, preferNotToSay: false });
            }} />
          <Field label={t('jl.addOwnTag')} value={custom} onChangeText={setCustom} maxLength={40} returnKeyType="done"
            onSubmitEditing={() => {
              const v = custom.trim();
              if (v && !tags.includes(v) && tags.length < 6) set({ value: [...tags, v] as never, preferNotToSay: false });
              setCustom('');
            }} />
        </View>
      ) : null}

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value.preferNotToSay }}
        onPress={() => set({ preferNotToSay: !value.preferNotToSay, value: null as never })}
        style={{ minHeight: hitSlop, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: value.preferNotToSay ? c.accent : c.textSubtle, backgroundColor: value.preferNotToSay ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {value.preferNotToSay ? <Text variant="caption" style={{ color: c.onPrimary }}>✓</Text> : null}
        </View>
        <Text>{t('common.preferNotToSay')}</Text>
      </Pressable>

      {!compact && !value.preferNotToSay ? (
        <Field label={t('jl.noteLabel')} hint={t('jl.noteHint')} value={value.note ?? ''} multiline maxLength={280} counter
          onChangeText={(v) => set({ note: v || undefined })} />
      ) : null}
    </View>
  );
}
