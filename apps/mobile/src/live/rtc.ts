import type { RealtimeChannel } from '@supabase/supabase-js';
import { sb } from '../cloud/client';
import { rtcPlatform, type RtcPlatform } from './rtc-platform';
import type { MediaIssue } from './stage';

/**
 * One direct call between two phones (WebRTC). Sound and image go straight
 * from one device to the other; the database only carries the short
 * « signalling » messages, on a private channel only the two participants
 * may use (see supabase/migrations/*_motek_calls.sql). Nothing is recorded.
 *
 * Two media slots are negotiated once at the start (audio + video). The
 * camera is only switched on when the call is in video AND I choose it:
 * turning it on or off never renegotiates, it just plugs or unplugs the
 * track (and the camera light goes off for real).
 */

type Signal =
  | { t: 'ready' }
  | { t: 'offer'; sdp: string }
  | { t: 'answer'; sdp: string }
  | { t: 'ice'; c: RTCIceCandidateInit }
  | { t: 'cam'; on: boolean };

export interface RtcView {
  status: 'connecting' | 'connected' | 'failed';
  issue: MediaIssue | null;
  /** My own camera, for the small preview. */
  local: MediaStream | null;
  /** The other person (sound + image). */
  remote: MediaStream | null;
  /** The other person's camera is on and sending. */
  peerCamera: boolean;
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  // Optional relay (TURN) for networks that block direct calls (some 4G/5G, company Wi-Fi).
  const turn = process.env.EXPO_PUBLIC_TURN_URLS;
  if (turn) servers.push({ urls: turn.split(','), username: process.env.EXPO_PUBLIC_TURN_USERNAME, credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL });
  return servers;
}

export class RtcSession {
  private readonly p: RtcPlatform | null = rtcPlatform();
  private pc: RTCPeerConnection | null = null;
  private ch: RealtimeChannel | null = null;
  private mic: MediaStreamTrack | null = null;
  private cam: MediaStreamTrack | null = null;
  private wantCamera = false;
  private front = true;
  private micOn = true;
  private remoteSet = false;
  private pendingIce: RTCIceCandidateInit[] = [];
  private offered = false;
  private readyTimer?: ReturnType<typeof setInterval>;
  private failTimer?: ReturnType<typeof setTimeout>;
  private stopAudio: (() => void) | null = null;
  private closed = false;
  private camBusy: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  view: RtcView = { status: 'connecting', issue: null, local: null, remote: null, peerCamera: false };

  constructor(readonly callId: string, private readonly initiator: boolean, private readonly onFailed: () => void) {}

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  get = () => this.view;
  private patch(p: Partial<RtcView>) { this.view = { ...this.view, ...p }; this.listeners.forEach((l) => l()); }

  async start() {
    const p = this.p;
    if (!p) { this.patch({ status: 'failed', issue: 'needs_dev_build' }); return; }
    try {
      this.mic = (await p.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })).getAudioTracks()[0] ?? null;
    } catch {
      this.patch({ issue: 'mic_denied' }); // I can still hear the other person.
    }
    if (this.closed) { this.mic?.stop(); return; }
    if (this.mic) this.mic.enabled = this.micOn;

    const pc = new p.RTCPeerConnection({ iceServers: iceServers() });
    this.pc = pc;
    const remote = new p.MediaStream();
    pc.ontrack = (e) => {
      if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
      if (e.track.kind === 'audio' && !this.stopAudio) this.stopAudio = p.playRemoteAudio(remote);
      this.patch({ remote });
    };
    pc.onicecandidate = (e) => { if (e.candidate) void this.send({ t: 'ice', c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      clearTimeout(this.failTimer);
      if (s === 'connected') {
        this.patch({ status: 'connected', issue: this.view.issue === 'connect_failed' ? null : this.view.issue });
        void this.send({ t: 'cam', on: !!this.cam }); // in case the first one was sent too early
      }
      else if (s === 'failed') this.fail();
      // A short network drop can recover by itself; past 12 s, the call is over.
      else if (s === 'disconnected') this.failTimer = setTimeout(() => this.fail(), 12_000);
    };

    if (this.initiator) {
      pc.addTransceiver(this.mic ?? 'audio', { direction: 'sendrecv' });
      pc.addTransceiver('video', { direction: 'sendrecv' });
    }

    await sb.realtime.setAuth();
    if (this.closed) return;
    this.ch = sb.channel(`call:${this.callId}`, { config: { private: true, broadcast: { self: false } } })
      .on('broadcast', { event: 'sig' }, ({ payload }) => void this.onSignal(payload as Signal))
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this.fail(); return; }
        // The answering side says « ready » until the offer arrives (the caller may join the channel a moment later).
        if (!this.initiator) {
          let n = 0;
          void this.send({ t: 'ready' });
          this.readyTimer = setInterval(() => {
            if (this.remoteSet || ++n > 20) { clearInterval(this.readyTimer); if (!this.remoteSet) this.fail(); return; }
            void this.send({ t: 'ready' });
          }, 1000);
        }
      });
  }

  setMic(on: boolean) { this.micOn = on; if (this.mic) this.mic.enabled = on; }

  /** On only when the call is in video and I chose it. Off = the camera is released. */
  setCamera(on: boolean, front = true) {
    const changed = on !== this.wantCamera || (on && front !== this.front);
    this.wantCamera = on; this.front = front;
    if (changed) this.camBusy = this.camBusy.then(() => this.applyCamera());
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.readyTimer); clearTimeout(this.failTimer);
    this.cam?.stop(); this.mic?.stop();
    this.stopAudio?.();
    this.pc?.close();
    if (this.ch) void sb.removeChannel(this.ch);
    this.pc = null; this.ch = null; this.cam = null; this.mic = null;
    this.listeners.clear();
  }

  private fail() {
    if (this.closed || this.view.status === 'failed') return;
    this.patch({ status: 'failed', issue: 'connect_failed' });
    this.onFailed();
  }

  private videoSender(): RTCRtpSender | null {
    return this.pc?.getTransceivers().find((t) => t.receiver.track?.kind === 'video')?.sender ?? null;
  }

  private async applyCamera() {
    if (this.closed || !this.p) return;
    const sender = this.videoSender();
    if (!this.wantCamera) {
      if (this.cam) { await sender?.replaceTrack(null).catch(() => undefined); this.cam.stop(); this.cam = null; }
      this.patch({ local: null });
      void this.send({ t: 'cam', on: false });
      return;
    }
    if (!sender) return; // negotiation not finished: applied again once it is.
    try {
      this.cam?.stop();
      const track = (await this.p.getUserMedia({ video: { facingMode: this.front ? 'user' : 'environment', width: { ideal: 720 }, height: { ideal: 1280 } } })).getVideoTracks()[0];
      if (!track) throw new Error('no_camera');
      if (this.closed || !this.wantCamera) { track.stop(); return; }
      this.cam = track;
      await sender.replaceTrack(track);
      this.patch({ local: new this.p.MediaStream([track]), issue: this.view.issue === 'camera_denied' ? null : this.view.issue });
      void this.send({ t: 'cam', on: true });
    } catch {
      this.patch({ issue: 'camera_denied', local: null });
      void this.send({ t: 'cam', on: false });
    }
  }

  private async onSignal(s: Signal) {
    const pc = this.pc;
    if (!pc || this.closed) return;
    try {
      switch (s.t) {
        case 'ready':
          if (!this.initiator || this.offered) return;
          this.offered = true;
          await pc.setLocalDescription(await pc.createOffer());
          await this.send({ t: 'offer', sdp: pc.localDescription!.sdp });
          return;
        case 'offer': {
          if (this.initiator || this.remoteSet) return;
          await pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
          this.remoteSet = true;
          clearInterval(this.readyTimer);
          for (const t of pc.getTransceivers()) {
            t.direction = 'sendrecv';
            if (t.receiver.track?.kind === 'audio' && this.mic) await t.sender.replaceTrack(this.mic);
          }
          await this.flushIce();
          await pc.setLocalDescription(await pc.createAnswer());
          await this.send({ t: 'answer', sdp: pc.localDescription!.sdp });
          this.camBusy = this.camBusy.then(() => this.applyCamera());
          return;
        }
        case 'answer':
          if (!this.initiator || this.remoteSet) return;
          await pc.setRemoteDescription({ type: 'answer', sdp: s.sdp });
          this.remoteSet = true;
          await this.flushIce();
          this.camBusy = this.camBusy.then(() => this.applyCamera());
          return;
        case 'ice':
          if (this.remoteSet) await pc.addIceCandidate(s.c).catch(() => undefined);
          else this.pendingIce.push(s.c);
          return;
        case 'cam':
          this.patch({ peerCamera: s.on });
          return;
      }
    } catch {
      this.fail();
    }
  }

  private async flushIce() {
    const list = this.pendingIce; this.pendingIce = [];
    for (const c of list) await this.pc?.addIceCandidate(c).catch(() => undefined);
  }

  private async send(payload: Signal) {
    if (!this.ch || this.closed) return;
    await this.ch.send({ type: 'broadcast', event: 'sig', payload }).catch(() => undefined);
  }
}

/* --- The current call's session, shared by the transport (owner) and the call screen (viewer). --- */
let active: RtcSession | null = null;
const watchers = new Set<() => void>();
export const rtcSessions = {
  get: () => active,
  set(s: RtcSession | null) { active = s; watchers.forEach((w) => w()); },
  subscribe(w: () => void) { watchers.add(w); return () => { watchers.delete(w); }; },
};
