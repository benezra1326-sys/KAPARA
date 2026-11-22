import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { uploadsPending } from '../../src/me/photos';
import { useMe } from '../../src/me/store';
import { Button, PhotoGrid, Progress, Screen, Section, Text } from '../../src/ui';

/** Photos: encouraged, not forced. Without one, the profile is simply not suggested yet. */
export default function OnbPhotos() {
  const { t } = useTranslation();
  const photos = useMe((s) => s.photos);
  const ready = photos.filter((p) => !p.status).length;
  const busy = uploadsPending(photos);
  return (
    <Screen back="back" title={t('photos.onbTitle')} subtitle={t('onb.step', { n: 2, total: 4 })} footer={
      <View style={{ gap: space.sm }}>
        {!ready && !busy ? <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('photos.noneYet')}</Text> : null}
        <Button kind={ready ? 'primary' : 'secondary'} disabled={busy} loading={busy}
          label={busy ? t('photos.uploading') : ready ? t('onb.continue') : t('onb.jlLater')}
          onPress={() => router.push('/onboarding/jewish')} />
      </View>
    }>
      <View style={{ marginBottom: space.xl }}><Progress total={4} current={1} /></View>
      <View style={{ paddingHorizontal: space.xl, marginBottom: space.xl }}><Text tone="textMuted">{t('photos.onbIntro')}</Text></View>
      <Section><PhotoGrid /></Section>
    </Screen>
  );
}
