import { RULES } from '@kapara/config';
import type { CallSnapshot, CallState, LiveMember, LiveSettings, LiveStatus } from '@kapara/shared';
import { DEMO_PICKS } from '../demo/profiles';
import { Emitter, type Ack, type LiveServerEvent, type LiveTransport } from './transport';

/** Fictional members shown in Live when the app runs without a server. Always flagged isDemo. */
export const DEMO_LIVE_MEMBERS: LiveMember[] = DEMO_PICKS.map((r) => ({
  userId: r.profile.id,
  firstName: r.profile.firstName,
  age: r.profile.age,
  headline: r.profile.headline,
  photoUrl: r.profile.photos[0]?.url,
  verified: r.profile.verified,
  isDemo: true,
}));

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Local simulation of the Live server, used when the app runs without an API
 * (EXPO_PUBLIC_DEMO). It follows exactly the same consent steps as the server;
 * the fictional person "answers" after a short delay. Nothing is transmitted:
 * the UI says so on every screen.
 */
export class DemoTransport implements LiveTransport {
  readonly kind = 'local-demo' as const;
  private readonly events = new Emitter<LiveServerEvent>();
  private settings: LiveSettings = { liveEnabled: false, liveCallsFrom: 'matches' };
  private availableUntil: number | null = null;
  private call: (CallSnapshot & { requestedByPeerOnce?: boolean }) | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  on(l: (e: LiveServerEvent) => void) { return this.events.on(l); }
  async connect() { this.events.emit({ type: 'connection', status: 'online' }); }
  disconnect() { this.clear(); }

  async status(): Promise<LiveStatus> {
    return { mode: 'demo', availabilityMinutes: RULES.liveAvailabilityMinutes, inviteTtlSeconds: RULES.liveInviteTtlSeconds };
  }
  async getSettings() { return this.settings; }
  async saveSettings(s: LiveSettings) {
    await wait(250);
    this.settings = s;
    if (!s.liveEnabled) this.availableUntil = null;
    return s;
  }

  async setPresence(available: boolean): Promise<Ack<{ availableUntil: number | null }>> {
    if (available && !this.settings.liveEnabled) return { ok: false, error: 'live_disabled' };
    this.availableUntil = available ? Date.now() + RULES.liveAvailabilityMinutes * 60_000 : null;
    return { ok: true, availableUntil: this.availableUntil };
  }
  async heartbeat() {
    if (this.availableUntil && this.availableUntil < Date.now()) this.availableUntil = null;
    return { ok: true as const, availableUntil: this.availableUntil };
  }
  async list() {
    await wait(400);
    // The demo shows fictional members even when you are invisible, to explore the screen.
    return { ok: true as const, members: this.call ? DEMO_LIVE_MEMBERS.filter((m) => m.userId !== this.call?.peer.userId) : DEMO_LIVE_MEMBERS, availableUntil: this.availableUntil };
  }

  async invite(to: string): Promise<Ack<{ call: CallSnapshot }>> {
    if (!this.settings.liveEnabled) return { ok: false, error: 'live_disabled' };
    const peer = DEMO_LIVE_MEMBERS.find((m) => m.userId === to);
    if (!peer || this.call) return { ok: false, error: 'not_available' };
    this.call = { callId: `demo-${Date.now()}`, state: 'invited', peer, direction: 'outgoing' };
    const id = this.call.callId;
    this.later(2600, () => this.peerAccepts(id));
    return { ok: true, call: { ...this.call } };
  }

  simulateIncoming() {
    if (this.call) return;
    const peer = DEMO_LIVE_MEMBERS[1] ?? DEMO_LIVE_MEMBERS[0]!;
    this.call = { callId: `demo-${Date.now()}`, state: 'invited', peer, direction: 'incoming' };
    const id = this.call.callId;
    this.events.emit({ type: 'invited', call: { ...this.call } });
    this.later(RULES.liveInviteTtlSeconds * 1000, () => { if (this.call?.callId === id && this.call.state === 'invited') this.end('expired'); });
  }

  async respond(callId: string, accept: boolean): Promise<Ack> {
    if (this.call?.callId !== callId || this.call.state !== 'invited') return { ok: false, error: 'not_found' };
    if (!accept) { this.end('declined'); return { ok: true }; }
    this.set('accepted');
    this.connect2(callId);
    return { ok: true };
  }

  async videoRequest(callId: string): Promise<Ack> {
    if (this.call?.callId !== callId || this.call.state !== 'connected') return { ok: false, error: 'not_allowed' };
    this.set('video_requested', 'me');
    this.later(2200, () => { if (this.call?.callId === callId && this.call.state === 'video_requested') this.set('video_on'); });
    return { ok: true };
  }

  async videoRespond(callId: string, accept: boolean): Promise<Ack> {
    if (this.call?.callId !== callId || this.call.state !== 'video_requested' || this.call.videoRequestedBy !== 'peer') return { ok: false, error: 'not_allowed' };
    this.set(accept ? 'video_on' : 'connected');
    return { ok: true };
  }

  async videoStop(callId: string): Promise<Ack> {
    if (this.call?.callId !== callId || this.call.state !== 'video_on') return { ok: false, error: 'not_allowed' };
    this.set('connected');
    return { ok: true };
  }

  async hangup(callId: string): Promise<Ack> {
    if (this.call?.callId !== callId) return { ok: false, error: 'not_found' };
    this.end('ended');
    return { ok: true };
  }

  async report(callId: string): Promise<Ack> {
    await wait(300);
    return this.hangup(callId);
  }

  private peerAccepts(callId: string) {
    if (this.call?.callId !== callId || this.call.state !== 'invited') return;
    this.set('accepted');
    this.connect2(callId);
  }

  private connect2(callId: string) {
    this.later(500, () => {
      if (this.call?.callId !== callId) return;
      this.events.emit({ type: 'join', callId, join: { mode: 'demo', room: callId, notice: 'demo_call_simulated' } });
      this.set('connected');
      // Once per call, the fictional person proposes video, to show the consent step.
      this.later(14_000, () => {
        if (this.call?.callId === callId && this.call.state === 'connected' && !this.call.requestedByPeerOnce) {
          this.call.requestedByPeerOnce = true;
          this.set('video_requested', 'peer');
        }
      });
    });
  }

  private set(state: CallState, videoRequestedBy?: 'me' | 'peer') {
    if (!this.call) return;
    this.call = { ...this.call, state, videoRequestedBy: state === 'video_requested' ? videoRequestedBy : undefined };
    const { requestedByPeerOnce: _, ...snapshot } = this.call;
    this.events.emit({ type: 'state', call: snapshot });
  }

  private end(state: 'ended' | 'declined' | 'expired') {
    this.set(state);
    this.call = null;
    this.clear();
  }

  private later(ms: number, fn: () => void) { this.timers.push(setTimeout(fn, ms)); }
  private clear() { this.timers.forEach(clearTimeout); this.timers = []; }
}
