import { Image } from 'expo-image';
import { useEffect, useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { Text } from '../ui';
import { photoSource } from '../demo/images';
import { rtcSessions, type RtcView } from './rtc';
import { RtcVideo } from './RtcVideo';
import { StageBackdrop, pipStyle, type CallMediaProps } from './stage';

const idle: RtcView = { status: 'connecting', issue: null, local: null, remote: null, peerCamera: false };
const noop = () => () => undefined;

/** A real, direct call: the other person full screen when their camera is on, me in the corner. */
export function RtcStage({ peer, videoAllowed, micOn, cameraOn, frontCamera, top, onIssue }: CallMediaProps) {
  const { t } = useTranslation();
  const session = useSyncExternalStore(rtcSessions.subscribe, rtcSessions.get, rtcSessions.get);
  const view = useSyncExternalStore(session?.subscribe ?? noop, session?.get ?? (() => idle), session?.get ?? (() => idle));

  useEffect(() => { session?.setMic(micOn); }, [session, micOn]);
  useEffect(() => { session?.setCamera(videoAllowed && cameraOn, frontCamera); }, [session, videoAllowed, cameraOn, frontCamera]);
  useEffect(() => { onIssue(view.issue); }, [view.issue, onIssue]);

  const peerVideo = videoAllowed && view.peerCamera && !!view.remote?.getVideoTracks().length;
  return (
    <>
      <StageBackdrop peer={peer} dim={videoAllowed ? 0.45 : 0.6} />
      {peerVideo && view.remote ? (
        <Animated.View entering={FadeIn.duration(450)} exiting={FadeOut} style={{ position: 'absolute', inset: 0 }}>
          <RtcVideo stream={view.remote} />
          <LinearGradient colors={['rgba(20,17,24,0.5)', 'transparent', 'transparent', 'rgba(20,17,24,0.85)']} locations={[0, 0.22, 0.6, 1]}
            style={{ position: 'absolute', inset: 0 }} pointerEvents="none" />
        </Animated.View>
      ) : videoAllowed ? (
        // Video is on for the call, but the other person keeps their camera off: their portrait, said plainly.
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: space.md }} pointerEvents="none">
          <View style={{ width: 132, height: 132, borderRadius: 66, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: '#30222D' }}>
            {peer.photoUrl ? <Image source={photoSource(peer.photoUrl)} style={{ flex: 1 }} contentFit="cover" /> : null}
          </View>
          <Text variant="caption" style={{ color: 'rgba(245,239,232,0.72)' }}>{t('call.peerCameraOff', { name: peer.firstName })}</Text>
        </View>
      ) : null}

      {videoAllowed ? (
        <View style={[pipStyle, { top: top + 64, alignItems: 'center', justifyContent: 'center' }]}>
          {view.local ? <RtcVideo stream={view.local} mirror={frontCamera} />
            : <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', padding: space.sm }}>{t('call.cameraOff')}</Text>}
        </View>
      ) : null}

      {session && view.status === 'connecting' ? (
        <View style={{ position: 'absolute', top: top + 64, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: 999, backgroundColor: 'rgba(20,17,24,0.6)' }}>
            <ActivityIndicator size="small" color="#F5EFE8" />
            <Text variant="caption" style={{ color: '#F5EFE8' }}>{t('call.connecting')}</Text>
          </View>
        </View>
      ) : null}
    </>
  );
}
