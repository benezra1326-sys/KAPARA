import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { RULES } from '@kapara/config';
import { LIVE_EVENTS, type CallState } from '@kapara/shared';
import { next, type CallEvent } from './call-machine';
import { LiveKitService } from './livekit.service';

interface Call { id: string; from: string; to: string; state: CallState; timer?: NodeJS.Timeout }

/**
 * Presence + call signalling. In-memory for a single instance; swap the two
 * maps for Redis (REDIS_URL) when running more than one API instance.
 */
@WebSocketGateway({ namespace: '/live', cors: { origin: true } })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly log = new Logger(LiveGateway.name);
  private readonly presence = new Map<string, { socketId: string; until: number }>();
  private readonly calls = new Map<string, Call>();

  constructor(private readonly jwt: JwtService, private readonly livekit: LiveKitService) {}

  async handleConnection(socket: Socket) {
    try {
      const token = String(socket.handshake.auth?.token ?? '');
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token);
      socket.data.userId = sub;
      socket.join(`user:${sub}`);
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const id = socket.data.userId as string | undefined;
    if (id) this.presence.delete(id);
  }

  /** Opt-in, time-limited availability. */
  @SubscribeMessage(LIVE_EVENTS.presenceSet)
  setPresence(@ConnectedSocket() s: Socket, @MessageBody() body: { available: boolean }) {
    const id = s.data.userId as string;
    if (body?.available) this.presence.set(id, { socketId: s.id, until: Date.now() + RULES.livePresenceTtlSeconds * 1000 });
    else this.presence.delete(id);
    return { ok: true, ttl: RULES.livePresenceTtlSeconds };
  }

  @SubscribeMessage(LIVE_EVENTS.presenceList)
  listPresence(@ConnectedSocket() s: Socket) {
    const now = Date.now();
    return [...this.presence.entries()]
      .filter(([id, p]) => id !== s.data.userId && p.until > now)
      .map(([id]) => ({ userId: id }));
  }

  @SubscribeMessage(LIVE_EVENTS.inviteSend)
  invite(@ConnectedSocket() s: Socket, @MessageBody() body: { to: string }) {
    const from = s.data.userId as string;
    const p = this.presence.get(body.to);
    if (!p || p.until < Date.now()) return { ok: false, error: 'not_available' };
    // TODO(workstream live): enforce PrivacySettings.liveCallsFrom + blocks.
    const call: Call = { id: randomUUID(), from, to: body.to, state: 'invited' };
    call.timer = setTimeout(() => this.apply(call.id, 'timeout'), RULES.liveInviteTtlSeconds * 1000);
    this.calls.set(call.id, call);
    this.server.to(`user:${body.to}`).emit(LIVE_EVENTS.inviteReceived, { callId: call.id, from });
    return { ok: true, callId: call.id };
  }

  @SubscribeMessage(LIVE_EVENTS.inviteRespond)
  async respond(@ConnectedSocket() s: Socket, @MessageBody() b: { callId: string; accept: boolean }) {
    const call = this.calls.get(b.callId);
    if (!call || call.to !== s.data.userId) return { ok: false, error: 'not_found' };
    clearTimeout(call.timer);
    this.apply(call.id, b.accept ? 'accept' : 'decline');
    if (!b.accept) return { ok: true };
    const [a, c] = await Promise.all([this.livekit.join(call.id, call.from), this.livekit.join(call.id, call.to)]);
    this.server.to(`user:${call.from}`).emit('call:join', a);
    this.apply(call.id, 'join');
    return { ok: true, join: c };
  }

  @SubscribeMessage(LIVE_EVENTS.videoRequest)
  videoRequest(@ConnectedSocket() s: Socket, @MessageBody() b: { callId: string }) {
    return this.applyAsMember(s, b.callId, 'request_video');
  }

  @SubscribeMessage(LIVE_EVENTS.videoRespond)
  videoRespond(@ConnectedSocket() s: Socket, @MessageBody() b: { callId: string; accept: boolean }) {
    return this.applyAsMember(s, b.callId, b.accept ? 'accept_video' : 'decline_video');
  }

  @SubscribeMessage(LIVE_EVENTS.hangup)
  hangup(@ConnectedSocket() s: Socket, @MessageBody() b: { callId: string }) {
    return this.applyAsMember(s, b.callId, 'hangup');
  }

  private applyAsMember(s: Socket, callId: string, ev: CallEvent) {
    const call = this.calls.get(callId);
    const me = s.data.userId;
    if (!call || (call.from !== me && call.to !== me)) return { ok: false, error: 'not_found' };
    try {
      this.apply(callId, ev);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  private apply(callId: string, ev: CallEvent) {
    const call = this.calls.get(callId);
    if (!call) return;
    call.state = next(call.state, ev);
    for (const u of [call.from, call.to]) this.server.to(`user:${u}`).emit(LIVE_EVENTS.stateChanged, { callId, state: call.state });
    if (['ended', 'declined', 'expired'].includes(call.state)) this.calls.delete(callId);
    this.log.debug(`call ${callId} -> ${call.state}`);
  }
}
