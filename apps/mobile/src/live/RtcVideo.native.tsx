import { View } from 'react-native';

type RTCViewType = typeof import('@livekit/react-native-webrtc').RTCView;
let RTCView: RTCViewType | null | undefined;
function load() {
  if (RTCView !== undefined) return RTCView;
  try { RTCView = (require('@livekit/react-native-webrtc') as { RTCView: RTCViewType }).RTCView; } catch { RTCView = null; }
  return RTCView;
}

/** iPhone / Android: react-native-webrtc's video view (development build). */
export function RtcVideo({ stream, mirror, cover = true }: { stream: MediaStream; mirror?: boolean; cover?: boolean; style?: object }) {
  const V = load();
  if (!V) return <View style={{ flex: 1, backgroundColor: '#120B10' }} />;
  const url = (stream as unknown as { toURL(): string }).toURL();
  return <V streamURL={url} mirror={mirror} objectFit={cover ? 'cover' : 'contain'} style={{ flex: 1 }} />;
}
