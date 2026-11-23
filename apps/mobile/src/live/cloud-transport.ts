import type { RealtimeChannel } from '@supabase/supabase-js';
import { RULES } from '@kapara/config';
import type { CallMode, CallReportReason, CallSnapshot, LiveSearchFilters, LiveSettings } from '@kapara/shared';
import { sb } from '../cloud/client';
import { cloud } from '../cloud/data';
import { DemoTransport, DEMO_LIVE_MEMBERS } from './demo-transport';
import { RtcSession, rtcSessions } from './rtc';
import { Emitter, type Ack, type LiveServerEvent, type LiveTransport } from './transport';

type Row = { id: string; caller_id: string; callee_id: string; state: string; video_requested_by: string | null; context?: string };
const TERMINAL = new Set(['ended', 'declined', 'expired']);
const ACTIVE = new Set(['connected', 'video_requested', 'video_on']);

/**
 * Real backend (Supabase) build.
 * - Calls with a real member (someone I have a conversation with) are REAL:
 *   the database keeps the call's state, the phones talk directly (WebRTC).
 * - Live "au hasard" is real too: present members get random video requests
 *   (live_here / live_search / live_leave). When nobody is there, the member
 *   can try it with fictional profiles, announced as a demo.
 */
export class CloudTransport implements LiveTransport {
  readonly kind = 'server' as const;
  private readonly demo = new DemoTransport();
  private readonly events = new Emitter<LiveServerEvent>();
  private ch: RealtimeChannel | null = null;
  private me: string | null = null;
  private call: { id: string; state: string; vrb: string | null; initiator: boolean } | null = null;
  private session: RtcSession | null = null;
  private ping?: ReturnType<typeof setInterval>;
  private ttl?: ReturnType<typeof setTimeout>;
  private hereAt = 0;
  private demoSearch = false;

  constructor() { this.demo.on((e) => this.events.emit(e)); }

  on(l: (e: LiveServerEvent) => void) { return this.events.on(l); }

  async connect() {
    await this.demo.connect();
    const { data } = await sb.auth.getUser();
    this.me = data.user?.id ?? null;
    if (!this.me) return;
    await sb.realtime.setAuth();
    // Only my own calls reach me (row-level security on public.calls).
    this.ch = sb.channel(`calls:${this.me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (p) => void this.onRow(p.new as Row))
      .subscribe();
  }

  disconnect() {
    this.demo.disconnect();
    if (this.hereAt) void this.leave();
    this.endLocal();
    if (this.ch) void sb.removeChannel(this.ch);
    this.ch = null;
  }

  /* --- Live lobby: still the demo --- */
  status() { return this.demo.status(); }
  getSettings() { return this.demo.getSettings(); }
  saveSettings(s: LiveSettings) { return this.demo.saveSettings(s); }
  setPresence(a: boolean) { return this.demo.setPresence(a); }
  heartbeat() { return this.demo.heartbeat(); }
  list() { return this.demo.list(); }
  simulateIncoming() { this.demo.simulateIncoming(); }

  private isDemoCall(id: string) { return id.startsWith('demo-'); }

  /* --- Live "au hasard" --- */
  async search(o: { fresh: boolean; filters: LiveSearchFilters; want: number; demo?: boolean }) {
    if (o.demo) {
      if (!this.demoSearch) { this.demoSearch = true; await this.leave(); }
      return this.demo.search(o);
    }
    if (this.demoSearch) { this.demoSearch = false; await this.demo.searchStop(); }
    // Being present = others may send me requests too. Refreshed every ~15 s.
    if (o.fresh || Date.now() - this.hereAt > 15_000) {
      const { data, error } = await sb.rpc('live_here', { want_gender: o.filters.gender ?? null, want_region: o.filters.regionCode ?? null });
      if (error) return { ok: false as const, error: 'offline' };
      if (!(data as Ack).ok) return data as Ack<{ pending: CallSnapshot[] }>;
      this.hereAt = Date.now();
    }
    const { data, error } = await sb.rpc('live_search', { want: o.want, fresh: o.fresh });
    if (error) return { ok: false as const, error: 'offline' };
    const r = data as { ok: boolean; error?: string; pending?: CallSnapshot[] };
    if (!r.ok) return { ok: false as const, error: r.error ?? 'unknown' };
    return { ok: true as const, pending: r.pending ?? [] };
  }

  async searchStop() {
    if (this.demoSearch) { this.demoSearch = false; await this.demo.searchStop(); return; }
    await this.leave();
  }

  async searchFiltersAllowed() {
    const { data, error } = await sb.rpc('live_filters_allowed');
    return !error && data === true;
  }

  private async leave() {
    this.hereAt = 0;
    await sb.rpc('live_leave').then(() => undefined, () => undefined);
  }

  /* --- Calls --- */
  async invite(to: string, mode: CallMode): Promise<Ack<{ call: CallSnapshot }>> {
    if (DEMO_LIVE_MEMBERS.some((m) => m.userId === to)) {
      // A fictional Live member is not reachable for real; Live without a setting turned on would refuse anyway.
      return this.demo.invite(to, mode);
    }
    const { data, error } = await sb.rpc('call_start', { peer: to, call_mode: mode });
    if (error) return { ok: false, error: 'offline' };
    const r = data as { ok: boolean; error?: string; call?: CallSnapshot };
    if (!r.ok || !r.call) return { ok: false, error: r.error ?? 'not_available' };
    this.track(r.call, true);
    // Expire my own invitation if nobody answers.
    this.ttl = setTimeout(() => { if (this.call?.id === r.call!.callId && this.call.state === 'invited') void this.rpc('call_end', { call_id: r.call!.callId, reason: 'expired' }); },
      RULES.liveInviteTtlSeconds * 1000);
    setTimeout(() => this.events.emit({ type: 'join', callId: r.call!.callId, join: { mode: 'webrtc', room: r.call!.callId, initiator: true } }), 0);
    return { ok: true, call: r.call };
  }

  respond(callId: string, accept: boolean, video = false) {
    return this.isDemoCall(callId) ? this.demo.respond(callId, accept, video) : this.rpc('call_respond', { call_id: callId, accept, with_video: video });
  }
  videoRequest(callId: string) { return this.isDemoCall(callId) ? this.demo.videoRequest(callId) : this.rpc('call_video', { call_id: callId, action: 'request' }); }
  videoRespond(callId: string, accept: boolean) {
    return this.isDemoCall(callId) ? this.demo.videoRespond(callId, accept) : this.rpc('call_video', { call_id: callId, action: accept ? 'accept' : 'decline' });
  }
  videoStop(callId: string) { return this.isDemoCall(callId) ? this.demo.videoStop(callId) : this.rpc('call_video', { call_id: callId, action: 'stop' }); }
  hangup(callId: string) { return this.isDemoCall(callId) ? this.demo.hangup(callId) : this.rpc('call_end', { call_id: callId }); }

  async report(callId: string, reason: CallReportReason): Promise<Ack> {
    if (this.isDemoCall(callId)) return this.demo.report(callId);
    const view = await this.view(callId);
    const r = await this.rpc('call_end', { call_id: callId });
    if (view) {
      const r2 = reason === 'inappropriate' ? 'inappropriate_content' : reason;
      await cloud.report({ userId: view.peer.userId, reason: r2, details: 'Signalé pendant un appel', context: 'conversation', alsoBlock: true }).catch(() => undefined);
    }
    return view ? { ok: true } : r;
  }

  /* --- internals --- */
  private async rpc(fn: string, args: Record<string, unknown>): Promise<Ack> {
    const { data, error } = await sb.rpc(fn, args);
    if (error) return { ok: false, error: 'offline' };
    return (data as Ack) ?? { ok: true };
  }

  private async view(id: string): Promise<CallSnapshot | null> {
    const { data } = await sb.rpc('call_view', { call_id: id });
    return (data as CallSnapshot | null) ?? null;
  }

  private track(c: CallSnapshot, initiator: boolean) {
    this.call = { id: c.callId, state: c.state, vrb: null, initiator };
  }

  private async onRow(row: Row) {
    if (!row?.id || !this.me) return;
    // A new invitation for me, while I am free.
    if (row.state === 'invited' && row.callee_id === this.me && !this.call) {
      const v = await this.view(row.id);
      if (!v || v.state !== 'invited') return;
      this.track(v, false);
      this.events.emit({ type: 'invited', call: v });
      setTimeout(() => this.events.emit({ type: 'join', callId: v.callId, join: { mode: 'webrtc', room: v.callId, initiator: false } }), 0);
      // If the caller disappears without cancelling, the ring stops by itself.
      this.ttl = setTimeout(() => {
        if (this.call?.id === v.callId && this.call.state === 'invited') {
          this.events.emit({ type: 'state', call: { ...v, state: 'expired' } });
          this.endLocal();
        }
      }, RULES.liveInviteTtlSeconds * 1000);
      return;
    }
    // Live "au hasard": one of my requests was accepted, the call starts (I make the offer).
    if (row.caller_id === this.me && row.context === 'live' && ACTIVE.has(row.state) && !this.call) {
      this.call = { id: row.id, state: 'invited', vrb: null, initiator: true };
      this.events.emit({ type: 'join', callId: row.id, join: { mode: 'webrtc', room: row.id, initiator: true } });
    }
    if (this.call?.id !== row.id) return;
    // Keep-alive pings only touch updated_at: nothing to show.
    if (row.state === this.call.state && row.video_requested_by === this.call.vrb) return;
    this.call.state = row.state; this.call.vrb = row.video_requested_by;
    const v = await this.view(row.id);
    const snapshot: CallSnapshot | null = v ? { ...v, state: row.state as CallSnapshot['state'] } : null;
    if (ACTIVE.has(row.state)) this.startMedia();
    if (snapshot) this.events.emit({ type: 'state', call: snapshot });
    if (TERMINAL.has(row.state)) this.endLocal();
  }

  private startMedia() {
    if (!this.call || this.session) return;
    clearTimeout(this.ttl);
    const id = this.call.id;
    const s = new RtcSession(id, this.call.initiator, () => void this.rpc('call_end', { call_id: id }));
    this.session = s;
    rtcSessions.set(s);
    void s.start();
    this.ping = setInterval(() => void sb.rpc('call_ping', { call_id: id }), 20_000);
  }

  private endLocal() {
    clearTimeout(this.ttl); clearInterval(this.ping);
    this.session?.close();
    this.session = null;
    rtcSessions.set(null);
    this.call = null;
  }
}
