import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { hitSlop, radius, space } from '@kapara/design';
import { useForYou, useSuggestionFeedback } from '../../src/api/hooks';
import { DEMO_MODE } from '../../src/api/client';
import { CLOUD } from '../../src/cloud/client';
import { useHydrateMe } from '../../src/me/api';
import { cityOf } from '../../src/me/identity';
import { useMe } from '../../src/me/store';
import { canBrowseOtherCity, LIMITS } from '../../src/premium/plans';
import { browseStore, useBrowseRegion } from '../../src/me/browse';
import { openPaywall, usePlan } from '../../src/premium/store';
import { useTheme } from '../../src/theme';
import { Button, CityButton, CitySheet, EmptyState, Icon, Progress, Screen, Text, useLayout } from '../../src/ui';
import { ProfileCard } from '../../src/ui/ProfileCard';
import { PhotoViewer } from '../../src/ui/PhotoViewer';
import { ReactSheet, type ReactSheetTarget } from '../../src/ui/ReactSheet';

/**
 * "Pour toi": a finite daily selection, one profile at a time, each with the
 * reasons it was suggested. No swipe: react to something specific, or pass.
 */
export default function ForYou() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const onboarded = useMe((s) => s.onboarded);
  const browse = useBrowseRegion();
  const regionCode = browse.code;
  const plan = usePlan();
  const hydrate = useHydrateMe();
  const q = useForYou();
  const feedback = useSuggestionFeedback();
  const [i, setI] = useState(0);
  const [reacted, setReacted] = useState(0);
  const [target, setTarget] = useState<ReactSheetTarget | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  // A new city is a new selection: start again from its first profile.
  useEffect(() => { setI(0); setNotice(null); }, [regionCode]);
  // Another city is a paid feature: back home when the plan no longer includes it.
  useEffect(() => {
    if (browse.elsewhere && plan.data && !canBrowseOtherCity(plan.data.plan, plan.data.isAdmin)) browseStore.set(null);
  }, [browse.elsewhere, plan.data]);
  const [passed, setPassed] = useState<number | null>(null);
  const { isPhone, width } = useLayout();
  const narrow = width < 360; // 320 px phones: text only, so both labels fit

  if (!DEMO_MODE && hydrate.isLoading) return <Loading />;
  if (!DEMO_MODE && hydrate.isError) return (
    <Screen title={t('forYou.title')}>
      <EmptyState title={t('pick.errorTitle')} body={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void hydrate.refetch() }} />
    </Screen>
  );
  // Signed in but the profile isn't finished: carry on with it, don't start over.
  if (!onboarded) return <Redirect href="/onboarding/basics" />;
  if (q.isLoading) return <Loading />;
  if (q.isError) return (
    <Screen title={t('forYou.title')}>
      <EmptyState title={t('pick.errorTitle')} body={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
    </Screen>
  );

  // The database already sizes the selection to the plan; the local demo is cut here.
  const picks = (q.data ?? []).slice(0, plan.data?.limits.picksPerDay ?? 40);
  const free = plan.data?.plan === 'free';
  const rec = picks[i];
  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const advance = (msg: string) => { setTarget(null); setNotice(msg); setI((x) => x + 1); };
  // Going back to a profile one passed: Plus and Cercle.
  const rewind = () => {
    if (passed == null) return;
    if (!plan.data?.limits.rewind) { openPaywall('rewind'); return; }
    setI(passed); setPassed(null); setNotice(null);
  };

  if (!picks.length) return (
    <Screen title={t('forYou.title')} subtitle={date} right={<CityButton />}>
      <EmptyState title={t('city.emptyTitle', { city: cityOf(regionCode) })} body={t('city.emptyBody')} action={{ label: t('city.pickAnother'), onPress: () => setCityOpen(true) }} />
      <CitySheet visible={cityOpen} onClose={() => setCityOpen(false)} />
    </Screen>
  );

  const pass = () => { if (!rec) return; feedback.mutate({ subjectId: rec.profile.id, signal: 'not_for_me' }); setPassed(i); advance(t('pick.passed')); };
  const main = rec?.profile.photos[0];
  // The two decisions stay in reach at every width: pinned under the page.
  const actions = rec ? (
    <View style={{ gap: space.xs, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button kind="secondary" icon={narrow ? undefined : 'close'} label={t('pick.pass')} accessibilityHint={t('pick.passHint')} onPress={pass} style={{ flex: 1, paddingHorizontal: space.md }} />
        <Button kind="accent" icon={narrow ? undefined : 'heart'} label={t('ux.react')} accessibilityHint={t('ux.reactHint')} style={{ flex: 1, paddingHorizontal: space.md }}
          onPress={() => setTarget(rec.profile.prompts.length || main ? 'choose' : null)} />
      </View>
      {isPhone ? null : <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('pick.passFootnote')}</Text>}
    </View>
  ) : null;

  return (
    <Screen title={t('forYou.title')} subtitle={date} width="wide" footer={actions} right={<CityButton />}>
      {browse.elsewhere ? <Elsewhere city={cityOf(browse.code)} home={cityOf(browse.home)} /> : null}
      <View style={{ gap: space.sm, marginBottom: space.lg }}>
        <Progress total={picks.length} current={i} />
        <Text variant="caption" tone="textSubtle" style={{ paddingHorizontal: space.xl }}>
          {rec ? t('pick.counter', { current: i + 1, total: picks.length }) : t('pick.counterDone', { total: picks.length })}
          {DEMO_MODE && !CLOUD ? `  ·  ${t('ux.demoPicks')}` : ''}
        </Text>
      </View>

      {notice ? (
        <Animated.View key={`n-${i}`} entering={FadeIn} exiting={FadeOut} style={{ marginHorizontal: space.xl, marginBottom: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
          <Text variant="label" tone="live" style={{ flex: 1 }}>{notice}</Text>
          {passed != null && passed === i - 1 ? (
            <Pressable onPress={rewind} accessibilityRole="button" accessibilityLabel={t('premium.rewind')} style={{ minHeight: hitSlop, justifyContent: 'center' }}>
              <Text variant="label" style={{ textDecorationLine: 'underline' }}>{t('premium.rewind')}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {rec ? (
        <Animated.View key={rec.profile.id} entering={FadeInDown.duration(400)}>
          <ProfileCard profile={rec.profile} reasons={rec.reasons} onReact={setTarget} onOpenPhoto={setViewing} />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(420)}>
          <EmptyState title={t('forYou.doneTitle')} body={reacted ? t('pick.doneReacted', { count: reacted }) : t('forYou.doneBody')} />
          <View style={{ paddingHorizontal: space.xl, gap: space.sm }}>
            {free ? <Button label={t('premium.morePicks', { count: LIMITS.plus.picksPerDay })} onPress={() => openPaywall('picks')} /> : null}
            <Button kind="secondary" label={t('pick.completeProfile')} onPress={() => router.push('/profile/edit')} />
          </View>
        </Animated.View>
      )}

      <PhotoViewer profile={rec?.profile} index={viewing} onClose={() => setViewing(null)}
        onReact={(id) => { setViewing(null); setTarget({ kind: 'photo', id }); }} />
      <ReactSheet profile={rec?.profile} target={target} onClose={() => setTarget(null)}
        onDone={(matched) => { setReacted((n) => n + 1); advance(matched ? t('pick.matched', { name: rec?.profile.firstName }) : t(CLOUD ? (rec?.profile.isDemo ? 'cloud.sentToDemo' : 'pick.sent') : DEMO_MODE ? 'pick.sentDemo' : 'pick.sent')); }} />
    </Screen>
  );

  function Loading() {
    return <Screen title={t('forYou.title')} subtitle={t('forYou.subtitle')}><ActivityIndicator color={c.accent} style={{ marginTop: space.xxxl }} accessibilityLabel={t('common.loading')} /></Screen>;
  }
}

/** Looking at another city: say so, and the way back, in one quiet line. */
function Elsewhere({ city, home }: { city: string; home: string }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <View style={{ marginHorizontal: space.lg, marginBottom: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.md,
      backgroundColor: c.accentSoft, flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }} accessibilityLiveRegion="polite">
      <Text variant="caption" style={{ flex: 1, minWidth: 180 }}>{t('browse.elsewhere', { city, home })}</Text>
      <Pressable onPress={() => browseStore.set(null)} accessibilityRole="button" style={{ minHeight: hitSlop, justifyContent: 'center' }}>
        <Text variant="label" tone="accent" style={{ textDecorationLine: 'underline' }}>{t('browse.backHome', { city: home, home })}</Text>
      </Pressable>
    </View>
  );
}
