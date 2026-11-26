import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REGIONS } from '@kapara/config';
import type { CallSnapshot, LiveSearchFilters } from '@kapara/shared';
import { radius, shadow, space } from '@kapara/design';
import { Icon } from '../../src/live/icons';
import { useLive, useLiveStore } from '../../src/live/LiveProvider';
import { Pulse } from '../../src/live/Pulse';
import { formatDuration, useNow } from '../../src/live/useNow';
import { liveFiltersUpsell } from '../../src/live/quota';
import { LIVE_PARALLEL_REQUESTS } from '../../src/live/store';
import { useTheme } from '../../src/theme';
import { Button, DemoBadge, EmptyState, Screen, Text } from '../../src/ui';
import { photoSource } from '../../src/demo/images';
import { openPaywall } from '../../src/premium/store';
import { imageFade } from '../../src/ui/imageFade';

/**
 * Live, Azar-style: no list of who is online. The member starts a search and
 * the app sends a few video requests at once to random members present in
 * Live; the first one who accepts starts the call, a "no" sends another one.
 * Free: anyone, anywhere. Paid plans choose gender and city.
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
  // Leaving Live while searching stops the requests.
  useFocusEffect(useCallback(() => () => { if (store.get().search.status === 'searching') void store.stopSearch(); }, [store]));

  const nobodyForAWhile = searching && !s.search.demo && s.search.emptySince !== null && now - s.search.emptySince > 6_000;

  return (
    <Screen title={t('live.title')} subtitle={t('liveRandom.subtitle')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}>
      {s.mode === 'demo' ? (
        <Notice tone="highlight" text={s.local ? t('live.demoLocalNotice') : t('live.demoNotice')} />
      ) : null}
      {s.connection === 'offline' && !s.local ? <Notice tone="danger" text={t('live.offline')} /> : null}

      {!s.settings ? (
        s.settingsError
          ? <EmptyState title={t('live.offline')} action={{ label: t('common.retry'), onPress: () => void store.refresh() }} />
          : <ActivityIndicator color={c.accent} style={{ marginTop: space.xxl }} accessibilityLabel={t('common.loading')} />
      ) : !enabled ? (
        <Intro onEnable={() => void store.saveSettings({ ...s.settings!, liveEnabled: true })} onSettings={() => router.push('/settings/live')} />
      ) : (
        <View style={{ gap: space.lg }}>
          <SearchStage pending={s.search.pending} searching={searching} demo={s.search.demo}
            onStart={() => void store.startSearch(false)} onStop={() => void store.stopSearch()} disabled={!!s.call} />
          {nobodyForAWhile ? (
            <View style={{ marginHorizontal: space.lg, gap: space.sm, alignItems: 'center' }}>
              <Text variant="caption" tone="textMuted" style={{ textAlign: 'center' }}>{t('liveRandom.nobody')}</Text>
              <Button kind="ghost" label={t('liveRandom.tryDemo')} onPress={() => void store.startSearch(true)} />
            </View>
          ) : null}
          <Filters allowed={s.filtersAllowed === true} value={s.search.filters} onChange={(f) => store.setFilters(f)} />
        </View>
      )}

      {s.lastEnded ? (
        <Pressable onPress={() => store.clearEnded()} accessibilityRole="button" accessibilityHint={t('call.close')}>
          <Notice tone="muted" text={t(`live.lastCall.${s.lastEnded.state}`, { name: s.lastEnded.peer.firstName, duration: formatDuration(s.lastEnded.durationSec) })} />
        </Pressable>
      ) : null}
      {s.error && !s.call ? (
        <Pressable onPress={() => store.clearError()} accessibilityRole="alert">
          <Notice tone={s.error === 'live_soon' ? 'highlight' : 'danger'} text={t(`live.errors.${s.error}`, { defaultValue: t('live.errors.unknown') })} />
        </Pressable>
      ) : null}

      {s.local && enabled ? (
        <View style={{ paddingHorizontal: space.xl, marginTop: space.xl }}>
          <Button kind="ghost" label={t('live.demoIncoming')} onPress={() => store.simulateIncoming()} disabled={!!s.call || searching} />
        </View>
      ) : null}
    </Screen>
  );
}

/** The search: a calm card, one action. While searching, the people being called ring softly. */
function SearchStage({ pending, searching, demo, onStart, onStop, disabled }: {
  pending: CallSnapshot[]; searching: boolean; demo: boolean; onStart: () => void; onStop: () => void; disabled: boolean;
}) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const slots = Array.from({ length: LIVE_PARALLEL_REQUESTS }, (_, i) => pending[i] ?? null);
  return (
    <View style={[{ marginHorizontal: space.lg, paddingVertical: space.xxl, paddingHorizontal: space.xl, borderRadius: radius.xl, backgroundColor: c.surface, alignItems: 'center', gap: space.xl }, shadow.card]}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Text variant="overline" tone="textSubtle">{searching ? t('liveRandom.searching') : t('liveRandom.overline')}</Text>
        <Text variant="title" style={{ textAlign: 'center' }}>{t('liveRandom.title')}</Text>
        <Text tone="textMuted" style={{ textAlign: 'center', maxWidth: 340 }}>
          {searching ? t('liveRandom.ringing', { count: pending.length }) : t('liveRandom.body', { count: LIVE_PARALLEL_REQUESTS })}
        </Text>
      </View>

      <View accessibilityRole="list" accessibilityLabel={t('liveRandom.ringing', { count: pending.length })}
        style={{ flexDirection: 'row', gap: space.lg, minHeight: 96, alignItems: 'center' }}>
        {slots.map((p, i) => <Slot key={p?.callId ?? `empty-${i}`} call={p} searching={searching} />)}
      </View>
      {demo && searching ? <DemoBadge compact /> : null}

      {searching ? (
        <Button kind="secondary" label={t('liveRandom.stop')} onPress={onStop} style={{ alignSelf: 'stretch' }} />
      ) : (
        <Pressable onPress={onStart} disabled={disabled} accessibilityRole="button" accessibilityLabel={t('liveRandom.start')}
          accessibilityHint={t('liveRandom.startHint')} accessibilityState={{ disabled }}
          style={({ pressed }) => ({ alignSelf: 'stretch', minHeight: 56, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
            backgroundColor: pressed ? c.accentPressed : c.accent, opacity: disabled ? 0.45 : 1 })}>
          <Icon name="video" size={20} color={c.onAccent} />
          <Text variant="bodyStrong" style={{ color: c.onAccent }}>{t('liveRandom.start')}</Text>
        </Pressable>
      )}
      <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('live.inviteHint')}</Text>
    </View>
  );
}

function Slot({ call, searching }: { call: CallSnapshot | null; searching: boolean }) {
  const { c } = useTheme();
  const size = 76;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel={call ? `${call.peer.firstName}, ${call.peer.age}` : undefined}>
      <Pulse color={c.live} size={size} active={searching && !!call} />
      <View style={{ width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, overflow: 'hidden', backgroundColor: c.surfaceAlt,
        borderWidth: 1, borderColor: call ? c.live : c.border, alignItems: 'center', justifyContent: 'center' }}>
        {call?.peer.photoUrl ? (
          <Image source={photoSource(call.peer.photoUrl)} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" transition={imageFade(300)} />
        ) : searching ? <ActivityIndicator color={c.textSubtle} /> : <Icon name="video" size={20} color={c.textSubtle} />}
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
        {REGIONS.map((r) => chip(r.code, r.city, value.regionCode === r.code, () => onChange({ ...value, regionCode: r.code })))}
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
