import * as SecureStore from 'expo-secure-store';
import { io, type Socket } from 'socket.io-client';
import { LIVE_EVENTS_V1 as EV, type CallSnapshot, type JoinInfo, type LiveMember, type LiveSettings, type LiveStatus, type ReportReason } from '@kapara/shared';
import { api, API_BASE } from '../api/client';
import { Emitter, type Ack, type LiveServerEvent, type LiveTransport } from './transport';

const TIMEOUT_MS = 8000;

/** Real Live API: REST for settings, socket.io namespace /live for presence and calls. */
export class SocketTransport implements LiveTransport {
  readonly kind = 'server' as const;
  private socket?: Socket;
  private readonly events = new Emitter<LiveServerEvent>();

  on(l: (e: LiveServerEvent) => void) { return this.events.on(l); }

  async connect() {
    if (this.socket) return;
    const token = await SecureStore.getItemAsync('token').catch(() => null);
    this.events.emit({ type: 'connection', status: 'connecting' });
    const s = io(`${API_BASE}/live`, { transports: ['websocket'], auth: { token: token ?? '' }, reconnectionDelayMax: 10_000 });
    this.socket = s;
    s.on('connect', () => this.events.emit({ type: 'connection', status: 'online' }));
    s.on('disconnect', () => this.events.emit({ type: 'connection', status: 'offline' }));
    s.on('connect_error', () => this.events.emit({ type: 'connection', status: 'offline' }));
    s.on('live:error', () => this.events.emit({ type: 'connection', status: 'unauthorized' }));
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
  report(callId: string, reason: ReportReason) { return this.ack(EV.report, { callId, reason, block: true }); }

  private async ack<T = object>(event: string, payload: unknown): Promise<Ack<T>> {
    if (!this.socket?.connected) return { ok: false, error: 'offline' };
    try {
      return await this.socket.timeout(TIMEOUT_MS).emitWithAck(event, payload);
    } catch {
      return { ok: false, error: 'timeout' };
    }
  }
}
