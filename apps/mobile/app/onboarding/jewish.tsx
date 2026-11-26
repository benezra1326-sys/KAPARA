import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { Visibility } from '@kapara/shared';
import { space } from '@kapara/design';
import { answerLabel, fieldMeta, ONBOARDING_FIELDS, type JLKey } from '../../src/me/fields';
import { emptyField, meStore, storesData, type SensitiveField } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Button, ConsentSheet, Progress, SkipToEnd, Row, Screen, Section, SensitiveQuestion, SwitchRow, Text, VisibilityPicker, Icon } from '../../src/ui';

type Phase = { kind: 'intro' } | { kind: 'question'; i: number } | { kind: 'share' };

/**
 * Jewish life, optional from start to finish: an explanation, a few questions
 * one at a time (each skippable), then an explicit choice of who sees them.
 * Everything stays private unless the member consents on the last step.
 */
export default function OnbJewish() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [answers, setAnswers] = useState<Partial<Record<JLKey, SensitiveField>>>({});
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [matching, setMatching] = useState(false);
  const [asking, setAsking] = useState(false);

  const answeredKeys = ONBOARDING_FIELDS.filter((k) => { const a = answers[k]; return !!a && storesData(a); });
  const finish = (consent: boolean) => {
    for (const k of ONBOARDING_FIELDS) {
      const a = answers[k];
      if (!a) continue;
      const open = consent && answeredKeys.includes(k);
      meStore.setField(k, { ...a, visibility: open ? visibility : 'private', useForMatching: open ? matching : false }, open);
    }
    router.push('/onboarding/prompts');
  };

  if (phase.kind === 'intro') return (
    <Screen back="back" title={t('jewishLife.sectionTitle')} subtitle={t('onb.step', { n: 3, total: 4 })} right={<SkipToEnd />} footer={
      <>
        <Button label={t('onb.jlAnswer')} onPress={() => setPhase({ kind: 'question', i: 0 })} />
        <Button kind="ghost" label={t('onb.jlLater')} onPress={() => router.push('/onboarding/prompts')} />
      </>
    }>
      <View style={{ marginBottom: space.xl }}><Progress total={4} current={2} /></View>
      <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
        <Text variant="quote">{t('onb.jlLead')}</Text>
        {(['optional', 'private', 'consent', 'never'] as const).map((k) => (
          <View key={k} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ paddingTop: 4 }}><Icon name="sparkle" size={14} color={c.highlight} filled /></View>
            <Text tone="textMuted" style={{ flex: 1 }}>{t(`onb.jlPoints.${k}`)}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );

  if (phase.kind === 'question') {
    const key = ONBOARDING_FIELDS[phase.i]!;
    const meta = fieldMeta(key)!;
    const value = answers[key] ?? emptyField();
    const next = () => setPhase(phase.i + 1 < ONBOARDING_FIELDS.length ? { kind: 'question', i: phase.i + 1 } : { kind: 'share' });
    return (
      <Screen back="back" subtitle={t('onb.questionN', { n: phase.i + 1, total: ONBOARDING_FIELDS.length })} title=" " footer={
        <>
          <Button label={t('onb.continue')} onPress={next} />
          <Button kind="ghost" label={t('onb.skipQuestion')} onPress={() => { setAnswers((a) => { const { [key]: _, ...rest } = a; return rest; }); next(); }} />
        </>
      }>
        <View style={{ marginBottom: space.xl }}><Progress total={ONBOARDING_FIELDS.length} current={phase.i} /></View>
        <Animated.View key={key} entering={FadeInRight.duration(280)} style={{ paddingHorizontal: space.xl }}>
          <SensitiveQuestion compact meta={meta} value={value} onChange={(f) => setAnswers((a) => ({ ...a, [key]: f }))} />
        </Animated.View>
      </Screen>
    );
  }

  // share: storing any answer needs explicit consent; who sees it is a separate choice.
  return (
    <Screen back="back" title={t('onb.shareTitle')} subtitle={t('onb.step', { n: 3, total: 4 })} footer={
      <>
        <Button label={t('onb.continue')} onPress={() => (answeredKeys.length ? setAsking(true) : finish(false))} />
        {answeredKeys.length ? <Button kind="ghost" label={t('onb.discard')} onPress={() => finish(false)} /> : null}
      </>
    }>
      <View style={{ paddingHorizontal: space.xl, marginBottom: space.xl }}>
        <Text tone="textMuted">{answeredKeys.length ? t('onb.shareIntro') : t('onb.shareNone')}</Text>
      </View>
      {answeredKeys.length ? (
        <>
          <Section title={t('onb.yourAnswers')}>
            {answeredKeys.map((k, i) => <Row key={k} first={i === 0} title={t(`jl.short.${k}`)} value={answerLabel(t, fieldMeta(k)!, answers[k])} />)}
          </Section>
          <Section title={t('vis.sectionTitle')} footnote={t('onb.shareFootnote')}>
            <View style={{ padding: space.lg, gap: space.md }}>
              <VisibilityPicker value={visibility} onChange={setVisibility} />
              <Text variant="caption" tone="textSubtle">{t(`vis.${visibility}Hint`)}</Text>
            </View>
            <SwitchRow title={t('jewishLife.useForMatching')} description={t('vis.matchingHint')} value={matching} onValueChange={setMatching} />
          </Section>
        </>
      ) : null}
      <ConsentSheet visible={asking} subject={t('onb.theseAnswers')} visibility={visibility} useForMatching={matching}
        onAccept={() => { setAsking(false); finish(true); }}
        onDecline={() => setAsking(false)} />
    </Screen>
  );
}
