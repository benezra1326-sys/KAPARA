import type { CallMode, CallSnapshot, JoinInfo, LiveMember, LiveMode, LiveSearchFilters, LiveSettings, CallReportReason } from '@kapara/shared';
import type { LiveTransport } from './transport';
import { callQuota, type CallContext } from './quota';

export interface EndedCall { peer: LiveMember; state: 'ended' | 'declined' | 'expired'; durationSec: number; direction: CallSnapshot['direction'] }

/** Live "au hasard": requests sent at random, the first yes starts the call. */
export interface LiveSearch {
  status: 'idle' | 'searching';
  /** My requests waiting for an answer (3 at a time). */
  pending: CallSnapshot[];
  /** Fictional profiles (announced), when nobody real is in Live. */
  demo: boolean;
  /** Since when nobody could be reached (null = someone is being called). */
  emptySince: number | null;
  filters: LiveSearchFilters;
}

/** How many requests ring at the same time. */
export const LIVE_PARALLEL_REQUESTS = 3;

export interface LiveState {
  /** demo = nothing is transmitted. `local` = no server at all (fictional members). */
  mode: LiveMode | 'unknown';
  local: boolean;
  connection: 'connecting' | 'online' | 'offline' | 'unauthorized';
  settings: LiveSettings | null;
  settingsError: boolean;
  availableUntil: number | null;
  members: LiveMember[];
  membersStatus: 'idle' | 'loading' | 'ready' | 'error';
  call: CallSnapshot | null;
  join: JoinInfo | null;
  connectedAt: number | null;
  lastEnded: EndedCall | null;
  /** Last action error, as an i18n key suffix (live.errors.*). */
  error: string | null;
  search: LiveSearch;
  /** Gender and city filters allowed (paid plans). null = not known yet. */
  filtersAllowed: boolean | null;
  /** Someone accepted one of my random requests: the Live screen opens this call. */
  searchMatch: string | null;
}

const initial = (local: boolean): LiveState => ({
  mode: local ? 'demo' : 'unknown', local, connection: 'connecting',
  settings: null, settingsError: false, availableUntil: null,
  members: [], membersStatus: 'idle',
  call: null, join: null, connectedAt: null, lastEnded: null, error: null,
  search: { status: 'idle', pending: [], demo: false, emptySince: null, filters: {} }, filtersAllowed: null, searchMatch: null,
});

const TERMINAL = new Set(['ended', 'declined', 'expired']);

/** Client-side Live state. The server is the source of truth; this mirrors it. */
export class LiveStore {
  private state: LiveState;
  private readonly listeners = new Set<() => void>();
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private context: CallContext = 'live';
  private pendingJoinFor: string | null = null;
  private onIncoming?: (call: CallSnapshot) => void;
  private searchTimer?: ReturnType<typeof setInterval>;
  private searchBusy = false;
  /** A search was running when a call arrived: it resumes if that call never connects. */
  private resumeSearch = false;

  constructor(private readonly t: LiveTransport) {
    this.state = initial(t.kind === 'local-demo');
    t.on((e) => {
      switch (e.type) {
        case 'connection':
          this.patch({ connection: e.status });
          if (e.status === 'online') void this.refresh();
          break;
        case 'invited':
          this.context = 'live';
          if (this.state.search.status === 'searching') {
            this.pauseSearch();
            // My own requests stop, so nobody accepts them while I answer this one.
            void this.t.searchStop?.().catch(() => undefined);
          }
          this.patch({ call: e.call, join: null, lastEnded: null });
          this.onIncoming?.(e.call);
          break;
        case 'state': this.applyCall(e.call); break;
        case 'join':
          if (!this.state.call || this.state.call.callId === e.callId) { this.pendingJoinFor = e.callId; this.patch({ join: e.join }); }
          break;
        case 'presence':
          if ('selfAvailableUntil' in e) this.patch({ availableUntil: e.selfAvailableUntil ?? null });
          void this.loadMembers();
          break;
      }
    });
  }

  /* --- subscription (useSyncExternalStore) --- */
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  get = () => this.state;
  private patch(p: Partial<LiveState>) { this.state = { ...this.state, ...p }; this.listeners.forEach((l) => l()); }

  setIncomingHandler(fn: (call: CallSnapshot) => void) { this.onIncoming = fn; }

  async start() {
    await this.t.connect();
    this.heartbeatTimer = setInterval(() => void this.beat(), 30_000);
  }
  stop() { clearInterval(this.heartbeatTimer); this.stopSearchLoop(); this.t.disconnect(); }

  /* --- Live "au hasard" --- */
  get canSearch() { return typeof this.t.search === 'function'; }

  async loadFiltersAllowed() {
    const allowed = await (this.t.searchFiltersAllowed?.() ?? Promise.resolve(false)).catch(() => false);
    this.patch({ filtersAllowed: allowed });
    if (!allowed && (this.state.search.filters.gender || this.state.search.filters.regionCode)) this.setFilters({});
    return allowed;
  }

  setFilters(filters: LiveSearchFilters) {
    this.patch({ search: { ...this.state.search, filters } });
    if (this.state.search.status === 'searching') void this.tick(true);
  }

  /** Start sending random video requests. `demo`: with fictional profiles. */
  async startSearch(demo = false) {
    if (!this.t.search || this.state.call) return false;
    this.patch({ error: null, lastEnded: null });
    const allowed = await callQuota().check({ mode: 'video', context: 'live' });
    if (!allowed.ok) { this.patch({ error: allowed.reason }); return false; }
    this.stopSearchLoop();
    this.patch({ search: { ...this.state.search, status: 'searching', pending: [], demo, emptySince: null } });
    const ok = await this.tick(true);
    if (ok) this.searchTimer = setInterval(() => void this.tick(false), 2500);
    return ok;
  }

  async stopSearch() {
    this.resumeSearch = false;
    this.stopSearchLoop();
    this.patch({ search: { ...this.state.search, status: 'idle', pending: [], emptySince: null } });
    await this.t.searchStop?.().catch(() => undefined);
  }

  private stopSearchLoop() { clearInterval(this.searchTimer); this.searchTimer = undefined; }

  /** A call arrived (or started): the search stops ringing others. */
  private pauseSearch() {
    if (this.state.search.status !== 'searching') return;
    this.resumeSearch = true;
    this.stopSearchLoop();
    this.patch({ search: { ...this.state.search, status: 'idle', pending: [], emptySince: null } });
  }

  private async tick(fresh: boolean) {
    if (!this.t.search || this.state.search.status !== 'searching' || this.state.call) return false;
    if (this.searchBusy && !fresh) return true;
    this.searchBusy = true;
    const { filters, demo } = this.state.search;
    const r = await this.t.search({ fresh, filters, want: LIVE_PARALLEL_REQUESTS, demo }).catch(() => ({ ok: false as const, error: 'offline' }));
    this.searchBusy = false;
    if (this.state.search.status !== 'searching' || this.state.call) return false;
    if (!r.ok) {
      this.stopSearchLoop();
      this.patch({ error: r.error, search: { ...this.state.search, status: 'idle', pending: [], emptySince: null } });
      return false;
    }
    const emptySince = r.pending.length ? null : this.state.search.emptySince ?? Date.now();
    this.patch({ search: { ...this.state.search, pending: r.pending, emptySince } });
    return true;
  }

  async refresh() {
    try {
      const [status, settings] = await Promise.all([this.t.status(), this.t.getSettings()]);
      this.patch({ mode: status.mode, settings, settingsError: false });
    } catch {
      this.patch({ settingsError: true });
    }
    await this.loadMembers();
  }

  async loadMembers() {
    if (this.state.membersStatus !== 'ready') this.patch({ membersStatus: 'loading' });
    const r = await this.t.list().catch(() => ({ ok: false as const, error: 'offline' }));
    if (r.ok) this.patch({ members: r.members, availableUntil: r.availableUntil, membersStatus: 'ready' });
    else this.patch({ membersStatus: 'error' });
  }

  async saveSettings(s: LiveSettings) {
    const previous = this.state.settings;
    this.patch({ settings: s, error: null }); // optimistic
    try {
      this.patch({ settings: await this.t.saveSettings(s) });
      if (!s.liveEnabled && this.state.availableUntil) await this.setAvailable(false);
      return true;
    } catch {
      this.patch({ settings: previous, error: 'save_failed' });
      return false;
    }
  }

  async setAvailable(available: boolean) {
    const r = await this.t.setPresence(available);
    if (r.ok) this.patch({ availableUntil: r.availableUntil, error: null });
    else this.patch({ error: r.error });
  }

  /** Propose a call. `context` tells quotas where it comes from (Live or a conversation). */
  async invite(member: LiveMember, mode: CallMode = 'audio', context: CallContext = 'live') {
    this.patch({ error: null, lastEnded: null });
    const allowed = await callQuota().check({ mode, context });
    if (!allowed.ok) { this.patch({ error: allowed.reason }); return null; }
    this.context = context;
    const r = await this.t.invite(member.userId, mode);
    if (!r.ok) { this.patch({ error: r.error }); return null; }
    // A transport may already have sent the media details (join) for this call: keep them.
    this.patch({ call: r.call, join: this.state.join && this.pendingJoinFor === r.call.callId ? this.state.join : null });
    return r.call;
  }

  /** `video`: answer a video call with my camera on; otherwise audio only, camera off. */
  respond(accept: boolean, video = false) { return this.withCall((id) => this.t.respond(id, accept, video)); }
  requestVideo() { return this.withCall((id) => this.t.videoRequest(id)); }
  respondVideo(accept: boolean) { return this.withCall((id) => this.t.videoRespond(id, accept)); }
  stopVideo() { return this.withCall((id) => this.t.videoStop(id)); }
  hangup() { return this.withCall((id) => this.t.hangup(id)); }
  report(reason: CallReportReason) { return this.withCall((id) => this.t.report(id, reason)); }
  simulateIncoming() { this.t.simulateIncoming?.(); }
  clearSearchMatch() { this.patch({ searchMatch: null }); }
  clearEnded() { this.patch({ lastEnded: null }); }
  clearError() { this.patch({ error: null }); }

  private async withCall(fn: (callId: string) => Promise<{ ok: boolean; error?: string }>) {
    const id = this.state.call?.callId;
    if (!id) return false;
    const r = await fn(id);
    if (!r.ok) this.patch({ error: r.error ?? 'unknown' });
    return r.ok;
  }

  private applyCall(call: CallSnapshot) {
    if (this.state.call && this.state.call.callId !== call.callId) return;
    if (!this.state.call && !TERMINAL.has(call.state)) {
      if (this.state.search.status === 'searching') {
        this.context = 'live';
        if (call.direction === 'outgoing') this.patch({ searchMatch: call.callId });
      }
      this.pauseSearch();
    }
    if (TERMINAL.has(call.state)) {
      const durationSec = this.state.connectedAt ? Math.round((Date.now() - this.state.connectedAt) / 1000) : 0;
      if (this.state.connectedAt) callQuota().record?.({ mode: call.mode ?? 'audio', context: this.context, durationSec, direction: call.direction });
      this.patch({
        call: null, join: null, connectedAt: null,
        lastEnded: { peer: call.peer, state: call.state as EndedCall['state'], durationSec, direction: call.direction },
      });
      void this.loadMembers();
      if (this.resumeSearch) {
        this.resumeSearch = false;
        // Declined or missed: back to searching. After a real conversation, the member decides.
        if (!durationSec && call.direction === 'incoming') void this.startSearch(this.state.search.demo);
        else void this.t.searchStop?.().catch(() => undefined);
      }
      return;
    }
    const connectedAt = this.state.connectedAt ?? (call.state === 'connected' || call.state === 'video_on' ? Date.now() : null);
    this.patch({ call, connectedAt });
  }

  private async beat() {
    if (!this.state.availableUntil) return;
    const r = await this.t.heartbeat().catch(() => null);
    if (r?.ok) this.patch({ availableUntil: r.availableUntil });
  }
}
