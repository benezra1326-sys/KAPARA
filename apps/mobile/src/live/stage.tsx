import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LiveMember } from '@kapara/shared';
import { radius, space } from '@kapara/design';
import { Text } from '../ui';
import { photoSource } from '../demo/images';
import { imageFade } from '../ui/imageFade';

/** Full-bleed portrait of the other person, used whenever there is no live video. */
export function StageBackdrop({ peer, dim = 0.55 }: { peer: LiveMember; dim?: number }) {
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: '#141118' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {peer.photoUrl ? (
        <Image source={photoSource(peer.photoUrl)} style={{ position: 'absolute', inset: 0 }} contentFit="cover" blurRadius={28} transition={imageFade(400)} />
      ) : null}
      <LinearGradient colors={[`rgba(20,17,24,${dim - 0.2})`, `rgba(20,17,24,${dim})`, 'rgba(20,17,24,0.92)']} locations={[0, 0.5, 1]} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}

/** Small, rounded self-view in the corner (picture-in-picture). */
export const pipStyle: ViewStyle = {
  position: 'absolute', right: space.lg, width: 108, height: 152, borderRadius: radius.md, overflow: 'hidden',
  backgroundColor: '#2A2431', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
};

/** Demo-mode media: no camera, no microphone is opened. Says so plainly. */
export function DemoStage({ peer, videoOn, cameraOn, top }: { peer: LiveMember; videoOn: boolean; cameraOn: boolean; top: number }) {
  const { t } = useTranslation();
  return (
    <>
      <StageBackdrop peer={peer} dim={videoOn ? 0.35 : 0.6} />
      {videoOn ? (
        <>
          {peer.photoUrl ? <Image source={photoSource(peer.photoUrl)} style={{ position: 'absolute', inset: 0, opacity: 0.85 }} contentFit="cover" transition={imageFade(500)} accessibilityIgnoresInvertColors /> : null}
          <LinearGradient colors={['rgba(20,17,24,0.55)', 'transparent', 'rgba(20,17,24,0.9)']} locations={[0, 0.35, 1]} style={{ position: 'absolute', inset: 0 }} />
          <View style={[pipStyle, { top: top + 64, alignItems: 'center', justifyContent: 'center', padding: space.sm }]}>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
              {cameraOn ? t('call.demoCameraSimulated') : t('call.cameraOff')}
            </Text>
          </View>
        </>
      ) : null}
    </>
  );
}

export type MediaIssue = 'mic_denied' | 'camera_denied' | 'connect_failed' | 'needs_dev_build' | 'web_unsupported';

export interface CallMediaProps {
  peer: LiveMember;
  join: import('@kapara/shared').JoinInfo | null;
  /** True only in video_on: both accepted. */
  videoAllowed: boolean;
  micOn: boolean;
  /** My own camera choice; only effective when videoAllowed. */
  cameraOn: boolean;
  frontCamera: boolean;
  top: number;
  onIssue: (issue: MediaIssue | null) => void;
}
