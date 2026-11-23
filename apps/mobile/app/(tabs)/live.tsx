import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RULES } from '@kapara/config';
import type { CallMode, LiveMember } from '@kapara/shared';
import { radius, shadow, space } from '@kapara/design';
import { Icon } from '../../src/live/icons';
import { useLive, useLiveStore } from '../../src/live/LiveProvider';
import { Pulse } from '../../src/live/Pulse';
import { formatDuration, useNow } from '../../src/live/useNow';
import { useTheme } from '../../src/theme';
import { Button, DemoBadge, EmptyState, Screen, Text } from '../../src/ui';
import { photoSource } from '../../src/demo/images';
import { openPaywall } from '../../src/premium/store';
import { imageFade } from '../../src/ui/imageFade';

/**
 * Live: who is available right now. Three consents, never bundled:
 * being visible, accepting an audio call, then (both) turning cameras on.
 */
export default function Live() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const store = useLiveStore();
  const s = useLive();
  const now = useNow(15_000);
  const [inviting, setInviting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => { setRefreshing(true); await store.refresh(); setRefreshing(false); }, [store]);
  const invite = async (m: LiveMember, mode: CallMode) => {
    setInviting(m.userId);
    // Live is uncapped (premium offer, 23/11). A refusal from the database still opens the offer page.
    const call = await store.invite(m, mode, 'live');
    if (!call && store.get().error === 'quota_reached') { setInviting(null); openPaywall('liveCall'); return; }
    setInviting(null);
    if (call) router.push({ pathname: '/call/[id]', params: { id: call.callId } });
  };

  const available = Boolean(s.availableUntil && s.availableUntil > now);
  const minutesLeft = available ? Math.min(RULES.liveAvailabilityMinutes, Math.max(1, Math.ceil((s.availableUntil! - Date.now()) / 60_000))) : 0;
  const enabled = s.settings?.liveEnabled === true;

  return (
    <Screen title={t('live.title')} subtitle={t('live.subtitle')}
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
        <View style={{ marginHorizontal: space.lg, borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden' }}>
          <View style={{ padding: space.xl, gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <Pulse color={c.live} size={28} active={available} />
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: available ? c.live : c.border }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{t('live.availableToggle')}</Text>
                <Text variant="caption" tone="textMuted">
                  {available ? t('live.availableFor', { minutes: minutesLeft }) : t('live.availableOff')}
                </Text>
              </View>
              <Switch value={available} onValueChange={(v) => void store.setAvailable(v)}
                trackColor={{ true: c.live, false: c.textSubtle }} accessibilityLabel={t('live.availableToggle')}
                accessibilityHint={t('live.availableHint', { minutes: RULES.liveAvailabilityMinutes })} />
            </View>
            <Text variant="caption" tone="textSubtle">{t('live.availableHint', { minutes: RULES.liveAvailabilityMinutes })}</Text>
          </View>
          <Pressable onPress={() => router.push('/settings/live')} accessibilityRole="button"
            accessibilityLabel={`${t('live.whoCanCall')} : ${t(`live.whoCanCallValue.${s.settings.liveCallsFrom}`)}`}
            style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.sm,
              borderTopWidth: 1, borderTopColor: c.border, backgroundColor: pressed ? c.surfaceAlt : 'transparent' })}>
            <Text variant="label" tone="textMuted" style={{ flex: 1 }}>{t('live.whoCanCall')}</Text>
            <Text variant="label">{t(`live.whoCanCallValue.${s.settings.liveCallsFrom}`)}</Text>
            <Icon name="chevron" size={18} color={c.textSubtle} />
          </Pressable>
        </View>
      )}

      {s.lastEnded ? (
        <Pressable onPress={() => store.clearEnded()} accessibilityRole="button" accessibilityHint={t('call.close')}>
          <Notice tone="muted" text={t(`live.lastCall.${s.lastEnded.state}`, { name: s.lastEnded.peer.firstName, duration: formatDuration(s.lastEnded.durationSec) })} />
        </Pressable>
      ) : null}
      {s.error && !s.call ? (
        <Pressable onPress={() => store.clearError()} accessibilityRole="alert">
          <Notice tone="danger" text={t(`live.errors.${s.error}`, { defaultValue: t('live.errors.unknown') })} />
        </Pressable>
      ) : null}

      {enabled || s.local ? (
        <View style={{ marginTop: space.xl }}>
          {s.membersStatus === 'loading' && !s.members.length ? (
            <View style={{ paddingHorizontal: space.lg, gap: space.md }}>{[0, 1, 2].map((i) => <SkeletonRow key={i} />)}</View>
          ) : s.membersStatus === 'error' ? (
            <EmptyState title={t('live.offline')} action={{ label: t('common.retry'), onPress: () => void store.loadMembers() }} />
          ) : s.members.length === 0 ? (
            <EmptyState title={t('live.empty')} body={t('live.emptyBody')} />
          ) : (
            <View style={{ gap: space.md }}>
              <Text variant="overline" tone="textSubtle" style={{ paddingHorizontal: space.xl }}>
                {`${t('live.subtitle')} · ${s.members.length}`}
              </Text>
              {s.members.map((m) => (
                <MemberRow key={m.userId} m={m} busy={inviting === m.userId} disabled={!!inviting || !!s.call || !enabled}
                  onInvite={(mode) => void invite(m, mode)} />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {s.local && enabled ? (
        <View style={{ paddingHorizontal: space.xl, marginTop: space.xl }}>
          <Button kind="ghost" label={t('live.demoIncoming')} onPress={() => store.simulateIncoming()} disabled={!!s.call} />
        </View>
      ) : null}
    </Screen>
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

function MemberRow({ m, onInvite, busy, disabled }: { m: LiveMember; onInvite: (mode: CallMode) => void; busy: boolean; disabled: boolean }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <View style={[{ marginHorizontal: space.lg, padding: space.md, borderRadius: radius.lg, backgroundColor: c.surface, flexDirection: 'row', gap: space.lg }, shadow.card]}>
      <View style={{ width: 84, height: 105, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
        {m.photoUrl ? <Image source={photoSource(m.photoUrl)} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" transition={imageFade(250)} accessibilityLabel={m.firstName} /> : null}
        <View style={{ position: 'absolute', top: space.sm, left: space.sm, width: 10, height: 10, borderRadius: 5, backgroundColor: c.live, borderWidth: 2, borderColor: c.surface }} />
      </View>
      <View style={{ flex: 1, gap: space.xs, paddingVertical: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' }}>
          <Text variant="heading">{m.firstName}, {m.age}</Text>
          {m.verified ? <Text variant="caption" tone="live">{m.isDemo ? t('ux.verifiedDemo') : t('live.verified')}</Text> : null}
        </View>
        {m.headline ? <Text variant="caption" tone="textMuted" numberOfLines={2}>{m.headline}</Text> : null}
        {m.isDemo ? <DemoBadge compact /> : null}
        <View style={{ flex: 1 }} />
        {/* Video first (Live is face to face), audio always offered. The camera stays mine to switch on. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(['video', 'audio'] as const).map((mode) => {
            const primary = mode === 'video';
            return (
              <Pressable key={mode} onPress={() => onInvite(mode)} disabled={disabled} accessibilityRole="button"
                accessibilityLabel={`${t('live.invite')} (${mode === 'video' ? t('live.inviteVideo') : t('live.inviteAudio')}) : ${m.firstName}`}
                accessibilityHint={t('live.inviteHint')} accessibilityState={{ disabled, busy }}
                style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.pill,
                  flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: c.accent,
                  backgroundColor: primary ? (pressed ? c.accentPressed : c.accent) : pressed ? c.accentSoft : 'transparent',
                  opacity: disabled && !busy ? 0.45 : 1 })}>
                {busy && primary ? <ActivityIndicator color={c.onAccent} /> : <Icon name={mode} size={18} color={primary ? (c.onAccent) : c.accent} />}
                <Text variant="label" style={{ color: primary ? (c.onAccent) : c.accent }}>{mode === 'video' ? t('live.inviteVideo') : t('live.inviteAudio')}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function SkeletonRow() {
  const { c } = useTheme();
  return (
    <View style={{ padding: space.md, borderRadius: radius.lg, backgroundColor: c.surface, flexDirection: 'row', gap: space.lg }} accessibilityElementsHidden>
      <View style={{ width: 84, height: 105, borderRadius: radius.md, backgroundColor: c.surfaceAlt }} />
      <View style={{ flex: 1, gap: space.sm, paddingTop: space.sm }}>
        <View style={{ width: '55%', height: 18, borderRadius: 6, backgroundColor: c.surfaceAlt }} />
        <View style={{ width: '85%', height: 12, borderRadius: 6, backgroundColor: c.surfaceAlt }} />
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
