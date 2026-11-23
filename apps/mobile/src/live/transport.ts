import type { CallMode, CallSnapshot, InviteRefusal, JoinInfo, LiveMember, LiveSearchFilters, LiveSettings, LiveStatus, CallReportReason } from '@kapara/shared';

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: InviteRefusal | string };

export type LiveServerEvent =
  | { type: 'connection'; status: 'connecting' | 'online' | 'offline' | 'unauthorized' }
  | { type: 'invited'; call: CallSnapshot }
  | { type: 'state'; call: CallSnapshot }
  | { type: 'join'; callId: string; join: JoinInfo }
  /** `selfAvailableUntil` present = my own availability changed; absent = refetch the list. */
  | { type: 'presence'; selfAvailableUntil?: number | null };

/** The Live API as the app sees it. Two implementations: socket.io (real API) and local demo. */
export interface LiveTransport {
  readonly kind: 'server' | 'local-demo';
  connect(): Promise<void>;
  disconnect(): void;
  on(listener: (e: LiveServerEvent) => void): () => void;

  status(): Promise<LiveStatus>;
  getSettings(): Promise<LiveSettings>;
  saveSettings(s: LiveSettings): Promise<LiveSettings>;

  setPresence(available: boolean): Promise<Ack<{ availableUntil: number | null }>>;
  heartbeat(): Promise<Ack<{ availableUntil: number | null }>>;
  list(): Promise<Ack<{ members: LiveMember[]; availableUntil: number | null }>>;

  /** `mode`: what I propose. The other person may still answer in audio only. */
  invite(to: string, mode: CallMode): Promise<Ack<{ call: CallSnapshot }>>;
  /** `video`: answer a video call with my camera on. */
  respond(callId: string, accept: boolean, video?: boolean): Promise<Ack>;
  videoRequest(callId: string): Promise<Ack>;
  videoRespond(callId: string, accept: boolean): Promise<Ack>;
  videoStop(callId: string): Promise<Ack>;
  hangup(callId: string): Promise<Ack>;
  report(callId: string, reason: CallReportReason): Promise<Ack>;

  /**
   * Live "au hasard": keep `want` video requests pending to random members.
   * `fresh` = a new search (counts in the daily quota). `demo` = fictional
   * profiles, announced as such. The first person who accepts gets a normal
   * call (join + state events); the other requests stop.
   */
  search?(o: { fresh: boolean; filters: LiveSearchFilters; want: number; demo?: boolean }): Promise<Ack<{ pending: CallSnapshot[] }>>;
  /** Leave Live: my pending requests stop and nobody can reach me through it. */
  searchStop?(): Promise<void>;
  /** May I choose gender and city? (paid plans) */
  searchFiltersAllowed?(): Promise<boolean>;

  /** Local demo only: pretend a demo member invites me. */
  simulateIncoming?(): void;
}

export class Emitter<E> {
  private readonly ls = new Set<(e: E) => void>();
  on(l: (e: E) => void) { this.ls.add(l); return () => { this.ls.delete(l); }; }
  emit(e: E) { for (const l of this.ls) l(e); }
}
