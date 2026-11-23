import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { signOut, useAccountInfo } from '../../src/account';
import { meStore, useMe } from '../../src/me/store';
import { Button, Progress, Screen, Text, useBasicsForm } from '../../src/ui';

export default function OnbBasics() {
  const { t } = useTranslation();
  const me = useMe();
  const form = useBasicsForm(me);
  const account = useAccountInfo();
  // Coming back with an account whose profile is unfinished: say who is signed in, and offer a way out.
  const provider = account ? t(`signin.provider.${account.provider ?? 'email'}`) : '';
  const leave = async () => { await signOut(); router.replace('/onboarding'); };
  return (
    <Screen back="back" title={t('onb.basicsTitle')} subtitle={t('onb.step', { n: 1, total: 4 })}
      footer={<Button label={t('onb.continue')} onPress={() => { form.touch(); if (form.value) { meStore.set(form.value); router.push('/onboarding/photos'); } }} />}>
      <View style={{ marginBottom: space.xl }}><Progress total={4} current={0} /></View>
      <View style={{ paddingHorizontal: space.xl, gap: space.xl }}>
        {account ? (
          <View style={{ gap: space.xs }}>
            <Text tone="textMuted">{t('onb.resumeAs', { provider, email: account.email ? ` (${account.email})` : '' })}</Text>
            <Button kind="ghost" label={t('onb.notYou')} onPress={() => void leave()} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : null}
        <Text tone="textMuted">{t('onb.basicsIntro')}</Text>
        {form.render()}
      </View>
    </Screen>
  );
}
