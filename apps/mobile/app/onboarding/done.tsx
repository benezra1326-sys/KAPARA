import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { ApiError } from '../../src/api/client';
import { useSaveMe } from '../../src/me/api';
import type { JLKey } from '../../src/me/fields';
import { meStore, useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Button, Icon, Text } from '../../src/ui';

export default function OnbDone() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const firstName = useMe((s) => s.firstName);
  const save = useSaveMe();
  // Then: today's selection, or first a look at one's own profile as others will see it.
  const go = (to: '/' | '/profile/preview') => {
    const s = meStore.get();
    save.mutate(
      { force: true, basics: true, grant: Object.keys(s.consents) as JLKey[], answers: s.jewishLife, photos: true },
      {
        onSuccess: () => { meStore.set({ onboarded: true }); router.replace('/'); if (to !== '/') router.push(to); },
        // The server applies the 18+ rule too (and has already deleted the account being created).
        onError: (e) => { if (e instanceof ApiError && e.code === 'adults_only') router.replace('/onboarding/underage'); },
      },
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.xl, justifyContent: 'space-between', width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <Animated.View entering={FadeInDown.duration(500)} style={{ gap: space.lg }}>
        <Icon name="sparkle" size={28} color={c.highlight} filled />
        <Text variant="hero" accessibilityRole="header">{t('onb.doneTitle', { name: firstName })}</Text>
        <Text tone="textMuted">{t('onb.doneBody')}</Text>
      </Animated.View>
      <View style={{ gap: space.sm }}>
        {save.isError ? <Text variant="caption" style={{ color: c.danger }}>{t('edit.saveError')}</Text> : null}
        <Button label={t('onb.doneCta')} onPress={() => go('/')} loading={save.isPending} />
        <Button kind="ghost" label={t('onb.doneSeeProfile')} onPress={() => go('/profile/preview')} disabled={save.isPending} />
      </View>
    </View>
  );
}
