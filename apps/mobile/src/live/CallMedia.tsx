import { useEffect } from 'react';
import { DemoStage, StageBackdrop, type CallMediaProps } from './stage';

/**
 * Web build: real calls are not supported in v1 (mobile only). Demo calls
 * render normally; a real LiveKit call shows an honest notice.
 */
export function CallMedia({ peer, join, videoAllowed, cameraOn, top, onIssue }: CallMediaProps) {
  const real = join?.mode === 'livekit';
  useEffect(() => { onIssue(real ? 'web_unsupported' : null); }, [real, onIssue]);
  if (real) return <StageBackdrop peer={peer} />;
  return <DemoStage peer={peer} videoOn={videoAllowed} cameraOn={cameraOn} top={top} />;
}
