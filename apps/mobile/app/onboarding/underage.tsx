import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_AGE } from '@kapara/config';
import { space } from '@kapara/design';
import { deleteAccount, useAuthStatus } from '../../src/account';
import { meStore } from '../../src/me/store';
import { Button, Screen, Text } from '../../src/ui';

/**
 * Sign-up stopped: ZIV is for adults (18+). Nothing typed is kept: the
 * account being created is deleted on the server and the device forgets the
 * draft profile, birth date included. No ID check, no photo of a document.
 */
export default function Underage() {
  const { t } = useTranslation();
  const status = useAuthStatus();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');

  const clean = async () => {
    setState('working');
    meStore.set({ birthDate: undefined });
    try {
      if (status === 'signedIn') await deleteAccount();
      meStore.reset();
      setState('done');
    } catch { setState('error'); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (status !== 'loading') void clean(); }, [status === 'loading']);

  return (
    <Screen title={t('beta.underage.title')}
      footer={state === 'error'
        ? <Button label={t('beta.underage.retry')} onPress={() => void clean()} />
        : <Button label={t('beta.underage.back')} onPress={() => router.replace('/onboarding')} loading={state === 'working'} />}>
      <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
        <Text>{t('beta.underage.body', { min: MIN_AGE })}</Text>
        <Text tone="textMuted">{state === 'error' ? t('beta.underage.error') : t('beta.underage.nothingKept')}</Text>
      </View>
    </Screen>
  );
}
