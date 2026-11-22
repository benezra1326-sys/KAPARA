import { RULES } from '@kapara/config';

interface Entry { sockets: Set<string>; availableUntil: number; lastSeen: number }

/**
 * Who is available on Live right now. Availability is opt-in and doubly
 * time-limited: it ends after RULES.liveAvailabilityMinutes, and earlier if
 * the app stops sending heartbeats (closed, offline, backgrounded).
 *
 * In memory: correct for one API instance. Behind several instances, move
 * this to Redis (REDIS_URL) with the same interface.
 */
export class PresenceStore {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly windowMs = RULES.liveAvailabilityMinutes * 60_000,
    private readonly heartbeatTtlMs = RULES.livePresenceTtlSeconds * 1000,
  ) {}

  /** Turn availability on (restarts the window) or off. Returns the end time, or null. */
  set(userId: string, socketId: string, available: boolean, now = Date.now()): number | null {
    if (!available) { this.entries.delete(userId); return null; }
    const e = this.entries.get(userId) ?? { sockets: new Set<string>(), availableUntil: 0, lastSeen: now };
    e.sockets.add(socketId);
    e.availableUntil = now + this.windowMs;
    e.lastSeen = now;
    this.entries.set(userId, e);
    return e.availableUntil;
  }

  heartbeat(userId: string, now = Date.now()): boolean {
    const e = this.entries.get(userId);
    if (!e || !this.alive(e, now)) return false;
    e.lastSeen = now;
    return true;
  }

  /** A socket closed. Availability ends when the member's last socket is gone. */
  dropSocket(userId: string, socketId: string): boolean {
    const e = this.entries.get(userId);
    if (!e) return false;
    e.sockets.delete(socketId);
    if (e.sockets.size === 0) { this.entries.delete(userId); return true; }
    return false;
  }

  isAvailable(userId: string, now = Date.now()): boolean {
    const e = this.entries.get(userId);
    return Boolean(e && this.alive(e, now));
  }

  availableUntil(userId: string, now = Date.now()): number | null {
    const e = this.entries.get(userId);
    return e && this.alive(e, now) ? e.availableUntil : null;
  }

  /** Available members, purging expired entries. Returns ids that just expired too. */
  sweep(now = Date.now()): { available: string[]; expired: string[] } {
    const available: string[] = [];
    const expired: string[] = [];
    for (const [id, e] of this.entries) {
      if (this.alive(e, now)) available.push(id);
      else { this.entries.delete(id); expired.push(id); }
    }
    return { available, expired };
  }

  private alive(e: Entry, now: number) {
    return e.availableUntil > now && now - e.lastSeen < this.heartbeatTtlMs;
  }
}
