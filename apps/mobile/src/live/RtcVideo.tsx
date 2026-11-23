import { createElement, useEffect, useRef } from 'react';

/** Web: a plain <video> element. Muted: the sound plays through its own hidden audio element. */
export function RtcVideo({ stream, mirror, cover = true, style }: { stream: MediaStream; mirror?: boolean; cover?: boolean; style?: object }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    void el.play().catch(() => undefined);
  }, [stream]);
  return createElement('video', {
    ref, autoPlay: true, playsInline: true, muted: true,
    style: { width: '100%', height: '100%', objectFit: cover ? 'cover' : 'contain', transform: mirror ? 'scaleX(-1)' : undefined, backgroundColor: '#120B10', ...style },
  });
}
