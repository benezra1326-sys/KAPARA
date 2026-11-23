import { useEffect } from 'react';
import { RtcStage } from './RtcStage';
import { DemoStage, StageBackdrop, type CallMediaProps } from './stage';

/**
 * Web build: direct calls (WebRTC) work in the browser. LiveKit rooms (the
 * self-hosted API) are mobile only and show an honest notice. Demo calls are simulated.
 */
export function CallMedia(props: CallMediaProps) {
  const { peer, join, videoAllowed, cameraOn, top, onIssue } = props;
  const real = join?.mode === 'livekit';
  useEffect(() => { if (join?.mode !== 'webrtc') onIssue(real ? 'web_unsupported' : null); }, [real, join, onIssue]);
  if (join?.mode === 'webrtc') return <RtcStage {...props} />;
  if (real) return <StageBackdrop peer={peer} />;
  return <DemoStage peer={peer} videoOn={videoAllowed} cameraOn={cameraOn} top={top} />;
}
