import { RULES } from '@kapara/config';
import type { CallMode, CallSnapshot, CallState, LiveMember, LiveSearchFilters, LiveSettings, LiveStatus } from '@kapara/shared';
import { DEMO_PICKS, DEMO_PROFILES } from '../demo/profiles';
import { DEMO_PEOPLE, DEMO_VIEWER_KEY, demoUserId } from '../demo/people';
import { meStore } from '../me/store';
import { seeksMatch } from '../me/seeks';
import { Emitter, type Ack, type LiveServerEvent, type LiveTransport } from './transport';

/** Every fictional member Live can show (always flagged isDemo), with who they are and who they seek. */
const DEMO_LIVE_ALL = DEMO_PEOPLE.filter((p) => p.key !== DEMO_VIEWER_KEY).map((p) => {
  const profile = DEMO_PROFILES[demoUserId(p.key)]!;
  const member: LiveMember = {
    userId: profile.id, firstName: profile.firstName, age: profile.age, headline: profile.headline,
    photoUrl: profile.photos[0]?.url, verified: profile.verified, isDemo: true, regionCode: profile.regionCode,
  };
  return { member, gender: p.gender, seeks: p.seeks };
});
/** Today's planned Live faces first, then the others. */
const PLANNED = new Set(DEMO_PICKS.map((r) => r.profile.id));
DEMO_LIVE_ALL.sort((a, b) => Number(PLANNED.has(b.member.userId)) - Number(PLANNED.has(a.member.userId)));

/**
 * Fictional members shown in Live, following "Je recherche" both ways
 * (a man seeking women sees women seeking men, a man seeking men sees men
 * seeking men). Same rule as the database (public.seeks_match).
 */
export function demoLiveMembers(): LiveMember[] {
  const me = meStore.get();
  return DEMO_LIVE_ALL.filter((x) => seeksMatch(me, x)).map((x) => x.member).slice(0, 12);
}
export const isDemoLiveMember = (id: string) => DEMO_LIVE_ALL.some((x) => x.member.userId === id);

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
  /** Live "au hasard": my pending requests to fictional members. */
  private pending: CallSnapshot[] = [];
  private declinedBy = new Set<string>();
  private searchTimers: ReturnType<typeof setTimeout>[] = [];

  on(l: (e: LiveServerEvent) => void) { return this.events.on(l); }
  async connect() { this.events.emit({ type: 'connection', status: 'online' }); }
  disconnect() { this.clear(); this.stopSearchTimers(); this.pending = []; }

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
    return { ok: true as const, members: this.call ? demoLiveMembers().filter((m) => m.userId !== this.call?.peer.userId) : demoLiveMembers(), availableUntil: this.availableUntil };
  }

  async invite(to: string, mode: CallMode = 'audio'): Promise<Ack<{ call: CallSnapshot }>> {
    if (!this.settings.liveEnabled) return { ok: false, error: 'live_disabled' };
    const peer = demoLiveMembers().find((m) => m.userId === to);
    if (!peer || this.call) return { ok: false, error: 'not_available' };
    this.call = { callId: `demo-${Date.now()}`, state: 'invited', peer, direction: 'outgoing', mode };
    const id = this.call.callId;
    this.later(2600, () => this.peerAccepts(id));
    return { ok: true, call: { ...this.call } };
  }

  /**
   * Live "au hasard", simulated: a few fictional members are "called" at once;
   * some say no after a few seconds, one of them says yes.
   */
  async search(o: { fresh: boolean; filters: LiveSearchFilters; want: number }): Promise<Ack<{ pending: CallSnapshot[] }>> {
    if (!this.settings.liveEnabled) return { ok: false, error: 'live_disabled' };
    if (this.call) return { ok: false, error: 'not_allowed' };
    if (o.fresh) {
      this.stopSearchTimers();
      this.pending = [];
      // One of the requests is accepted after 6 to 10 seconds.
      this.laterSearch(6000 + Math.random() * 4000, () => this.someoneAccepts());
    }
    const taken = new Set(this.pending.map((p) => p.peer.userId));
    const all = demoLiveMembers();
    let pool = all.filter((m) => !taken.has(m.userId) && !this.declinedBy.has(m.userId));
    if (!pool.length) { this.declinedBy.clear(); pool = all.filter((m) => !taken.has(m.userId)); }
    pool = [...pool].sort(() => Math.random() - 0.5);
    while (this.pending.length < Math.min(Math.max(o.want, 1), 4) && pool.length) {
      const peer = pool.shift()!;
      const snap: CallSnapshot = { callId: `demo-${Date.now()}-${peer.userId}`, state: 'invited', peer, direction: 'outgoing', mode: 'video' };
      this.pending.push(snap);
      // Most people say no after a few seconds (the search then sends another request).
      if (Math.random() < 0.6) this.laterSearch(2500 + Math.random() * 4500, () => this.dropPending(snap.callId, true));
    }
    return { ok: true, pending: this.pending.map((p) => ({ ...p })) };
  }

  /* --- Live with a choice, simulated (fictional profiles, announced) --- */
  async liveHere(): Promise<Ack> { return this.settings.liveEnabled ? { ok: true } : { ok: false, error: 'live_disabled' }; }

  async liveSuggestions(): Promise<Ack<{ members: LiveMember[] }>> {
    if (!this.settings.liveEnabled) return { ok: false, error: 'live_disabled' };
    const ringing = new Set(this.pending.map((p) => p.peer.userId));
    return { ok: true, members: demoLiveMembers().filter((m) => !ringing.has(m.userId)).sort(() => Math.random() - 0.5) };
  }

  /** A fictional member "rings": some say no after a few seconds, some say yes. */
  async liveCall(peerId: string): Promise<Ack<{ pending: CallSnapshot[] }>> {
    if (!this.settings.liveEnabled) return { ok: false, error: 'live_disabled' };
    if (this.call) return { ok: false, error: 'not_allowed' };
    const peer = demoLiveMembers().find((m) => m.userId === peerId);
    if (!peer) return { ok: false, error: 'not_available' };
    if (!this.pending.some((p) => p.peer.userId === peerId)) {
      if (this.pending.length >= 5) return { ok: false, error: 'too_many_calls' };
      const snap: CallSnapshot = { callId: `demo-${Date.now()}-${peer.userId}`, state: 'invited', peer, direction: 'outgoing', mode: 'video' };
      this.pending.push(snap);
      if (Math.random() < 0.5) this.laterSearch(4000 + Math.random() * 5000, () => this.acceptPending(snap.callId));
      else this.laterSearch(3000 + Math.random() * 4000, () => this.dropPending(snap.callId, true));
    }
    return this.livePending();
  }

  async livePending(): Promise<Ack<{ pending: CallSnapshot[] }>> { return { ok: true, pending: this.pending.map((p) => ({ ...p })) }; }
  async liveCancel(callId: string): Promise<Ack> { this.dropPending(callId, false); return { ok: true }; }

  private acceptPending(callId: string) {
    const chosen = this.pending.find((p) => p.callId === callId);
    if (!chosen || this.call) return;
    this.stopSearchTimers();
    this.pending = [];
    this.call = { ...chosen };
    this.set('accepted');
    this.connect2(chosen.callId, true);
  }

  async searchStop() { this.stopSearchTimers(); this.pending = []; }
  async searchFiltersAllowed() { return false; }

  private dropPending(callId: string, declined: boolean) {
    const p = this.pending.find((x) => x.callId === callId);
    if (!p) return;
    if (declined) this.declinedBy.add(p.peer.userId);
    this.pending = this.pending.filter((x) => x.callId !== callId);
  }

  private someoneAccepts() {
    if (this.call) return;
    const chosen = this.pending[0];
    if (!chosen) { this.laterSearch(2000, () => this.someoneAccepts()); return; }
    this.stopSearchTimers();
    this.pending = [];
    this.call = { ...chosen };
    this.set('accepted');
    this.connect2(chosen.callId, true);
  }

  private laterSearch(ms: number, fn: () => void) { this.searchTimers.push(setTimeout(fn, ms)); }
  private stopSearchTimers() { this.searchTimers.forEach(clearTimeout); this.searchTimers = []; }

  simulateIncoming() {
    if (this.call) return;
    const list = demoLiveMembers();
    const peer = list[1] ?? list[0];
    if (!peer) return;
    // Live is face to face first: the fictional person proposes video (you can still answer in audio).
    this.call = { callId: `demo-${Date.now()}`, state: 'invited', peer, direction: 'incoming', mode: 'video' };
    const id = this.call.callId;
    this.events.emit({ type: 'invited', call: { ...this.call } });
    this.later(RULES.liveInviteTtlSeconds * 1000, () => { if (this.call?.callId === id && this.call.state === 'invited') this.end('expired'); });
  }

  async respond(callId: string, accept: boolean, video = false): Promise<Ack> {
    if (this.call?.callId !== callId || this.call.state !== 'invited') return { ok: false, error: 'not_found' };
    if (!accept) { this.end('declined'); return { ok: true }; }
    this.set('accepted');
    this.connect2(callId, video && this.call.mode === 'video');
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
    // The fictional person answers a video call in video.
    this.connect2(callId, this.call.mode === 'video');
  }

  private connect2(callId: string, video: boolean) {
    this.later(500, () => {
      if (this.call?.callId !== callId) return;
      this.events.emit({ type: 'join', callId, join: { mode: 'demo', room: callId, notice: 'demo_call_simulated' } });
      this.set(video ? 'video_on' : 'connected');
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
