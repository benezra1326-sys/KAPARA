import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { DEMO_MODE } from '../../src/api/client';
import { CLOUD } from '../../src/cloud/client';
import { useProfile } from '../../src/api/hooks';
import { useMe } from '../../src/me/store';
import { useLikesInbox } from '../../src/premium/store';
import { likedItem } from '../../src/social/liked';
import { useTheme } from '../../src/theme';
import { LikedItemQuote } from '../../src/ui/LikedItem';
import { Button, EmptyState, Screen, Text } from '../../src/ui';
import { ProfileCard } from '../../src/ui/ProfileCard';
import { PhotoViewer } from '../../src/ui/PhotoViewer';
import { ReactSheet, type ReactSheetTarget } from '../../src/ui/ReactSheet';

/** Full profile, opened from Croisés, Live, messages or an introduction. */
export default function Profile() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const q = useProfile(id);
  const [target, setTarget] = useState<ReactSheetTarget | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Opened from "Who noticed you": what this person liked of mine, quoted on top.
  const inbox = useLikesInbox();
  const me = useMe();
  const theirLike = from === 'like' ? inbox.data?.items.find((it) => it.from.id === id) : undefined;

  if (q.isLoading) return <Screen back="close"><ActivityIndicator color={c.accent} style={{ marginTop: space.xxxl }} accessibilityLabel={t('common.loading')} /></Screen>;
  if (q.isError) return <Screen back="close"><EmptyState title={t('pick.errorTitle')} body={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} /></Screen>;
  const p = q.data;
  if (!p) return <Screen back="close"><EmptyState title={t('profile.notFound')} body={t('profile.notFoundBody')} /></Screen>;

  return (
    <Screen back="close" width="wide">
      {notice ? <View style={{ marginHorizontal: space.xl, marginBottom: space.lg }} accessibilityLiveRegion="polite"><Text variant="label" tone="live">{notice}</Text></View> : null}
      {theirLike && !notice ? (
        <View style={{ marginHorizontal: space.lg, marginBottom: space.lg, padding: space.lg, gap: space.md, borderRadius: radius.lg, backgroundColor: c.accentSoft }}>
          <LikedItemQuote mine item={likedItem(theirLike.target, me)} comment={theirLike.comment}
            label={theirLike.target?.kind === 'photo' ? t('liked.nameLikedPhoto', { name: p.firstName }) : theirLike.target?.kind === 'prompt' ? t('liked.nameLikedAnswer', { name: p.firstName }) : t('liked.nameLikedYou', { name: p.firstName })} />
          <Text variant="caption" tone="textMuted">{t('liked.likeBackHint', { name: p.firstName })}</Text>
        </View>
      ) : null}
      <ProfileCard profile={p} onReact={setTarget} onOpenPhoto={setViewing} />
      <PhotoViewer profile={p} index={viewing} onClose={() => setViewing(null)}
        onReact={(photoId) => { setViewing(null); setTarget({ kind: 'photo', id: photoId }); }} />
      <ReactSheet profile={p} target={target} onClose={() => setTarget(null)}
        onDone={(matched) => { setTarget(null); setNotice(matched ? t('pick.matched', { name: p.firstName }) : t(CLOUD ? (p.isDemo ? 'cloud.sentToDemo' : 'pick.sent') : DEMO_MODE ? 'pick.sentDemo' : 'pick.sent')); }} />
      {p.id !== 'me' ? (
        <View style={{ alignItems: 'center', marginVertical: space.xl }}>
          <Button kind="ghost" label={t('beta.report.profile', { name: p.firstName })}
            onPress={() => router.push({ pathname: '/safety/report', params: { userId: p.id, name: p.firstName, context: 'profile' } })} />
        </View>
      ) : null}
    </Screen>
  );
}
