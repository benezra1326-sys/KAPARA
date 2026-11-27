import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { Button, Text } from '../ui';
import { CLOUD } from './client';
import { retrySave, useSaveState } from './account';

/** Saving / saved / failed + retry, for the member's own profile (test backend). */
export function SaveStatus() {
  const { t } = useTranslation();
  const s = useSaveState();
  useEffect(() => { if (s === 'adults_only') router.replace('/onboarding/underage'); }, [s]);
  if (!CLOUD || s === 'idle' || s === 'adults_only') return null;
  if (s === 'error') {
    return (
      <View accessibilityLiveRegion="polite" style={{ marginHorizontal: space.xl, marginBottom: space.md, gap: space.xs }}>
        <Text tone="danger">{t('beta.save.failedBody')}</Text>
        <Button kind="secondary" label={t('beta.save.retry')} onPress={() => void retrySave()} />
      </View>
    );
  }
  return (
    <Text tone="textMuted" accessibilityLiveRegion="polite" style={{ marginHorizontal: space.xl, marginBottom: space.md }}>
      {t(s === 'saving' ? 'beta.save.saving' : 'beta.save.saved')}
    </Text>
  );
}
