/**
 * Web: the browser's own WebRTC. The native build has rtc-platform.native.ts.
 */
export interface RtcPlatform {
  RTCPeerConnection: typeof RTCPeerConnection;
  MediaStream: typeof MediaStream;
  getUserMedia(c: MediaStreamConstraints): Promise<MediaStream>;
  /** Plays the other person's sound; returns a function that stops it. */
  playRemoteAudio(stream: MediaStream): () => void;
}

export function rtcPlatform(): RtcPlatform | null {
  const g = globalThis as typeof globalThis & { RTCPeerConnection?: typeof RTCPeerConnection };
  if (typeof g.RTCPeerConnection !== 'function' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;
  return {
    RTCPeerConnection: g.RTCPeerConnection,
    MediaStream: g.MediaStream,
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    playRemoteAudio(stream) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      el.srcObject = stream;
      el.style.display = 'none';
      document.body.appendChild(el);
      void el.play().catch(() => undefined);
      return () => { el.srcObject = null; el.remove(); };
    },
  };
}
