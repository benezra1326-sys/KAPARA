import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import type { AuthTokens, OtpRequestResult } from '@kapara/shared';
import { Session, type SessionStatus, type StoredSession } from './session';

export const API_BASE = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000';
/** Demo mode: the app runs on local fictional data, no server needed. EXPO_PUBLIC_DEMO=0 connects to the API. */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO !== '0';

/**
 * API error. `code` is the machine-readable reason (`invalid_code`,
 * `conversation_closed`…), also exposed as `message`; `data` keeps the rest
 * of the body (`attemptsLeft`, `retryAfter`…).
 */
export class ApiError extends Error {
  constructor(public status: number, public code: string, public data: Record<string, unknown> = {}) { super(code); }

  static async from(res: Response) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof body.code === 'string' ? body.code : typeof body.message === 'string' ? body.message : 'http_error';
    return new ApiError(res.status, code, body);
  }
}

const KEY = 'kapara.session';
const LEGACY_KEY = 'token';

/** Tokens live in the OS keychain / keystore only. */
export const session = new Session(API_BASE, {
  async load() {
    void SecureStore.deleteItemAsync(LEGACY_KEY).catch(() => undefined);
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  },
  async save(s) {
    if (s) await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    else await SecureStore.deleteItemAsync(KEY);
  },
});

if (!DEMO_MODE) void session.init();

/** API session status. Screens use useAuthStatus (src/account), which also covers the demo account. */
export function useSessionStatus(): SessionStatus {
  return useSyncExternalStore(session.subscribe.bind(session), () => session.status);
}

const send = (path: string, init: RequestInit, token: string | null) => fetch(`${API_BASE}/v1${path}`, {
  ...init,
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
});

/**
 * Authenticated JSON call. The access token is refreshed before it expires;
 * a 401 triggers one refresh and one retry. If the refresh token is refused,
 * the session ends and the app returns to sign-in.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = await session.accessToken();
  let res = await send(path, init, token);
  if (res.status === 401 && token) {
    token = await session.afterUnauthorized(token);
    if (token) res = await send(path, init, token);
  }
  if (!res.ok) throw await ApiError.from(res);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Unauthenticated sign-in calls. */
async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await send(path, { method: 'POST', body: JSON.stringify(body) }, null);
  if (!res.ok) throw await ApiError.from(res);
  return res.json() as Promise<T>;
}

export const auth = {
  requestOtp: (email: string, locale?: string) => publicPost<OtpRequestResult>('/auth/otp/request', { email, locale }),
  async verifyOtp(email: string, code: string, locale?: string) {
    const t = await publicPost<AuthTokens>('/auth/otp/verify', { email, code, locale });
    await session.signIn(t);
    return t;
  },
  signOut: () => session.signOut(),
};
