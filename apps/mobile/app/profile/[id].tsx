import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { DEMO_MODE } from '../../src/api/client';
import { useProfile } from '../../src/api/hooks';
import { useTheme } from '../../src/theme';
import { EmptyState, Screen, Text } from '../../src/ui';
import { ProfileCard, type ReactTarget } from '../../src/ui/ProfileCard';
import { ReactSheet } from '../../src/ui/ReactSheet';

/** Full profile, opened from Croisés, Live, messages or an introduction. */
export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const q = useProfile(id);
  const [target, setTarget] = useState<ReactTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (q.isLoading) return <Screen back="close"><ActivityIndicator color={c.accent} style={{ marginTop: space.xxxl }} accessibilityLabel={t('common.loading')} /></Screen>;
  if (q.isError) return <Screen back="close"><EmptyState title={t('pick.errorTitle')} body={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} /></Screen>;
  const p = q.data;
  if (!p) return <Screen back="close"><EmptyState title={t('profile.notFound')} body={t('profile.notFoundBody')} /></Screen>;

  return (
    <Screen back="close" width="wide">
      {notice ? <View style={{ marginHorizontal: space.xl, marginBottom: space.lg }} accessibilityLiveRegion="polite"><Text variant="label" tone="live">{notice}</Text></View> : null}
      <ProfileCard profile={p} onReact={setTarget} />
      <ReactSheet profile={p} target={target} onClose={() => setTarget(null)}
        onDone={(matched) => { setTarget(null); setNotice(matched ? t('pick.matched', { name: p.firstName }) : t(DEMO_MODE ? 'pick.sentDemo' : 'pick.sent')); }} />
    </Screen>
  );
}
