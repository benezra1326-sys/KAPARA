import type { RtcPlatform } from './rtc-platform';

export type { RtcPlatform } from './rtc-platform';

let cached: RtcPlatform | null | undefined;

/**
 * iPhone / Android: react-native-webrtc (already shipped for LiveKit). Needs a
 * development build; in Expo Go the module is missing and calls say so.
 * Sound plays through the phone's audio session automatically.
 */
export function rtcPlatform(): RtcPlatform | null {
  if (cached !== undefined) return cached;
  try {
    const w = require('@livekit/react-native-webrtc') as {
      RTCPeerConnection: typeof RTCPeerConnection; MediaStream: typeof MediaStream;
      mediaDevices: { getUserMedia(c: MediaStreamConstraints): Promise<MediaStream> };
    };
    cached = {
      RTCPeerConnection: w.RTCPeerConnection,
      MediaStream: w.MediaStream,
      getUserMedia: (c) => w.mediaDevices.getUserMedia(c),
      playRemoteAudio: () => () => undefined,
    };
  } catch {
    cached = null;
  }
  return cached;
}
