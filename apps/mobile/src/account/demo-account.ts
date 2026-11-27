import { useSyncExternalStore } from 'react';
import { meStore, type MyProfile } from '../me/store';
import { isAdminEmail } from './admins';
import { kv } from './kv';

/**
 * Demo accounts (EXPO_PUBLIC_DEMO, the default build and the web demo).
 *
 * Signing in with Apple, Google, Facebook or e-mail is simulated: no data
 * leaves the device. What the demo does keep, on this device only, is the
 * account and its profile, so that coming back (or reloading the page)
 * lands on the app with the profile already made, not on "create your profile".
 *
 * One account per e-mail: Google and e-mail with the same address are the
 * same account, as they will be with real sign-in (verified e-mail linking).
 */
export type SignInProvider = 'apple' | 'google' | 'facebook' | 'phone' | 'email';
export type Role = 'member' | 'admin';

export interface DemoAccount {
  id: string;
  provider: SignInProvider;
  email?: string;
  role: Role;
  createdAt: string;
  lastSignInAt: string;
}

export type AccountStatus = 'loading' | 'signedIn' | 'signedOut';

const CURRENT = 'ziv.demo.current';
const ACCOUNTS = 'ziv.demo.accounts';
const profileKey = (id: string) => `ziv.demo.profile.${id}`;

let status: AccountStatus = 'loading';
let current: DemoAccount | null = null;
let accounts: Record<string, DemoAccount> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const parse = <T,>(raw: string | null, fallback: T): T => { try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; } };

/** Photos picked in the browser are temporary blob: URLs: they cannot survive a reload. */
const storable = (p: MyProfile): MyProfile => ({ ...p, photos: p.photos.filter((ph) => !ph.url.startsWith('blob:')) });

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (!current) return;
  const id = current.id;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void kv.set(profileKey(id), JSON.stringify(storable(meStore.get()))); }, 250);
}

async function loadProfile(id: string) {
  const saved = parse<MyProfile | null>(await kv.get(profileKey(id)), null);
  meStore.reset();
  if (saved) meStore.set(saved);
}

let ready: Promise<void> | null = null;
let unsubscribeMe: (() => void) | null = null;

export const demoAccount = {
  get status() { return status; },
  get current() { return current; },

  /** Reads the device once: who was signed in, and their profile. */
  init() {
    ready ??= (async () => {
      accounts = parse(await kv.get(ACCOUNTS), {});
      const id = await kv.get(CURRENT);
      current = id ? accounts[id] ?? null : null;
      if (current) await loadProfile(current.id);
      unsubscribeMe ??= meStore.subscribe(scheduleSave);
      status = current ? 'signedIn' : 'signedOut';
      emit();
    })();
    return ready;
  },

  /**
   * Simulated sign-in. Returns whether this account already has a finished
   * profile (then the app opens directly) or must go through onboarding.
   */
  async signIn(provider: SignInProvider, email?: string, phone?: string): Promise<{ account: DemoAccount; hasProfile: boolean }> {
    await demoAccount.init();
    const clean = email?.trim().toLowerCase() || undefined;
    // The same number (demo phone sign-in) finds the same account again.
    const id = clean ? `mail:${clean}` : phone ? `tel:${phone}` : `${provider}:device`;
    const now = new Date().toISOString();
    const prev = accounts[id];
    const account: DemoAccount = {
      id, provider: prev?.provider ?? provider, email: clean, createdAt: prev?.createdAt ?? now, lastSignInAt: now,
      role: isAdminEmail(clean) ? 'admin' : 'member',
    };
    accounts = { ...accounts, [id]: account };
    current = account;
    await kv.set(ACCOUNTS, JSON.stringify(accounts));
    await kv.set(CURRENT, id);
    await loadProfile(id);
    status = 'signedIn';
    emit();
    return { account, hasProfile: meStore.get().onboarded };
  },

  /** Signs out; the profile stays on the device for the next sign-in. */
  async signOut() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (current) await kv.set(profileKey(current.id), JSON.stringify(storable(meStore.get())));
    current = null;
    await kv.set(CURRENT, null);
    status = 'signedOut';
    emit();
  },

  /** Deletes this account and its profile from the device. */
  async deleteAccount() {
    if (!current) return;
    const id = current.id;
    const { [id]: _gone, ...rest } = accounts;
    accounts = rest;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    current = null;
    await kv.set(ACCOUNTS, JSON.stringify(accounts));
    await kv.set(profileKey(id), null);
    await kv.set(CURRENT, null);
    status = 'signedOut';
    emit();
  },

  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function useDemoAccount() {
  return useSyncExternalStore(demoAccount.subscribe, () => current, () => current);
}
