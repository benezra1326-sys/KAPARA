import { io, type Socket } from 'socket.io-client';
import { LIVE_EVENTS_V1 as EV, type CallSnapshot, type JoinInfo, type LiveMember, type LiveSettings, type LiveStatus, type CallReportReason } from '@kapara/shared';
import { api, API_BASE, session } from '../api/client';
import { Emitter, type Ack, type LiveServerEvent, type LiveTransport } from './transport';

const TIMEOUT_MS = 8000;

/** Real Live API: REST for settings, socket.io namespace /live for presence and calls. */
export class SocketTransport implements LiveTransport {
  readonly kind = 'server' as const;
  private socket?: Socket;
  private readonly events = new Emitter<LiveServerEvent>();
  private usedToken: string | null = null;
  private lastAuthRetry = 0;

  on(l: (e: LiveServerEvent) => void) { return this.events.on(l); }

  async connect() {
    if (this.socket) return;
    this.events.emit({ type: 'connection', status: 'connecting' });
    // Access tokens are short-lived (15 min): ask the session at every (re)connection,
    // which refreshes the token first when it is about to expire.
    const s = io(`${API_BASE}/live`, {
      transports: ['websocket'],
      reconnectionDelayMax: 10_000,
      auth: (cb) => { void session.accessToken().catch(() => null).then((token) => { this.usedToken = token; cb({ token: token ?? '' }); }); },
    });
    this.socket = s;
    s.on('connect', () => this.events.emit({ type: 'connection', status: 'online' }));
    s.on('disconnect', () => this.events.emit({ type: 'connection', status: 'offline' }));
    s.on('connect_error', () => this.events.emit({ type: 'connection', status: 'offline' }));
    // Expired or invalid token: the server closes the socket. Retry once a little later,
    // by which time the app may have refreshed its access token.
    s.on('live:error', () => {
      this.events.emit({ type: 'connection', status: 'unauthorized' });
      // Refresh once and reconnect; at most every 30 s, so a server that keeps refusing never causes a loop.
      const used = this.usedToken;
      if (!used || Date.now() - this.lastAuthRetry < 30_000) return;
      this.lastAuthRetry = Date.now();
      void session.afterUnauthorized(used).catch(() => null).then((t) => { if (t && this.socket === s && !s.connected) s.connect(); });
    });
    s.on(EV.inviteReceived, (call: CallSnapshot) => this.events.emit({ type: 'invited', call }));
    s.on(EV.stateChanged, (call: CallSnapshot) => this.events.emit({ type: 'state', call }));
    s.on(EV.join, (p: { callId: string; join: JoinInfo }) => this.events.emit({ type: 'join', ...p }));
    s.on(EV.presenceChanged, (p: { selfAvailableUntil?: number | null }) => this.events.emit({ type: 'presence', ...p }));
  }

  disconnect() { this.socket?.disconnect(); this.socket = undefined; }

  status() { return api<LiveStatus>('/live/status'); }
  getSettings() { return api<LiveSettings>('/live/settings'); }
  saveSettings(s: LiveSettings) { return api<LiveSettings>('/live/settings', { method: 'PUT', body: JSON.stringify(s) }); }

  setPresence(available: boolean) { return this.ack<{ availableUntil: number | null }>(EV.presenceSet, { available }); }
  heartbeat() { return this.ack<{ availableUntil: number | null }>(EV.presenceHeartbeat, {}); }
  list() { return this.ack<{ members: LiveMember[]; availableUntil: number | null }>(EV.presenceList, {}); }
  invite(to: string) { return this.ack<{ call: CallSnapshot }>(EV.inviteSend, { to }); }
  respond(callId: string, accept: boolean) { return this.ack(EV.inviteRespond, { callId, accept }); }
  videoRequest(callId: string) { return this.ack(EV.videoRequest, { callId }); }
  videoRespond(callId: string, accept: boolean) { return this.ack(EV.videoRespond, { callId, accept }); }
  videoStop(callId: string) { return this.ack(EV.videoStop, { callId }); }
  hangup(callId: string) { return this.ack(EV.hangup, { callId }); }
  report(callId: string, reason: CallReportReason) { return this.ack(EV.report, { callId, reason, block: true }); }

  private async ack<T = object>(event: string, payload: unknown): Promise<Ack<T>> {
    if (!this.socket?.connected) return { ok: false, error: 'offline' };
    try {
      return await this.socket.timeout(TIMEOUT_MS).emitWithAck(event, payload);
    } catch {
      return { ok: false, error: 'timeout' };
    }
  }
}
