import { Inject, Logger, type OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { z } from 'zod';
import { RULES } from '@kapara/config';
import { LIVE_EVENTS_V1 as EV, LivePayloads as P, type CallSnapshot, type InviteRefusal, type LiveMember } from '@kapara/shared';
import { isTerminal, type CallEvent } from './call-machine';
import { canReach } from './call-policy';
import { CallRegistry, type Call } from './call-registry';
import { LiveKitService } from './livekit.service';
import type { LiveRepository } from './live.repository';
import { LIVE_REPO } from './tokens';
import { PresenceStore } from './presence.store';

type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: InviteRefusal | string };

const VIDEO_REQUEST_TTL_MS = 30_000;
const RECONNECT_GRACE_MS = 20_000;
const SWEEP_MS = 15_000;

function parse<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> | null {
  const r = schema.safeParse(body);
  return r.success ? r.data : null;
}

/**
 * Live: presence, invitations and call signalling over socket.io.
 * Consent is enforced here, step by step: availability (opt-in, 15 min),
 * invitation (callee's "who can call me", blocks, preferences, cooldowns),
 * acceptance (audio only), then video (asked by one, accepted by the other,
 * and only then granted by the media server).
 */
@WebSocketGateway({ namespace: '/live', cors: { origin: true } })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private readonly log = new Logger(LiveGateway.name);
  readonly presence = new PresenceStore();
  readonly calls = new CallRegistry();
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();
  private readonly sweeper = setInterval(() => this.sweep(), SWEEP_MS);

  constructor(
    private readonly jwt: JwtService,
    private readonly livekit: LiveKitService,
    @Inject(LIVE_REPO) private readonly repo: LiveRepository,
  ) {
    this.sweeper.unref?.();
  }

  onModuleDestroy() { clearInterval(this.sweeper); }

  async handleConnection(socket: Socket) {
    try {
      const token = String(socket.handshake.auth?.token ?? '');
      const { sub, typ } = await this.jwt.verifyAsync<{ sub: string; typ?: string }>(token);
      if (typ !== 'access') throw new Error('wrong_token_type'); // refresh tokens never open a socket
      if (!(await this.repo.exists(sub))) throw new Error('unknown_user');
      socket.data.userId = sub;
      await socket.join(`user:${sub}`);
      clearTimeout(this.graceTimers.get(sub));
      this.graceTimers.delete(sub);
      // Reconnected during a call: resend where things stand.
      const call = this.calls.callOf(sub);
      if (call) socket.emit(EV.stateChanged, this.snapshot(call, sub));
    } catch {
      socket.emit('live:error', { error: 'unauthorized' });
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket) {
    const id = socket.data.userId as string | undefined;
    if (!id) return;
    if (this.presence.dropSocket(id, socket.id)) this.broadcastPresence();
    const left = await this.server.in(`user:${id}`).fetchSockets().then((s) => s.length).catch(() => 0);
    if (left > 0 || !this.calls.callOf(id)) return;
    // Give a dropped connection a moment to come back before ending the call.
    this.graceTimers.set(id, setTimeout(() => {
      this.graceTimers.delete(id);
      const call = this.calls.callOf(id);
      if (call) void this.transition(call, 'hangup', id);
    }, RECONNECT_GRACE_MS));
  }

  /* ----------------------------- presence ----------------------------- */

  @SubscribeMessage(EV.presenceSet)
  async setPresence(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack<{ availableUntil: number | null }>> {
    const b = parse(P.presenceSet, body);
    if (!b) return { ok: false, error: 'invalid_input' };
    const me = s.data.userId as string;
    if (b.available) {
      const facts = (await this.repo.facts([me])).get(me);
      if (!facts?.liveEnabled || facts.paused) return { ok: false, error: 'live_disabled' };
    }
    const availableUntil = this.presence.set(me, s.id, b.available);
    this.broadcastPresence();
    return { ok: true, availableUntil };
  }

  @SubscribeMessage(EV.presenceHeartbeat)
  heartbeat(@ConnectedSocket() s: Socket): Ack<{ availableUntil: number | null }> {
    const me = s.data.userId as string;
    this.presence.heartbeat(me);
    return { ok: true, availableUntil: this.presence.availableUntil(me) };
  }

  /** Available members I am allowed to see and call, filtered per viewer. */
  @SubscribeMessage(EV.presenceList)
  async listPresence(@ConnectedSocket() s: Socket): Promise<Ack<{ members: LiveMember[]; availableUntil: number | null }>> {
    const me = s.data.userId as string;
    const candidates = this.presence.sweep().available.filter((id) => id !== me && !this.calls.isBusy(id));
    const reachable = await this.reachable(me, candidates);
    return { ok: true, members: await this.repo.members(reachable), availableUntil: this.presence.availableUntil(me) };
  }

  /* ---------------------------- invitations --------------------------- */

  @SubscribeMessage(EV.inviteSend)
  async invite(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack<{ call: CallSnapshot }>> {
    const b = parse(P.invite, body);
    if (!b) return { ok: false, error: 'invalid_input' };
    const me = s.data.userId as string;
    const refusal = this.calls.check(me, b.to)
      ?? (this.presence.isAvailable(b.to) ? null : 'not_available')
      ?? (await this.policy(me, b.to));
    if (refusal) return { ok: false, error: refusal };

    const cards = Object.fromEntries((await this.repo.members([me, b.to])).map((m) => [m.userId, m]));
    if (!cards[me] || !cards[b.to]) return { ok: false, error: 'not_available' };
    const call = this.calls.create(me, b.to, this.livekit.mode === 'demo', cards);
    call.timer = setTimeout(() => void this.transition(call, 'timeout'), RULES.liveInviteTtlSeconds * 1000);
    void this.repo.logCall(call.id, me, b.to, call.demo);
    this.server.to(`user:${b.to}`).emit(EV.inviteReceived, this.snapshot(call, b.to));
    this.broadcastPresence(); // both are now busy
    this.log.debug(`call ${call.id} invited`);
    return { ok: true, call: this.snapshot(call, me) };
  }

  @SubscribeMessage(EV.inviteRespond)
  async respond(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const b = parse(P.respond, body);
    if (!b) return { ok: false, error: 'invalid_input' };
    const me = s.data.userId as string;
    const call = this.calls.get(b.callId);
    if (!call || call.to !== me || call.state !== 'invited') return { ok: false, error: 'not_found' };
    clearTimeout(call.timer);
    if (!b.accept) return this.transition(call, 'decline', me);
    await this.transition(call, 'accept', me);
    const [forCaller, forCallee] = await Promise.all([this.livekit.join(call.id, call.from), this.livekit.join(call.id, call.to)]);
    this.server.to(`user:${call.from}`).emit(EV.join, { callId: call.id, join: forCaller });
    this.server.to(`user:${call.to}`).emit(EV.join, { callId: call.id, join: forCallee });
    return this.transition(call, 'join', me);
  }

  /* ------------------------------- video ------------------------------ */

  @SubscribeMessage(EV.videoRequest)
  async videoRequest(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const b = parse(P.callRef, body);
    const call = b && this.memberCall(s, b.callId);
    if (!call) return { ok: false, error: 'not_found' };
    const r = await this.transition(call, 'request_video', s.data.userId);
    if (r.ok) {
      clearTimeout(call.timer);
      call.timer = setTimeout(() => void this.transition(call, 'timeout'), VIDEO_REQUEST_TTL_MS);
    }
    return r;
  }

  /** Only the person who did NOT ask can accept or decline. */
  @SubscribeMessage(EV.videoRespond)
  async videoRespond(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const b = parse(P.videoRespond, body);
    const call = b && this.memberCall(s, b.callId);
    if (!b || !call) return { ok: false, error: 'not_found' };
    if (call.state !== 'video_requested' || call.videoRequestedBy === s.data.userId) return { ok: false, error: 'not_allowed' };
    clearTimeout(call.timer);
    const r = await this.transition(call, b.accept ? 'accept_video' : 'decline_video', s.data.userId);
    if (r.ok && b.accept) await this.livekit.setCamera(call.id, [call.from, call.to], true);
    return r;
  }

  /** Either person can go back to audio only, for both. */
  @SubscribeMessage(EV.videoStop)
  async videoStop(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const b = parse(P.callRef, body);
    const call = b && this.memberCall(s, b.callId);
    if (!call) return { ok: false, error: 'not_found' };
    const r = await this.transition(call, 'stop_video', s.data.userId);
    if (r.ok) await this.livekit.setCamera(call.id, [call.from, call.to], false);
    return r;
  }

  /* --------------------------- end and safety -------------------------- */

  @SubscribeMessage(EV.hangup)
  hangup(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const b = parse(P.callRef, body);
    const call = b && this.memberCall(s, b.callId);
    if (!call) return Promise.resolve({ ok: false, error: 'not_found' });
    return this.transition(call, 'hangup', s.data.userId);
  }

  /** Report (and by default block) the other person. The call ends at once. */
  @SubscribeMessage(EV.report)
  async report(@ConnectedSocket() s: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const b = parse(P.report, body);
    const me = s.data.userId as string;
    const call = b && this.memberCall(s, b.callId);
    if (!b || !call) return { ok: false, error: 'not_found' };
    const peer = this.calls.peerOf(call, me)!;
    await this.transition(call, 'hangup', me);
    await this.repo.report(me, peer, b.reason, call.id, b.block);
    this.log.log(`call ${call.id} reported`);
    return { ok: true };
  }

  /* ------------------------------ internals ---------------------------- */

  private memberCall(s: Socket, callId: string): Call | undefined {
    const call = this.calls.get(callId);
    return call && this.calls.peerOf(call, s.data.userId) ? call : undefined;
  }

  private async transition(call: Call, ev: CallEvent, actor?: string): Promise<Ack> {
    try {
      this.calls.apply(call.id, ev, actor);
    } catch (e) {
      return { ok: false, error: (e as Error).message.startsWith('illegal_transition') ? 'not_allowed' : 'not_found' };
    }
    for (const u of [call.from, call.to]) this.server.to(`user:${u}`).emit(EV.stateChanged, this.snapshot(call, u));
    const ended = isTerminal(call.state);
    void this.repo.logState(call.id, call.state, ended);
    if (ended) {
      if (call.connectedAt) await this.livekit.close(call.id);
      this.broadcastPresence();
    }
    this.log.debug(`call ${call.id} -> ${call.state}`);
    return { ok: true };
  }

  snapshot(call: Call, viewer: string): CallSnapshot {
    const peer = this.calls.peerOf(call, viewer)!;
    return {
      callId: call.id,
      state: call.state,
      peer: call.cards[peer]!,
      direction: call.from === viewer ? 'outgoing' : 'incoming',
      videoRequestedBy: call.videoRequestedBy ? (call.videoRequestedBy === viewer ? 'me' : 'peer') : undefined,
    };
  }

  private async policy(me: string, to: string): Promise<InviteRefusal | null> {
    const [facts, rel] = await Promise.all([this.repo.facts([me, to]), this.repo.relationships(me, [to])]);
    const mine = facts.get(me);
    const theirs = facts.get(to);
    if (!mine) return 'live_disabled';
    if (!theirs) return 'not_available';
    return canReach(mine, theirs, rel.get(to)!);
  }

  private async reachable(me: string, ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const [facts, rel] = await Promise.all([this.repo.facts([me, ...ids]), this.repo.relationships(me, ids)]);
    const mine = facts.get(me);
    if (!mine) return [];
    return ids.filter((id) => {
      const theirs = facts.get(id);
      return theirs && canReach(mine, theirs, rel.get(id)!) === null;
    });
  }

  private sweep() {
    const { expired } = this.presence.sweep();
    if (!expired.length) return;
    for (const id of expired) this.server.to(`user:${id}`).emit(EV.presenceChanged, { selfAvailableUntil: null });
    this.broadcastPresence();
  }

  /** A hint only (no ids): each client refetches the list it is allowed to see. */
  private broadcastPresence() {
    this.server.emit(EV.presenceChanged, {});
  }
}
