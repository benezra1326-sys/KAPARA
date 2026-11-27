import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REGIONS } from '@kapara/config';
import type { CallSnapshot, LiveMember, LiveSearchFilters } from '@kapara/shared';
import { radius, shadow, space } from '@kapara/design';
import { Icon } from '../../src/live/icons';
import { useLive, useLiveStore } from '../../src/live/LiveProvider';
import { Pulse } from '../../src/live/Pulse';
import { formatDuration, useNow } from '../../src/live/useNow';
import { liveFiltersUpsell } from '../../src/live/quota';
import { LIVE_MAX_RINGING } from '../../src/live/store';
import { useTheme } from '../../src/theme';
import { Button, DemoBadge, EmptyState, Screen, Text } from '../../src/ui';
import { photoSource } from '../../src/demo/images';
import { openPaywall } from '../../src/premium/store';
import { imageFade } from '../../src/ui/imageFade';
import { cityOf } from '../../src/me/identity';

/**
 * Live: profiles present now are proposed; the member chooses who to call in
 * video. Up to five calls ring at once; the first one who answers takes the
 * call, the others stop, and a call without an answer frees its place.
 * Free: anyone, anywhere (gender sought always respected). Paid plans choose gender and city.
 * Consents stay separate: each person answers, and may keep the camera off.
 */
export default function Live() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const store = useLiveStore();
  const s = useLive();
  const now = useNow(2_000);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => { setRefreshing(true); await store.refresh(); setRefreshing(false); }, [store]);
  const enabled = s.settings?.liveEnabled === true;
  const searching = s.search.status === 'searching';

  useEffect(() => { if (enabled) void store.loadFiltersAllowed(); }, [enabled, store]);
  // Someone said yes: open the call.
  useEffect(() => {
    if (!s.searchMatch) return;
    router.push({ pathname: '/call/[id]', params: { id: s.searchMatch } });
    store.clearSearchMatch();
  }, [s.searchMatch, router, store]);
  // On Live: fresh profiles. Leaving Live stops the calls still ringing.
  useFocusEffect(useCallback(() => {
    if (store.get().settings?.liveEnabled) void store.loadSuggestions();
    return () => { if (store.get().search.status === 'searching' && !store.get().call) void store.cancelAllCalls(); };
  }, [store]));

  const errorNotice = (
    <Pressable onPress={() => store.clearError()} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Notice tone={s.error === 'live_soon' ? 'highlight' : 'danger'} text={t(`live.errors.${s.error}`, { defaultValue: t('live.errors.unknown') })} />
    </Pressable>
  );

  return (
    <Screen title={t('live.title')} subtitle={t('liveChoose.subtitle')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}>
      {/* Real build: calls between real members are real, so the demo notice is only for fictional profiles. */}
      {s.local ? (
        <Notice tone="highlight" text={s.local ? t('live.demoLocalNotice') : t('live.demoNotice')} />
      ) : null}
      {s.connection === 'offline' && !s.local ? <Notice tone="danger" text={t('live.offline')} /> : null}

      {s.mode === 'disabled' ? (
        // Production without a media server: Live is off, said plainly, never simulated.
        <EmptyState title={t('beta.live.offTitle')} body={t('beta.live.offBody')} />
      ) : !s.settings ? (
        s.settingsError
          ? <EmptyState title={t('live.offline')} action={{ label: t('common.retry'), onPress: () => void store.refresh() }} />
          : <ActivityIndicator color={c.accent} style={{ marginTop: space.xxl }} accessibilityLabel={t('common.loading')} />
      ) : !enabled ? (
        <Intro onEnable={() => void store.saveSettings({ ...s.settings!, liveEnabled: true })} onSettings={() => router.push('/settings/live')} />
      ) : (
        <View style={{ gap: space.lg }}>
          <ProfilesStage members={s.suggestions} status={s.suggestionsStatus} pending={s.search.pending} busy={!!s.call}
            onCall={(m) => void store.callMember(m)} onCancel={(id) => void store.cancelCall(id)}
            onCancelAll={() => void store.cancelAllCalls()} onMore={() => void store.loadSuggestions()} />
          {/* Right under the profiles, so the answer to a call is on screen. */}
          {s.error && !s.call ? errorNotice : null}
          <Filters allowed={s.filtersAllowed === true} value={s.search.filters} onChange={(f) => store.setFilters(f)} />
        </View>
      )}

      {s.lastEnded ? (
        <Pressable onPress={() => store.clearEnded()} accessibilityRole="button" accessibilityHint={t('call.close')}>
          <Notice tone="muted" text={t(`live.lastCall.${s.lastEnded.state}`, { name: s.lastEnded.peer.firstName, duration: formatDuration(s.lastEnded.durationSec) })} />
        </Pressable>
      ) : null}
      {s.error && !s.call && !enabled ? errorNotice : null}

      {s.local && enabled ? (
        <View style={{ paddingHorizontal: space.xl, marginTop: space.xl }}>
          <Button kind="ghost" label={t('live.demoIncoming')} onPress={() => store.simulateIncoming()} disabled={!!s.call || searching} />
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * Who is in Live now: a few proposed profiles. I choose who to call (video);
 * up to five calls can ring at once, the first one who answers takes the call.
 */
function ProfilesStage({ members, status, pending, busy, onCall, onCancel, onCancelAll, onMore }: {
  members: LiveMember[]; status: 'idle' | 'loading' | 'ready' | 'error'; pending: CallSnapshot[]; busy: boolean;
  onCall: (m: LiveMember) => void; onCancel: (callId: string) => void; onCancelAll: () => void; onMore: () => void;
}) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const ringingBy = new Map(pending.map((p) => [p.peer.userId, p.callId]));
  const full = pending.length >= LIVE_MAX_RINGING;
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ marginHorizontal: space.lg, gap: space.xs }}>
        <Text variant="heading">{t('liveChoose.title')}</Text>
        <Text tone="textMuted">{t('liveChoose.body', { count: LIVE_MAX_RINGING })}</Text>
      </View>

      {pending.length ? (
        <View style={{ marginHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
          <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Pulse color={c.live} size={20} active />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.live }} />
          </View>
          <Text variant="label" style={{ flex: 1 }}>{t('liveChoose.ringing', { count: pending.length, max: LIVE_MAX_RINGING })}</Text>
          <Pressable onPress={onCancelAll} accessibilityRole="button" hitSlop={12} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Text variant="label" tone="accent">{t('liveChoose.stopAll')}</Text>
          </Pressable>
        </View>
      ) : null}

      {status === 'loading' && !members.length ? (
        <ActivityIndicator color={c.accent} style={{ marginVertical: space.xl }} accessibilityLabel={t('common.loading')} />
      ) : !members.length ? (
        <EmptyState title={t('liveChoose.emptyTitle')} body={t('liveChoose.emptyBody')} action={{ label: t('liveChoose.more'), onPress: onMore }} />
      ) : (
        <View accessibilityRole="list" style={{ paddingHorizontal: space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {members.map((m) => {
            const callId = ringingBy.get(m.userId);
            return <ProfileCard key={m.userId} m={m} ringing={!!callId} disabled={busy || (!callId && full)}
              onCall={() => onCall(m)} onCancel={() => callId && onCancel(callId)} />;
          })}
        </View>
      )}

      {members.length ? (
        <View style={{ alignItems: 'center' }}>
          <Button kind="ghost" label={t('liveChoose.more')} onPress={onMore} />
        </View>
      ) : null}
    </View>
  );
}

function ProfileCard({ m, ringing, disabled, onCall, onCancel }: { m: LiveMember; ringing: boolean; disabled: boolean; onCall: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const city = m.regionCode ? cityOf(m.regionCode) : null;
  return (
    <View style={[{ flexGrow: 1, flexBasis: '45%', maxWidth: 260, borderRadius: radius.lg, backgroundColor: c.surface, overflow: 'hidden' }, shadow.card]}>
      <View style={{ aspectRatio: 4 / 5, backgroundColor: c.surfaceAlt }}>
        {m.photoUrl ? (
          <Image source={photoSource(m.photoUrl)} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" transition={imageFade(250)}
            accessibilityLabel={m.firstName} />
        ) : null}
        <View style={{ position: 'absolute', top: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs,
          paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.live }} />
          <Text variant="caption" style={{ color: '#fff' }}>{t('liveChoose.online')}</Text>
        </View>
      </View>
      <View style={{ padding: space.md, gap: space.xs }}>
        <Text variant="bodyStrong" numberOfLines={1}>{`${m.firstName}, ${m.age}`}</Text>
        {city ? <Text variant="caption" tone="textMuted" numberOfLines={1}>{city}</Text> : null}
        {m.isDemo ? <DemoBadge compact /> : null}
        {ringing ? (
          <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={`${t('liveChoose.cancel')} : ${m.firstName}`}
            style={({ pressed }) => ({ minHeight: 48, marginTop: space.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: c.live,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: pressed ? c.surfaceAlt : 'transparent' })}>
            <ActivityIndicator color={c.live} size="small" />
            <Text variant="label">{t('liveChoose.ringingOne')}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onCall} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${t('liveChoose.call')} : ${m.firstName}`}
            accessibilityHint={m.isDemo ? t('liveChoose.demoHint') : t('live.inviteHint')} accessibilityState={{ disabled }}
            style={({ pressed }) => ({ minHeight: 48, marginTop: space.xs, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
              backgroundColor: pressed ? c.accentPressed : c.accent, opacity: disabled ? 0.45 : 1 })}>
            <Icon name="video" size={18} color={c.onAccent} />
            <Text variant="label" style={{ color: c.onAccent }}>{t('liveChoose.call')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const GENDERS = ['woman', 'man', 'nonbinary'] as const;

/** Who I am looking for. Paid plans only; otherwise shown locked with one line of explanation. */
function Filters({ allowed, value, onChange }: { allowed: boolean; value: LiveSearchFilters; onChange: (f: LiveSearchFilters) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const upsell = () => {
    const open = liveFiltersUpsell();
    if (open) open(); else Alert.alert(t('liveRandom.filtersLocked'), t('liveRandom.filtersLockedBody'));
  };
  const chip = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable key={key} onPress={allowed ? onPress : upsell} accessibilityRole="button" accessibilityState={{ selected, disabled: !allowed && !selected }}
      style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: space.xs,
        borderWidth: 1, borderColor: selected ? c.text : c.border, backgroundColor: selected ? c.text : pressed ? c.surfaceAlt : 'transparent',
        opacity: !allowed && !selected ? 0.55 : 1 })}>
      {!allowed && !selected ? <Icon name="lock" size={14} color={c.textMuted} /> : null}
      <Text variant="label" style={{ color: selected ? c.bg : c.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: space.md }}>
      <View style={{ paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text variant="overline" tone="textSubtle" style={{ flex: 1 }}>{t('liveRandom.filtersTitle')}</Text>
        {!allowed ? (
          <Pressable onPress={upsell} accessibilityRole="button" hitSlop={12}>
            <Text variant="caption" tone="accent">{t('liveRandom.filtersLocked')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text variant="label" tone="textMuted" style={{ paddingHorizontal: space.xl }}>{t('liveRandom.gender')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {chip('any', t('liveRandom.anyGender'), !value.gender, () => onChange({ ...value, gender: undefined }))}
        {GENDERS.map((g) => chip(g, t(`liveRandom.genders.${g}`), value.gender === g, () => onChange({ ...value, gender: g })))}
      </ScrollView>
      <Text variant="label" tone="textMuted" style={{ paddingHorizontal: space.xl }}>{t('liveRandom.city')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {chip('world', t('liveRandom.anyCity'), !value.regionCode, () => onChange({ ...value, regionCode: undefined }))}
        {REGIONS.map((r) => chip(r.code, cityOf(r.code), value.regionCode === r.code, () => onChange({ ...value, regionCode: r.code })))}
      </ScrollView>
    </View>
  );
}

/**
 * Compact intro: what Live is in one line, the three consent steps as
 * small chips, then the one action. Details live in Live settings.
 */
function Intro({ onEnable, onSettings }: { onEnable: () => void; onSettings: () => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const steps: { label: string; icon: 'phone' | 'audio' | 'video' }[] = [
    { label: t('live.steps.invite'), icon: 'phone' }, { label: t('live.steps.accept'), icon: 'audio' }, { label: t('live.steps.camera'), icon: 'video' },
  ];
  return (
    <View style={[{ marginHorizontal: space.lg, padding: space.xl, borderRadius: radius.xl, backgroundColor: c.surface, gap: space.lg }, shadow.card]}>
      <View style={{ gap: space.xs }}>
        <Text variant="heading">{t('live.introTitle')}</Text>
        <Text tone="textMuted">{t('ux.liveIntroShort')}</Text>
      </View>
      <View accessibilityRole="list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {steps.map((s, i) => (
          <View key={s.label} accessibilityLabel={`${i + 1}. ${s.label}`}
            style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: c.surfaceAlt }}>
            <Icon name={s.icon} size={16} color={c.textMuted} />
            <Text variant="caption" style={{ flexShrink: 1 }}>{`${i + 1}. ${s.label}`}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Button label={t('live.enable')} onPress={onEnable} style={{ flexGrow: 1 }} />
        <Button kind="secondary" icon="settings" label={t('live.settingsLink')} onPress={onSettings} style={{ flexGrow: 1 }} />
      </View>
    </View>
  );
}

function Notice({ text, tone }: { text: string; tone: 'highlight' | 'danger' | 'muted' }) {
  const { c } = useTheme();
  const bg = tone === 'highlight' ? c.accentSoft : tone === 'danger' ? c.surfaceAlt : c.surfaceAlt;
  return (
    <View style={{ marginHorizontal: space.lg, marginBottom: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: bg,
      borderLeftWidth: 3, borderLeftColor: tone === 'highlight' ? c.highlight : tone === 'danger' ? c.danger : c.border }}>
      <Text variant="caption" tone={tone === 'highlight' ? 'text' : 'textMuted'}>{text}</Text>
    </View>
  );
}
