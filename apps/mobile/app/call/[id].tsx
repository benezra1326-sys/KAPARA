import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CallReportReason, type CallSnapshot } from '@kapara/shared';
import { palette, radius, space } from '@kapara/design';
import { CallMedia } from '../../src/live/CallMedia';
import { Icon, type IconName } from '../../src/live/icons';
import { useLive, useLiveStore } from '../../src/live/LiveProvider';
import { Pulse } from '../../src/live/Pulse';
import type { MediaIssue } from '../../src/live/stage';
import { formatDuration, useNow } from '../../src/live/useNow';
import { Button, DemoBadge, Text } from '../../src/ui';
import { photoSource } from '../../src/demo/images';
import { imageFade } from '../../src/ui/imageFade';

/** The call screen is always dark and quiet, whatever the app theme: the person comes first. */
const INK = '#F5EFE8';
const INK_MUTED = 'rgba(245,239,232,0.72)';
const GLASS = 'rgba(255,255,255,0.12)';
const OLIVE = '#8DB28F';
const RED = '#C8424F';

export default function CallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useLiveStore();
  const s = useLive();
  const now = useNow(1000);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [front, setFront] = useState(true);
  const [issue, setIssue] = useState<MediaIssue | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const onIssue = useCallback((i: MediaIssue | null) => setIssue(i), []);

  const call = s.call;
  const back = useCallback(() => { store.clearEnded(); router.canGoBack() ? router.back() : router.replace('/live'); }, [router, store]);

  // A new video round always starts with my camera on (I just accepted it).
  useEffect(() => { if (call?.state === 'video_on') setCameraOn(true); }, [call?.state]);
  // If I declined (or let ring) an incoming call, simply leave: nothing to summarise.
  useEffect(() => {
    if (!call && s.lastEnded?.direction === 'incoming' && s.lastEnded.state !== 'ended') back();
  }, [call, s.lastEnded, back]);

  if (!call) {
    const ended = s.lastEnded;
    return (
      <View style={{ flex: 1, backgroundColor: palette.night }}>
        {ended ? <StageBackdropLite url={ended.peer.photoUrl} /> : null}
        <View style={{ flex: 1, padding: space.xl, paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl, justifyContent: 'space-between' }}>
          <Animated.View entering={FadeIn.duration(320)} style={{ alignItems: 'center', gap: space.md, marginTop: space.xxxl }}>
            {ended ? <Avatar url={ended.peer.photoUrl} size={112} /> : null}
            <Text variant="title" style={{ color: INK, textAlign: 'center' }} accessibilityRole="header">
              {reported && ended ? t('call.reportDone', { name: ended.peer.firstName })
                : !ended ? t('call.notFound')
                : ended.state === 'ended' ? t('call.endedTitle') : t('call.declinedTitle')}
            </Text>
            {ended && !reported ? (
              <Text style={{ color: INK_MUTED, textAlign: 'center' }}>
                {t(`live.lastCall.${ended.state}`, { name: ended.peer.firstName, duration: formatDuration(ended.durationSec) })}
              </Text>
            ) : null}
          </Animated.View>
          <Button label={t('call.backToLive')} onPress={back} />
        </View>
      </View>
    );
  }

  const peer = call.peer;
  const videoAllowed = call.state === 'video_on';
  const secs = s.connectedAt ? Math.floor((now - s.connectedAt) / 1000) : 0;
  const incomingInvite = call.state === 'invited' && call.direction === 'incoming';
  const peerAsksVideo = call.state === 'video_requested' && call.videoRequestedBy === 'peer';
  const status = statusLine(call, t, secs);

  return (
    <View style={{ flex: 1, backgroundColor: palette.night }} accessibilityViewIsModal>
      <CallMedia peer={peer} join={s.join} videoAllowed={videoAllowed} micOn={micOn} cameraOn={cameraOn} frontCamera={front} top={insets.top} onIssue={onIssue} />

      {/* Top bar: what is being shared right now, always visible. */}
      <View style={{ position: 'absolute', top: insets.top + space.md, left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip icon={videoAllowed ? 'video' : 'audio'} label={videoAllowed ? t('call.videoOnBadge') : t('call.audioOnly')} color={videoAllowed ? OLIVE : INK} />
        {s.mode === 'demo' ? <Chip label={t('call.demoBanner')} color="#D4A866" /> : null}
      </View>

      {/* Center: the person. Hidden behind real video when it is on. */}
      {!videoAllowed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl }}>
          <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
            <Pulse color={call.state === 'invited' ? '#D4A866' : OLIVE} size={168} rings={3} active={call.state !== 'accepted'} />
            <Avatar url={peer.photoUrl} size={152} />
          </View>
          <View style={{ alignItems: 'center', gap: space.xs }}>
            {incomingInvite ? <Text variant="overline" style={{ color: '#D4A866' }}>{t('call.incomingOverline')}</Text> : null}
            <Text variant="hero" style={{ color: INK, textAlign: 'center' }} accessibilityRole="header">{peer.firstName}</Text>
            {peer.isDemo ? <DemoBadge /> : null}
            <Text style={{ color: INK_MUTED, textAlign: 'center' }} accessibilityLiveRegion="polite">{status}</Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.xl, paddingBottom: 220 + insets.bottom }}>
          <Text variant="heading" style={{ color: INK }}>{peer.firstName}</Text>
          <Text variant="caption" style={{ color: INK_MUTED }} accessibilityLiveRegion="polite">{status}</Text>
        </View>
      )}

      {videoAllowed && cameraOn && s.mode !== 'demo' ? (
        <Pressable onPress={() => setFront((v) => !v)} accessibilityRole="button" accessibilityLabel={t('call.flip')} hitSlop={8}
          style={{ position: 'absolute', right: space.lg + 30, top: insets.top + 64 + 152 + space.sm, width: 48, height: 48, borderRadius: 24,
            backgroundColor: 'rgba(20,17,24,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="flip" size={22} color="#fff" />
        </Pressable>
      ) : null}

      {issue ? (
        <Animated.View entering={FadeInDown} exiting={FadeOut} style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: insets.bottom + 210,
          padding: space.lg, borderRadius: radius.md, backgroundColor: 'rgba(20,17,24,0.92)', borderWidth: 1, borderColor: GLASS, gap: space.sm }} accessibilityRole="alert">
          <Text variant="caption" style={{ color: INK }}>{t(`call.issues.${issue}`)}</Text>
          {issue === 'mic_denied' || issue === 'camera_denied' ? (
            <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button" hitSlop={8}>
              <Text variant="label" style={{ color: '#D4A866' }}>{t('call.openSettings')}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {s.error ? (
        <Pressable onPress={() => store.clearError()} accessibilityRole="alert"
          style={{ position: 'absolute', left: space.lg, right: space.lg, top: insets.top + 64, padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(200,66,79,0.9)' }}>
          <Text variant="caption" style={{ color: '#fff' }}>{t(`live.errors.${s.error}`, { defaultValue: t('live.errors.unknown') })}</Text>
        </Pressable>
      ) : null}

      {/* Controls */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.xl }}>
        {incomingInvite ? (
          <Animated.View entering={FadeInDown.duration(280)} style={{ gap: space.lg }}>
            <Text variant="caption" style={{ color: INK_MUTED, textAlign: 'center' }}>{t('call.incomingHint')}</Text>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <PillButton label={t('call.decline')} onPress={() => void store.respond(false)} bg={GLASS} />
              <PillButton label={t('call.accept')} icon="phone" onPress={() => void store.respond(true)} bg={OLIVE} fg={palette.night} />
            </View>
          </Animated.View>
        ) : call.state === 'invited' ? (
          <View style={{ alignItems: 'center' }}>
            <RoundButton icon="hangup" label={t('call.cancel')} onPress={() => void store.hangup()} bg={RED} size={72} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
              <RoundButton icon={micOn ? 'mic' : 'micOff'} label={micOn ? t('call.mute') : t('call.unmute')} onPress={() => setMicOn((v) => !v)} active={!micOn} />
              {videoAllowed ? (
                <>
                  <RoundButton icon={cameraOn ? 'video' : 'videoOff'} label={cameraOn ? t('call.turnCameraOff') : t('call.turnCameraOn')} onPress={() => setCameraOn((v) => !v)} active={!cameraOn} />
                  <RoundButton icon="audio" label={t('call.backToAudio')} onPress={() => void store.stopVideo()} />
                </>
              ) : (
                <RoundButton icon="video" label={t('call.proposeVideo')} onPress={() => void store.requestVideo()} disabled={call.state !== 'connected'} />
              )}
              <RoundButton icon="shield" label={t('call.more')} onPress={() => setReporting(true)} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <RoundButton icon="hangup" label={t('call.hangup')} onPress={() => void store.hangup()} bg={RED} size={72} />
            </View>
          </>
        )}
      </View>

      {/* Video consent: asked by the other person, answered by me. My camera stays off until I accept. */}
      <Modal visible={peerAsksVideo} transparent animationType="slide" onRequestClose={() => void store.respondVideo(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View style={{ backgroundColor: '#211C27', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.lg }}
            accessibilityViewIsModal>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar url={peer.photoUrl} size={48} />
              <Text variant="heading" style={{ color: INK, flex: 1 }} accessibilityRole="header">{t('call.videoRequestTitle', { name: peer.firstName })}</Text>
            </View>
            <Text style={{ color: INK_MUTED }}>{t('call.videoRequestBody')}</Text>
            {s.mode === 'demo' ? <Text variant="caption" style={{ color: '#D4A866' }}>{t('call.demoBanner')}</Text> : null}
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <PillButton label={t('call.declineVideo')} onPress={() => void store.respondVideo(false)} bg={GLASS} />
              <PillButton label={t('call.acceptVideo')} icon="video" onPress={() => void store.respondVideo(true)} bg={OLIVE} fg={palette.night} />
            </View>
          </View>
        </View>
      </Modal>

      <ReportSheet visible={reporting} name={peer.firstName} bottom={insets.bottom}
        onClose={() => setReporting(false)}
        onSend={async (reason) => { setReporting(false); if (await store.report(reason)) setReported(true); }} />
    </View>
  );
}

function statusLine(call: CallSnapshot, t: TFunction, secs: number): string {
  const name = call.peer.firstName;
  switch (call.state) {
    case 'invited': return call.direction === 'outgoing' ? t('call.outgoingHint') : t('call.incomingTitle', { name });
    case 'accepted': return t('call.connecting');
    case 'video_requested': return call.videoRequestedBy === 'me' ? t('call.videoPending', { name }) : formatDuration(secs);
    default: return formatDuration(secs);
  }
}

function ReportSheet({ visible, name, bottom, onClose, onSend }: { visible: boolean; name: string; bottom: number; onClose: () => void; onSend: (r: CallReportReason) => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<CallReportReason | null>(null);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} accessibilityLabel={t('call.close')} />
      <View style={{ backgroundColor: '#211C27', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: bottom + space.xl, gap: space.md }} accessibilityViewIsModal>
        <Text variant="heading" style={{ color: INK }} accessibilityRole="header">{t('call.reportTitle', { name })}</Text>
        <Text variant="caption" style={{ color: INK_MUTED }}>{t('call.reportBody', { name })}</Text>
        <View accessibilityRole="radiogroup" style={{ gap: space.xs }}>
          {CallReportReason.options.map((r) => (
            <Pressable key={r} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ checked: reason === r }}
              style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, borderRadius: radius.sm,
                backgroundColor: reason === r ? GLASS : 'transparent' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: reason === r ? '#D4A866' : INK_MUTED, alignItems: 'center', justifyContent: 'center' }}>
                {reason === r ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#D4A866' }} /> : null}
              </View>
              <Text style={{ color: INK }}>{t(`call.reasons.${r}`)}</Text>
            </Pressable>
          ))}
        </View>
        <PillButton label={t('call.reportSend')} onPress={() => reason && onSend(reason)} bg={RED} disabled={!reason} />
      </View>
    </Modal>
  );
}

function Avatar({ url, size }: { url?: string; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#2A2431', borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)' }}>
      {url ? <Image source={photoSource(url)} style={{ flex: 1 }} contentFit="cover" transition={imageFade(300)} accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}

function StageBackdropLite({ url }: { url?: string }) {
  return url ? <Image source={photoSource(url)} style={{ position: 'absolute', inset: 0, opacity: 0.25 }} blurRadius={30} contentFit="cover" /> : null;
}

function Chip({ label, icon, color }: { label: string; icon?: IconName; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: radius.pill, backgroundColor: 'rgba(20,17,24,0.55)', borderWidth: 1, borderColor: GLASS }}>
      {icon ? <Icon name={icon} size={14} color={color} /> : null}
      <Text variant="caption" style={{ color }}>{label}</Text>
    </View>
  );
}

function RoundButton({ icon, label, onPress, bg = GLASS, size = 60, active, disabled }: { icon: IconName; label: string; onPress: () => void; bg?: string; size?: number; active?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: active }}
      style={({ pressed }) => ({ alignItems: 'center', gap: space.xs, opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.94 : 1 }], maxWidth: 88 })}>
      <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? INK : bg }}>
        <Icon name={icon} size={size > 64 ? 30 : 24} color={active ? palette.night : '#fff'} />
      </View>
      <Text variant="caption" style={{ color: INK_MUTED, textAlign: 'center', fontSize: 11, lineHeight: 14 }} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

function PillButton({ label, onPress, bg, fg = INK, icon, disabled }: { label: string; onPress: () => void; bg: string; fg?: string; icon?: IconName; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      style={({ pressed }) => ({ flex: 1, minHeight: 56, borderRadius: radius.pill, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: space.sm, paddingHorizontal: space.lg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text variant="label" style={{ color: fg, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
