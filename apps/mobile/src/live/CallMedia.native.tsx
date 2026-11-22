import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { DemoStage, StageBackdrop, pipStyle, type CallMediaProps } from './stage';

type RN = typeof import('@livekit/react-native');
type LK = typeof import('livekit-client');
type Room = import('livekit-client').Room;
type Participant = import('livekit-client').Participant;
type TrackPublication = import('livekit-client').TrackPublication;

let loaded: { rn: RN; lk: LK } | null | undefined;
/**
 * LiveKit needs native WebRTC modules: available in a development build,
 * not in Expo Go. Loaded lazily so the rest of the app keeps working.
 */
function loadLiveKit() {
  if (loaded !== undefined) return loaded;
  try {
    const rn = require('@livekit/react-native') as RN;
    const lk = require('livekit-client') as LK;
    rn.registerGlobals();
    loaded = { rn, lk };
  } catch {
    loaded = null;
  }
  return loaded;
}

interface VideoRef { participant: Participant; publication: TrackPublication; source: TrackPublication['source'] }

export function CallMedia(props: CallMediaProps) {
  const { join, peer, videoAllowed, cameraOn, top, onIssue } = props;
  const lib = join?.mode === 'livekit' ? loadLiveKit() : undefined;

  useEffect(() => { if (join?.mode === 'livekit' && lib === null) onIssue('needs_dev_build'); }, [join, lib, onIssue]);

  if (!join || join.mode === 'demo') return <DemoStage peer={peer} videoOn={videoAllowed} cameraOn={cameraOn} top={top} />;
  if (!lib) return <StageBackdrop peer={peer} />;
  return <LiveKitStage {...props} lib={lib} url={join.url} token={join.token} />;
}

function LiveKitStage({ lib, url, token, peer, videoAllowed, micOn, cameraOn, frontCamera, top, onIssue }: CallMediaProps & { lib: { rn: RN; lk: LK }; url: string; token: string }) {
  const { rn, lk } = lib;
  const roomRef = useRef<Room | null>(null);
  const [remote, setRemote] = useState<VideoRef | null>(null);
  const [local, setLocal] = useState<VideoRef | null>(null);
  const [ready, setReady] = useState(false);

  // Connect once per token. Microphone only: the server refuses the camera until both accepted.
  useEffect(() => {
    let cancelled = false;
    const room = new lk.Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const sync = () => {
      const other = [...room.remoteParticipants.values()][0];
      const rp = other?.getTrackPublication(lk.Track.Source.Camera);
      setRemote(other && rp?.track && !rp.isMuted ? { participant: other, publication: rp, source: lk.Track.Source.Camera } : null);
      const lp = room.localParticipant.getTrackPublication(lk.Track.Source.Camera);
      setLocal(lp?.track && !lp.isMuted ? { participant: room.localParticipant, publication: lp, source: lk.Track.Source.Camera } : null);
    };
    for (const ev of [lk.RoomEvent.TrackSubscribed, lk.RoomEvent.TrackUnsubscribed, lk.RoomEvent.TrackMuted, lk.RoomEvent.TrackUnmuted,
      lk.RoomEvent.LocalTrackPublished, lk.RoomEvent.LocalTrackUnpublished, lk.RoomEvent.ParticipantDisconnected]) room.on(ev, sync);
    (async () => {
      try {
        await rn.AudioSession.startAudioSession();
        await room.connect(url, token);
        if (cancelled) return;
        setReady(true);
        onIssue(null);
      } catch {
        if (!cancelled) onIssue('connect_failed');
      }
    })();
    return () => {
      cancelled = true;
      void room.disconnect();
      void rn.AudioSession.stopAudioSession();
      roomRef.current = null;
    };
  }, [lk, rn, url, token, onIssue]);

  useEffect(() => {
    if (!ready) return;
    roomRef.current?.localParticipant.setMicrophoneEnabled(micOn).catch(() => onIssue('mic_denied'));
  }, [ready, micOn, onIssue]);

  // The camera turns on only when video is allowed for both AND I keep mine on.
  useEffect(() => {
    if (!ready) return;
    const want = videoAllowed && cameraOn;
    const lp = roomRef.current?.localParticipant;
    const current = lp?.getTrackPublication(lk.Track.Source.Camera)?.track as import('livekit-client').LocalVideoTrack | undefined;
    if (want && current && !current.isMuted) {
      current.restartTrack({ facingMode: frontCamera ? 'user' : 'environment' }).catch(() => undefined);
      return;
    }
    lp
      ?.setCameraEnabled(want, want ? { facingMode: frontCamera ? 'user' : 'environment' } : undefined)
      .catch(() => { if (want) onIssue('camera_denied'); });
  }, [lk, ready, videoAllowed, cameraOn, frontCamera, onIssue]);

  return (
    <>
      {remote && videoAllowed ? (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: '#000' }}>
          <rn.VideoTrack trackRef={remote as never} style={{ flex: 1 }} objectFit="cover" />
        </View>
      ) : <StageBackdrop peer={peer} />}
      {local && videoAllowed ? (
        <View style={[pipStyle, { top: top + 64 }]}>
          <rn.VideoTrack trackRef={local as never} style={{ flex: 1 }} objectFit="cover" mirror={frontCamera} zOrder={1} />
        </View>
      ) : null}
    </>
  );
}
