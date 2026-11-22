import { randomUUID } from 'node:crypto';
import { RULES } from '@kapara/config';
import type { CallState, InviteRefusal, LiveMember } from '@kapara/shared';
import { isTerminal, next, type CallEvent } from './call-machine';

export interface Call {
  id: string;
  from: string;
  to: string;
  state: CallState;
  demo: boolean;
  createdAt: number;
  connectedAt?: number;
  videoRequestedBy?: string;
  timer?: NodeJS.Timeout;
  /** Public cards of both members, keyed by user id, captured at invitation time. */
  cards: Record<string, LiveMember>;
}

const TEN_MIN = 10 * 60_000;

/**
 * Live calls in progress plus the anti-harassment memory:
 * one call at a time per member, a cooldown after a decline or no answer,
 * and a cap on invitations per 10 minutes. In memory (single instance).
 */
export class CallRegistry {
  private readonly calls = new Map<string, Call>();
  private readonly busy = new Map<string, string>(); // userId -> callId
  private readonly cooldowns = new Map<string, number>(); // `${from}>${to}` -> until
  private readonly sent = new Map<string, number[]>(); // userId -> invitation timestamps

  get(id: string) { return this.calls.get(id); }
  callOf(userId: string) { const id = this.busy.get(userId); return id ? this.calls.get(id) : undefined; }
  isBusy(userId: string) { return this.busy.has(userId); }

  /** Checks only what the registry knows; profile rules are in call-policy. */
  check(from: string, to: string, now = Date.now()): InviteRefusal | null {
    if (from === to) return 'not_available';
    if (this.busy.has(from)) return 'rate_limited';
    if (this.busy.has(to)) return 'not_available';
    if ((this.cooldowns.get(`${from}>${to}`) ?? 0) > now) return 'cooldown';
    const recent = (this.sent.get(from) ?? []).filter((t) => now - t < TEN_MIN);
    if (recent.length >= RULES.liveMaxInvitesPer10Min) return 'rate_limited';
    return null;
  }

  create(from: string, to: string, demo: boolean, cards: Record<string, LiveMember> = {}, now = Date.now()): Call {
    const call: Call = { id: randomUUID(), from, to, state: 'invited', demo, createdAt: now, cards };
    this.calls.set(call.id, call);
    this.busy.set(from, call.id);
    this.busy.set(to, call.id);
    this.sent.set(from, [...(this.sent.get(from) ?? []).filter((t) => now - t < TEN_MIN), now]);
    return call;
  }

  /** Applies a transition. Throws on an illegal one. Frees both members when the call ends. */
  apply(id: string, ev: CallEvent, actor?: string, now = Date.now()): Call {
    const call = this.calls.get(id);
    if (!call) throw new Error('not_found');
    call.state = next(call.state, ev);
    if (ev === 'join') call.connectedAt = now;
    if (ev === 'request_video') call.videoRequestedBy = actor;
    if (call.state !== 'video_requested') call.videoRequestedBy = undefined;
    if (call.state === 'declined') this.cooldowns.set(`${call.from}>${call.to}`, now + RULES.liveDeclineCooldownHours * 3_600_000);
    if (call.state === 'expired') this.cooldowns.set(`${call.from}>${call.to}`, now + RULES.liveExpiredCooldownMinutes * 60_000);
    if (isTerminal(call.state)) this.release(call);
    return call;
  }

  /** The other member of a call, or undefined if `userId` is not in it. */
  peerOf(call: Call, userId: string) {
    return call.from === userId ? call.to : call.to === userId ? call.from : undefined;
  }

  private release(call: Call) {
    clearTimeout(call.timer);
    this.calls.delete(call.id);
    if (this.busy.get(call.from) === call.id) this.busy.delete(call.from);
    if (this.busy.get(call.to) === call.id) this.busy.delete(call.to);
  }
}
