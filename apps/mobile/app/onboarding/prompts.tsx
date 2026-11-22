import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MAX_PROMPTS } from '../../src/me/fields';
import { space } from '@kapara/design';
import { useMe } from '../../src/me/store';
import { Button, Progress, Row, Screen, Section, Text } from '../../src/ui';

/** Conversation starters. Encouraged, never required. Reuses the profile prompt editor. */
export default function OnbPrompts() {
  const { t } = useTranslation();
  const prompts = useMe((s) => s.prompts);
  return (
    <Screen back="back" title={t('onb.promptsTitle')} subtitle={t('onb.step', { n: 3, total: 3 })} footer={
      <Button kind={prompts.length ? 'primary' : 'secondary'} label={prompts.length ? t('onb.continue') : t('onb.promptsLater')} onPress={() => router.push('/onboarding/done')} />
    }>
      <View style={{ marginBottom: space.xl }}><Progress total={3} current={2} /></View>
      <View style={{ paddingHorizontal: space.xl, marginBottom: space.xl }}><Text tone="textMuted">{t('onb.promptsIntro')}</Text></View>
      <Section footnote={t('edit.promptsFootnote', { max: MAX_PROMPTS })}>
        {prompts.map((p, i) => (
          <Row key={p.id} first={i === 0} title={t(`prompts.${p.id}`)} value={p.answer} onPress={() => router.push({ pathname: '/profile/prompt', params: { slot: String(i) } })} />
        ))}
        {prompts.length < MAX_PROMPTS ? <Row first={!prompts.length} title={t('edit.addPrompt')} onPress={() => router.push('/profile/prompt')} trailing={<Text tone="accent">＋</Text>} /> : null}
      </Section>
    </Screen>
  );
}
