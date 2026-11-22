/**
 * Signed-in session for the connected mode (EXPO_PUBLIC_DEMO=0).
 *
 * The API issues a 15-minute JWT access token and an opaque refresh token
 * that rotates on every use: presenting an already-used refresh token
 * revokes the whole session on the server. So every refresh in the app goes
 * through one single-flight promise here (REST calls and the Live socket alike).
 *
 * No React Native import: the storage is injected, which keeps this testable
 * with `node --test` (see session.spec.ts).
 */

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token stops being accepted. */
  accessExpiresAt: number;
  userId: string;
}

export interface SessionStorage {
  load(): Promise<StoredSession | null>;
  save(s: StoredSession | null): Promise<void>;
}

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

/** What /auth/otp/verify, /auth/refresh and the social sign-ins return. */
export interface IssuedTokens { accessToken: string; refreshToken: string; expiresIn: number; userId: string }

/** Refresh this long before expiry, so a request never leaves with a token about to lapse. */
export const REFRESH_MARGIN_MS = 60_000;

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export class Session {
  private current: StoredSession | null = null;
  private state: SessionStatus = 'loading';
  private ready: Promise<void> | null = null;
  private inflight: Promise<string | null> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly baseUrl: string,
    private readonly storage: SessionStorage,
    private readonly fetchFn: Fetch = (u, i) => fetch(u, i),
    private readonly now: () => number = Date.now,
  ) {}

  get status() { return this.state; }
  get userId() { return this.current?.userId ?? null; }

  subscribe(l: () => void) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }

  /** Reads the stored session once. Safe to call many times. */
  init() {
    this.ready ??= this.storage.load()
      .catch(() => null)
      .then((s) => { this.current = s; this.set(s ? 'signedIn' : 'signedOut'); });
    return this.ready;
  }

  /** Stores the tokens returned by a sign-in. */
  async signIn(t: IssuedTokens) {
    await this.init();
    await this.store(t);
    this.set('signedIn');
  }

  /**
   * A valid access token, refreshed first when it is about to expire.
   * Null when signed out. Throws only on network failure during a refresh
   * (the session is kept: the member is offline, not signed out).
   */
  async accessToken(): Promise<string | null> {
    await this.init();
    const s = this.current;
    if (!s) return null;
    if (s.accessExpiresAt - this.now() > REFRESH_MARGIN_MS) return s.accessToken;
    return this.refresh();
  }

  /**
   * The API answered 401 to a request sent with `usedToken`. Refresh once,
   * unless another call already replaced that token in the meantime.
   */
  async afterUnauthorized(usedToken: string): Promise<string | null> {
    await this.init();
    if (!this.current) return null;
    if (this.current.accessToken !== usedToken) return this.current.accessToken;
    return this.refresh();
  }

  /** Single flight: concurrent callers share one rotation of the refresh token. */
  refresh(): Promise<string | null> {
    this.inflight ??= this.doRefresh().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  /** Revokes the session server-side (best effort) and forgets it locally. */
  async signOut() {
    await this.init();
    const s = this.current;
    await this.clear();
    if (s) {
      await this.fetchFn(`${this.baseUrl}/v1/auth/logout`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: s.refreshToken }),
      }).catch(() => undefined);
    }
  }

  private async doRefresh(): Promise<string | null> {
    const s = this.current;
    if (!s) return null;
    const res = await this.fetchFn(`${this.baseUrl}/v1/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: s.refreshToken }),
    });
    // Signed out (or signed in again) while the request was in flight: ignore the answer.
    if (this.current !== s) return this.current?.accessToken ?? null;
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      // Expired, revoked or replayed refresh token: the member must sign in again.
      await this.clear();
      return null;
    }
    if (!res.ok) throw new Error(`refresh_failed_${res.status}`);
    const t = (await res.json()) as IssuedTokens;
    await this.store(t);
    return t.accessToken;
  }

  private async store(t: IssuedTokens) {
    this.current = { accessToken: t.accessToken, refreshToken: t.refreshToken, userId: t.userId, accessExpiresAt: this.now() + t.expiresIn * 1000 };
    await this.storage.save(this.current).catch(() => undefined);
  }

  private async clear() {
    this.current = null;
    await this.storage.save(null).catch(() => undefined);
    this.set('signedOut');
  }

  private set(s: SessionStatus) {
    if (this.state === s) return;
    this.state = s;
    this.listeners.forEach((l) => l());
  }
}
