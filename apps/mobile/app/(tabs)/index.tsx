import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useForYou, useSuggestionFeedback } from '../../src/api/hooks';
import { DEMO_MODE } from '../../src/api/client';
import { useHydrateMe } from '../../src/me/api';
import { useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Button, EmptyState, Progress, Screen, Text } from '../../src/ui';
import { ProfileCard, type ReactTarget } from '../../src/ui/ProfileCard';
import { ReactSheet } from '../../src/ui/ReactSheet';

/**
 * "Pour toi": a finite daily selection, one profile at a time, each with the
 * reasons it was suggested. No swipe: react to something specific, or pass.
 */
export default function ForYou() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const onboarded = useMe((s) => s.onboarded);
  const hydrate = useHydrateMe();
  const q = useForYou();
  const feedback = useSuggestionFeedback();
  const [i, setI] = useState(0);
  const [reacted, setReacted] = useState(0);
  const [target, setTarget] = useState<ReactTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!DEMO_MODE && hydrate.isLoading) return <Loading />;
  if (!DEMO_MODE && hydrate.isError) return (
    <Screen title={t('forYou.title')}>
      <EmptyState title={t('pick.errorTitle')} body={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void hydrate.refetch() }} />
    </Screen>
  );
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (q.isLoading) return <Loading />;
  if (q.isError) return (
    <Screen title={t('forYou.title')}>
      <EmptyState title={t('pick.errorTitle')} body={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
    </Screen>
  );

  const picks = q.data ?? [];
  const rec = picks[i];
  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const advance = (msg: string) => { setTarget(null); setNotice(msg); setI((x) => x + 1); };

  if (!picks.length) return (
    <Screen title={t('forYou.title')} subtitle={date}>
      <EmptyState title={t('pick.noneTitle')} body={t('pick.noneBody')} action={{ label: t('pick.completeProfile'), onPress: () => router.push('/profile/edit') }} />
    </Screen>
  );

  return (
    <Screen title={t('forYou.title')} subtitle={date}>
      <View style={{ gap: space.sm, marginBottom: space.lg }}>
        <Progress total={picks.length} current={i} />
        <Text variant="caption" tone="textSubtle" style={{ paddingHorizontal: space.xl }}>
          {rec ? t('pick.counter', { current: i + 1, total: picks.length }) : t('pick.counterDone', { total: picks.length })}
        </Text>
      </View>

      {notice ? (
        <Animated.View key={`n-${i}`} entering={FadeIn} exiting={FadeOut} style={{ marginHorizontal: space.xl, marginBottom: space.lg }} accessibilityLiveRegion="polite">
          <Text variant="label" tone="live">{notice}</Text>
        </Animated.View>
      ) : null}

      {rec ? (
        <Animated.View key={rec.profile.id} entering={FadeInDown.duration(420)}>
          <ProfileCard profile={rec.profile} reasons={rec.reasons} onReact={setTarget} />
          <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.sm }}>
            <Button kind="secondary" label={t('pick.pass')} accessibilityHint={t('pick.passHint')}
              onPress={() => { feedback.mutate({ subjectId: rec.profile.id, signal: 'not_for_me' }); advance(t('pick.passed')); }} />
            <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('pick.passFootnote')}</Text>
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(420)}>
          <EmptyState title={t('forYou.doneTitle')} body={reacted ? t('pick.doneReacted', { count: reacted }) : t('forYou.doneBody')} />
          <View style={{ paddingHorizontal: space.xl, gap: space.sm }}>
            <Button kind="secondary" label={t('pick.completeProfile')} onPress={() => router.push('/profile/edit')} />
          </View>
        </Animated.View>
      )}

      <ReactSheet profile={rec?.profile} target={target} onClose={() => setTarget(null)}
        onDone={(matched) => { setReacted((n) => n + 1); advance(matched ? t('pick.matched', { name: rec?.profile.firstName }) : t(DEMO_MODE ? 'pick.sentDemo' : 'pick.sent')); }} />
    </Screen>
  );

  function Loading() {
    return <Screen title={t('forYou.title')} subtitle={t('forYou.subtitle')}><ActivityIndicator color={c.accent} style={{ marginTop: space.xxxl }} accessibilityLabel={t('common.loading')} /></Screen>;
  }
}
