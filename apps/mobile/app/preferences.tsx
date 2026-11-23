import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { MATCHABLE_FIELDS, type MatchableField } from '@kapara/shared';
import { hitSlop, radius, space } from '@kapara/design';
import { DEMO_MODE } from '../src/api/client';
import { CLOUD } from '../src/cloud/client';
import {
  AGE_MAX, AGE_MIN, CRITERIA, DISTANCE_STEPS, GENDERS, criterionOf, samePrefs, useSavePreferences, usePreferences, withCriterion,
  type Criterion, type Prefs,
} from '../src/me/preferences';
import { useTheme } from '../src/theme';
import { Button, ChoiceList, Chips, CitySheet, EmptyState, Row, Screen, Section, Sheet, Text } from '../src/ui';
import { useBrowseRegion } from '../src/me/browse';
import { cityOf } from '../src/me/identity';
import { useMe } from '../src/me/store';

/**
 * "Mes préférences": who the member wants to meet. Hard limits (age,
 * distance, genders, mutual dealbreakers) and weighted soft preferences.
 * Only answers other members chose to share for matching are compared;
 * someone who hasn't answered is never excluded.
 */
export default function PreferencesScreen() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const q = usePreferences();
  const save = useSavePreferences();
  const [draft, setDraft] = useState<Prefs | null>(null);
  const [editing, setEditing] = useState<MatchableField | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const browse = useBrowseRegion();
  const languages = useMe((s) => s.languages);

  useEffect(() => { if (q.data && !draft) setDraft(q.data); }, [q.data, draft]);

  const dirty = !!draft && !!q.data && (q.data.isDefault || !samePrefs(draft, q.data));
  const valid = !!draft && draft.genders.length > 0 && draft.ageMin <= draft.ageMax;

  const leave = () => {
    if (!dirty) return router.back();
    Alert.alert(t('preferences.discardTitle'), t('preferences.discardBody'), [
      { text: t('ui.cancel'), style: 'cancel' },
      { text: t('preferences.discard'), style: 'destructive', onPress: () => router.back() },
    ]);
  };
  const submit = () => {
    if (!draft || !valid) return;
    save.mutate(draft, {
      onSuccess: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); },
      onError: () => Alert.alert(t('common.error'), t('errors.generic')),
    });
  };

  if (q.isLoading || (!draft && !q.isError)) {
    return <Screen back="back" title={t('preferences.title')}><ActivityIndicator style={{ marginTop: space.xxxl }} color={c.accent} /></Screen>;
  }
  if (q.isError || !draft) {
    return (
      <Screen back="back" title={t('preferences.title')}>
        <EmptyState title={t('errors.network')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
      </Screen>
    );
  }

  const set = (patch: Partial<Prefs>) => setDraft({ ...draft, ...patch });
  const intent = criterionOf(draft, 'relationshipIntent' as MatchableField);
  const toggleGender = (g: string) => set({ genders: draft.genders.includes(g as Prefs['genders'][number]) ? draft.genders.filter((x) => x !== g) : [...draft.genders, g as Prefs['genders'][number]] });

  return (
    <Screen
      title={t('preferences.title')}
      right={<Pressable onPress={leave} accessibilityRole="button" accessibilityLabel={t('ui.close')}
        style={{ minWidth: hitSlop, minHeight: hitSlop, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="heading" style={{ fontSize: 24 }}>×</Text>
      </Pressable>}
      footer={<>
        {!valid ? <Text variant="caption" style={{ color: c.danger }} accessibilityLiveRegion="polite">{t('preferences.gendersRequired')}</Text> : null}
        <Button label={t('common.save')} onPress={submit} loading={save.isPending} disabled={!dirty || !valid || save.isPending} />
      </>}
    >
      <View style={{ paddingHorizontal: space.xl, gap: space.md, marginBottom: space.xl }}>
        <Text tone="textMuted">{t('preferences.intro')}</Text>
        {DEMO_MODE && !CLOUD ? (
          <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: c.surfaceAlt }}>
            <Text variant="caption" tone="textMuted">{t('preferences.demoNotice')}</Text>
          </View>
        ) : null}
      </View>

      <Block title={t('preferences.cityBlock')} value={cityOf(browse.code)}>
        <Text variant="caption" tone="textMuted">{t('preferences.cityNote', { home: cityOf(browse.home) })}</Text>
        <Button kind="secondary" icon="pin" label={t('preferences.change')} onPress={() => setCityOpen(true)} style={{ alignSelf: 'flex-start' }} />
        <CitySheet visible={cityOpen} onClose={() => setCityOpen(false)} />
      </Block>

      <Block title={t('profile.seeking')}>
        <Chips label={t('profile.seeking')} values={draft.genders} onToggle={toggleGender}
          options={GENDERS.map((g) => ({ id: g, label: t(`profile.gender.${g}`) }))} />
      </Block>

      <Block title={t('preferences.age')} value={t('preferences.ageRange', { min: draft.ageMin, max: draft.ageMax })}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stepper label={t('preferences.ageFrom')} value={draft.ageMin} min={AGE_MIN} max={draft.ageMax} onChange={(ageMin) => set({ ageMin })} />
          <Stepper label={t('preferences.ageTo')} value={draft.ageMax} min={draft.ageMin} max={AGE_MAX} onChange={(ageMax) => set({ ageMax })} />
        </View>
      </Block>

      <Block title={t('preferences.distance')} value={t('preferences.distanceKm', { km: draft.maxDistanceKm })} hint={t('preferences.distanceHint')}>
        <Chips label={t('preferences.distance')} values={[String(draft.maxDistanceKm)]}
          onToggle={(id) => set({ maxDistanceKm: Number(id) })}
          options={DISTANCE_STEPS.map((km) => ({ id: String(km), label: t('preferences.km', { km }) }))} />
      </Block>

      {CRITERIA.includes('relationshipIntent' as MatchableField) ? (
        <Block title={t('preferences.intentBlock')}>
          <Text>{intent.mode === 'none' ? t('preferences.intentNone') : summary(t, 'relationshipIntent' as MatchableField, intent)}</Text>
          <Button kind="secondary" label={t('preferences.change')} onPress={() => setEditing('relationshipIntent' as MatchableField)} style={{ alignSelf: 'flex-start' }} />
        </Block>
      ) : null}

      <Block title={t('preferences.languagesBlock')}>
        <Text variant="caption" tone="textMuted">{t('preferences.languagesNote', { list: languages.map((l) => t(`lang.${l}`, { defaultValue: l })).join(', ') })}</Text>
        <Button kind="ghost" label={t('preferences.editLanguages')} onPress={() => router.push('/profile/basics')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      </Block>

      <View style={{ paddingHorizontal: space.xl, gap: space.xs, marginBottom: space.md }}>
        <Text variant="heading" accessibilityRole="header">{t('preferences.criteria')}</Text>
        <Text tone="textMuted">{t('preferences.criteriaIntro')}</Text>
      </View>
      <Section footnote={t('preferences.dealbreakersHint')}>
        {CRITERIA.map((key, i) => {
          const cr = criterionOf(draft, key);
          return (
            <Row key={key} first={i === 0} title={t(`jl.short.${key}`)} onPress={() => setEditing(key)}
              value={summary(t, key, cr)}
              trailing={cr.mode === 'dealbreaker' ? <Tag label={t('preferences.mode.dealbreaker')} strong /> : cr.mode === 'soft' ? <Tag label={t(`preferences.weight.${cr.weight}`)} /> : undefined} />
          );
        })}
      </Section>

      {editing ? (
        <CriterionSheet field={editing} initial={criterionOf(draft, editing)} onClose={() => setEditing(null)}
          onDone={(cr) => { setDraft(withCriterion(draft, editing, cr)); setEditing(null); }} />
      ) : null}
    </Screen>
  );
}

function summary(t: TFunction, key: MatchableField, cr: Criterion) {
  if (cr.mode === 'none') return t('preferences.mode.none');
  return cr.values.map((v) => t(`jl.options.${key}.${v}`)).join(', ');
}

function Block({ title, value, hint, children }: { title: string; value?: string; hint?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ marginHorizontal: space.lg, marginBottom: space.lg, padding: space.xl, gap: space.md, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md }}>
        <Text variant="overline" tone="textSubtle" accessibilityRole="header">{title}</Text>
        {value ? <Text variant="quote">{value}</Text> : null}
      </View>
      {children}
      {hint ? <Text variant="caption" tone="textSubtle">{hint}</Text> : null}
    </View>
  );
}

function Tag({ label, strong }: { label: string; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: strong ? c.text : c.accentSoft }}>
      <Text variant="caption" style={{ color: strong ? c.bg : c.text }}>{label}</Text>
    </View>
  );
}

/** −/+ control; exposed to screen readers as a single adjustable value. */
function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const { c } = useTheme();
  const step = (d: number) => { const n = Math.min(max, Math.max(min, value + d)); if (n !== value) { void Haptics.selectionAsync(); onChange(n); } };
  const btn = (d: number, glyph: string, disabled: boolean) => (
    <Pressable onPress={() => step(d)} disabled={disabled} accessibilityElementsHidden importantForAccessibility="no"
      style={({ pressed }) => ({ width: hitSlop, height: hitSlop, borderRadius: hitSlop / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? c.surfaceAlt : c.bg, borderWidth: 1, borderColor: c.border, opacity: disabled ? 0.35 : 1 })}>
      <Text variant="heading">{glyph}</Text>
    </Pressable>
  );
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ flex: 1, gap: space.sm }}>
      <Text variant="caption" tone="textMuted">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {btn(-1, '−', value <= min)}
        <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
        {btn(1, '+', value >= max)}
      </View>
    </View>
  );
}

function CriterionSheet({ field, initial, onClose, onDone }: { field: MatchableField; initial: Criterion; onClose: () => void; onDone: (c: Criterion) => void }) {
  const { t } = useTranslation();
  const [cr, setCr] = useState<Criterion>(initial);
  const options = MATCHABLE_FIELDS[field] as readonly string[];
  const toggle = (v: string) => setCr({ ...cr, values: cr.values.includes(v) ? cr.values.filter((x) => x !== v) : [...cr.values, v] });
  const needsValues = cr.mode !== 'none' && !cr.values.length;
  return (
    <Sheet visible onClose={onClose}>
      <Text variant="heading" accessibilityRole="header">{t(`jl.short.${field}`)}</Text>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: space.lg }}>
      <ChoiceList label={t(`jl.short.${field}`)} value={cr.mode} onChange={(mode) => setCr({ ...cr, mode: mode as Criterion['mode'] })}
        options={(['none', 'soft', 'dealbreaker'] as const).map((m) => ({ id: m, label: t(`preferences.mode.${m}`), hint: t(`preferences.modeHint.${m}`) }))} />
      {cr.mode !== 'none' ? (
        <View style={{ gap: space.md }}>
          <Text variant="label">{t(cr.mode === 'dealbreaker' ? 'preferences.valuesDealbreaker' : 'preferences.valuesSoft')}</Text>
          <Chips label={t(`jl.short.${field}`)} values={cr.values} onToggle={toggle}
            options={options.map((v) => ({ id: v, label: t(`jl.options.${field}.${v}`) }))} />
          {cr.mode === 'soft' ? (
            <>
              <Text variant="label">{t('preferences.importance')}</Text>
              <Chips label={t('preferences.importance')} values={[String(cr.weight)]} onToggle={(w) => setCr({ ...cr, weight: Number(w) as Criterion['weight'] })}
                options={([1, 2, 3] as const).map((w) => ({ id: String(w), label: t(`preferences.weight.${w}`) }))} />
            </>
          ) : <Text variant="caption" tone="textMuted">{t('preferences.dealbreakersHint')}</Text>}
        </View>
      ) : null}
      </ScrollView>
      <Button label={t('common.done')} disabled={needsValues} onPress={() => onDone(cr)} />
    </Sheet>
  );
}
