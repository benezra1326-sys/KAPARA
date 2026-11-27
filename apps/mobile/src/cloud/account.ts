import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { LAUNCH_REGION } from '@kapara/config';
import { meStore, type MyProfile } from '../me/store';
import { effectiveSeeks } from '../me/seeks';
import type { MyPhoto } from '../me/photos';
import { CLOUD, must, sb, signupFn } from './client';

/**
 * Real accounts (Supabase Auth) and the member's own profile, kept in the
 * `members` table: the same profile on every device, from the first sign-in.
 *
 * - E-mail: create an account (password, 8 characters minimum) or sign in.
 * - Google, Facebook: OAuth through Supabase, once switched on in the dashboard
 *   (docs/supabase.md). Apple waits for the Apple Developer account.
 * - Phone: a 6-digit code by SMS (Supabase Auth with Twilio), once the phone
 *   provider is switched on (docs/connexion-telephone.md).
 * - Administrator: decided by the database (public.is_admin(), verified e-mail
 *   among the administrator hashes), never by the app.
 */
export type CloudProvider = 'google' | 'facebook' | 'apple';
export type Role = 'member' | 'admin';
export interface CloudAccount { id: string; email?: string; provider: string; role: Role }
export type AccountStatus = 'loading' | 'signedIn' | 'signedOut';

let status: AccountStatus = 'loading';
let current: CloudAccount | null = null;
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

type Row = {
  id: string; first_name: string; gender: MyProfile['gender'] | null; seeks: string[]; birth_date: string | null; region_code: string;
  headline: string; languages: string[]; prompts: MyProfile['prompts']; photos: MyPhoto[]; jewish_life: MyProfile['jewishLife'];
  consents: MyProfile['consents']; preferences: Record<string, unknown>; onboarded: boolean; suspended: boolean;
};

/** Photos still uploading or only on this device (blob:, file:) are not saved. */
const savedPhotos = (list: MyPhoto[]) => list.filter((p) => !p.status && /^https?:\/\//.test(p.url)).map(({ id, url, caption }) => ({ id, url, ...(caption ? { caption } : {}), isDemo: false }));

function toRow(id: string, p: MyProfile, provider: string) {
  return {
    id, first_name: p.firstName.slice(0, 40), gender: p.gender ?? null, birth_date: p.birthDate ?? null, region_code: p.regionCode,
    headline: p.headline.slice(0, 140), languages: p.languages, prompts: p.prompts, photos: savedPhotos(p.photos as MyPhoto[]),
    jewish_life: p.jewishLife, consents: p.consents, onboarded: p.onboarded, provider,
    // "Je recherche": asked at sign-up; until then a default from the member's gender.
    seeks: effectiveSeeks(p.gender, p.seeks),
    last_seen_at: new Date().toISOString(),
  };
}

function fromRow(r: Row): Partial<MyProfile> {
  return {
    onboarded: r.onboarded, firstName: r.first_name, gender: r.gender ?? undefined, birthDate: r.birth_date ?? undefined,
    seeks: (r.seeks ?? []).length ? (r.seeks as MyProfile['seeks']) : undefined,
    regionCode: r.region_code || LAUNCH_REGION.code, headline: r.headline, languages: r.languages, prompts: r.prompts ?? [],
    photos: r.photos ?? [], jewishLife: r.jewish_life ?? {}, consents: r.consents ?? {},
  };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving: PromiseLike<unknown> = Promise.resolve();
async function saveNow() {
  if (!current || loadedFor !== current.id) return;
  const p = meStore.get();
  const row = toRow(current.id, p, current.provider);
  setSave('saving');
  saving = sb.from('members').upsert(row, { onConflict: 'id' }).then(({ error }) => {
    if (!error) { setSave('saved'); return; }
    // The database refuses minors (trigger members_adults_only): the app shows why.
    setSave(/adults_only/.test(`${error.message} ${error.details ?? ''} ${error.hint ?? ''}`) ? 'adults_only' : 'error');
  }, () => setSave('error'));
  await saving;
}

/** What the member sees about their last save: never a silent failure. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'adults_only';
let saveState: SaveState = 'idle';
const saveListeners = new Set<() => void>();
function setSave(s: SaveState) { saveState = s; saveListeners.forEach((l) => l()); }
export function useSaveState(): SaveState {
  return useSyncExternalStore((l) => { saveListeners.add(l); return () => saveListeners.delete(l); }, () => saveState, () => saveState);
}
export function retrySave() { return saveNow(); }
function scheduleSave() {
  if (!current || loadedFor !== current.id) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; void saveNow(); }, 600);
}

/**
 * Supabase announces one sign-in several times (INITIAL_SESSION, SIGNED_IN,
 * getSession, the sign-in call itself). Loading the profile runs once per
 * account and every caller waits for that same run, so a second run can never
 * blank the profile already on screen (and send the member back to sign-up).
 */
let adopting: { id: string | null; run: Promise<void> } | null = null;
function adopt(session: Session | null): Promise<void> {
  const id = session?.user.id ?? null;
  if (adopting && adopting.id === id) return adopting.run;
  if (id && current?.id === id && loadedFor === id) return Promise.resolve();
  const run = (async () => {
    if (adopting && adopting.id !== id) await adopting.run.catch(() => undefined);
    await load(session);
  })();
  adopting = { id, run };
  void run.finally(() => { if (adopting?.run === run) adopting = null; });
  return run;
}

/** The profile could not be read (network, server): never treated as a new account. */
export class ProfileLoadError extends Error { constructor() { super('profile_load_failed'); } }

async function readRow(id: string): Promise<{ row: Row | null } | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await sb.from('members').select('*').eq('id', id).maybeSingle<Row>();
    if (!error) return { row: data ?? null };
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return null;
}

async function load(session: Session | null) {
  if (!session) {
    current = null; loadedFor = null; meStore.reset(); status = 'signedOut'; emit();
    return;
  }
  const u = session.user;
  if (current?.id === u.id && loadedFor === u.id) return;
  const provider = (u.app_metadata?.provider as string | undefined) ?? 'email';
  const { data: admin } = await sb.rpc('is_admin');
  const read = await readRow(u.id);
  if (!read) {
    // Reading failed (network): nothing is saved and sign-up is never shown in its place.
    // The app keeps waiting; the start-up path tries again a few seconds later.
    throw new ProfileLoadError();
  }
  const { row } = read;
  current = { id: u.id, email: u.email ?? undefined, provider, role: admin ? 'admin' : 'member' };
  if (row) {
    meStore.reset();
    meStore.set(fromRow(row));
  } else {
    // First sign-in: the name given by Google/Facebook pre-fills the first step.
    const given = (u.user_metadata?.given_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? '') as string;
    meStore.reset();
    meStore.set({ onboarded: false, firstName: given.split(' ')[0]?.slice(0, 40) ?? '', photos: [] });
    // Insert only: if a profile appeared in the meantime (another tab), it is never overwritten.
    await sb.from('members').upsert(toRow(u.id, meStore.get(), provider), { onConflict: 'id', ignoreDuplicates: true });
    const again = await readRow(u.id);
    if (again?.row?.onboarded) { meStore.reset(); meStore.set(fromRow(again.row)); }
  }
  loadedFor = u.id;
  status = 'signedIn';
  emit();
}

/** Start-up and auth events: a profile that could not be read is read again, never replaced. */
function adoptInBackground(session: Session | null) {
  adopt(session).catch(() => {
    // Again a few seconds later, with the session as it is then (signed out meanwhile: nothing to load).
    setTimeout(() => { void sb.auth.getSession().then(({ data }) => adoptInBackground(data.session)); }, 5000);
  });
}

let ready: Promise<void> | null = null;
let unsubscribeMe: (() => void) | null = null;

export type EmailResult = { ok: true; hasProfile: boolean } | { ok: false; code: string } | { ok: 'confirm' };

export const cloudAccount = {
  get status() { return status; },
  get current() { return current; },

  init() {
    if (!CLOUD) return Promise.resolve();
    ready ??= (async () => {
      unsubscribeMe ??= meStore.subscribe(scheduleSave);
      sb.auth.onAuthStateChange((event, session) => {
        // Supabase forbids awaiting its own calls inside the callback.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') setTimeout(() => adoptInBackground(session), 0);
      });
      const { data } = await sb.auth.getSession();
      await adopt(data.session).catch(() => adoptInBackground(data.session));
    })();
    return ready;
  },

  async signInEmail(email: string, password: string): Promise<EmailResult> {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, code: /confirm/i.test(error.message) ? 'email_not_confirmed' : 'invalid_credentials' };
    const { data } = await sb.auth.getSession();
    try { await adopt(data.session); } catch { return { ok: false, code: 'profile_load_failed' }; }
    return { ok: true, hasProfile: meStore.get().onboarded };
  },

  async signUpEmail(email: string, password: string): Promise<EmailResult> {
    const r = await signupFn(email, password);
    if (r.code) return { ok: false, code: r.code };
    if (r.flow === 'confirm') {
      // Administrator address: it must be proven by the confirmation link.
      const redirect = Platform.OS === 'web' ? `${window.location.origin}/onboarding` : undefined;
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
      if (error) return { ok: false, code: /already/i.test(error.message) ? 'already_registered' : 'signup_failed' };
      return { ok: 'confirm' };
    }
    return cloudAccount.signInEmail(email, password);
  },

  async resetPassword(email: string) {
    const redirect = Platform.OS === 'web' ? `${window.location.origin}/onboarding/email?mode=reset` : undefined;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    return !error;
  },

  /** Web: leaves for the provider and comes back signed in. */
  async signInWith(provider: CloudProvider) {
    const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/onboarding` : undefined;
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
    return !error;
  },

  /** Web: Google's own button hands back an ID token; Supabase checks it (and the nonce). */
  async signInWithGoogleToken(token: string, nonce: string): Promise<{ hasProfile: boolean } | null> {
    const { data, error } = await sb.auth.signInWithIdToken({ provider: 'google', token, nonce });
    if (error || !data.session) return null;
    try { await adopt(data.session); } catch { return null; }
    return { hasProfile: meStore.get().onboarded };
  },

  /** Phone: sends a 6-digit code by SMS. The number is in international form (+33612345678). */
  async sendPhoneCode(phone: string): Promise<{ ok: true } | { ok: false; code: string }> {
    const { error } = await sb.auth.signInWithOtp({ phone, options: { shouldCreateUser: true, channel: 'sms' } });
    if (!error) return { ok: true };
    const m = `${error.message} ${(error as { code?: string }).code ?? ''}`;
    if (/rate|too many|over_sms_send_rate|seconds/i.test(m)) return { ok: false, code: 'too_many_requests' };
    if (/invalid.*phone|phone.*invalid|validation/i.test(m)) return { ok: false, code: 'phone_invalid' };
    if (/provider|disabled|unsupported/i.test(m)) return { ok: false, code: 'phone_off' };
    return { ok: false, code: 'sms_failed' };
  },

  /** Phone: checks the SMS code; a known number opens its account, a new one starts its profile. */
  async verifyPhoneCode(phone: string, token: string): Promise<{ ok: true; hasProfile: boolean } | { ok: false; code: string }> {
    const { data, error } = await sb.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error || !data.session) return { ok: false, code: /expired/i.test(error?.message ?? '') ? 'code_expired' : 'invalid_code' };
    try { await adopt(data.session); } catch { return { ok: false, code: 'profile_load_failed' }; }
    return { ok: true, hasProfile: meStore.get().onboarded };
  },

  async signOut() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; await saveNow(); }
    await saving;
    await sb.auth.signOut();
  },

  /** Deletes the profile (likes, messages, reports follow) and signs out. */
  async deleteAccount() {
    if (!current) return;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    loadedFor = null;
    const id = current.id;
    // Photos first (the member's folder in the bucket), then the account itself.
    // The bucket has no read policy, so list() comes back empty for the member:
    // the profile's own photo ids ("<uid>/<file>.jpg") are the reliable source.
    const { data: files } = await sb.storage.from('photos').list(id, { limit: 100 });
    const paths = new Set<string>((files ?? []).map((f) => `${id}/${f.name}`));
    for (const ph of meStore.get().photos as MyPhoto[]) if (ph.id?.startsWith(`${id}/`)) paths.add(ph.id);
    if (paths.size) await sb.storage.from('photos').remove([...paths]);
    const { error } = await sb.rpc('delete_my_account');
    if (error) await sb.from('members').delete().eq('id', id);
    await sb.auth.signOut();
  },

  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** "Mettre mon profil en pause": stored in members.privacy; a paused profile is hidden from everyone (visible_members). */
export async function loadPaused(): Promise<boolean> {
  if (!current) return false;
  const { data } = await sb.from('members').select('privacy').eq('id', current.id).maybeSingle();
  return Boolean((data?.privacy as Record<string, unknown> | null)?.paused);
}
export async function savePaused(paused: boolean) {
  if (!current) return;
  const { data } = await sb.from('members').select('privacy').eq('id', current.id).maybeSingle();
  must(await sb.from('members').update({ privacy: { ...((data?.privacy as Record<string, unknown> | null) ?? {}), paused } }).eq('id', current.id));
}

/** "Mes préférences": stored with the profile; the chosen genders decide who appears in "Pour toi". */
export async function loadPreferences(): Promise<Record<string, unknown> | null> {
  if (!current) return null;
  const { data } = await sb.from('members').select('preferences').eq('id', current.id).maybeSingle<{ preferences: Record<string, unknown> }>();
  return data?.preferences && Object.keys(data.preferences).length ? data.preferences : null;
}
export async function savePreferences(prefs: { genders: string[] } & Record<string, unknown>) {
  if (!current) throw new Error('signed_out');
  const { error } = await sb.from('members').update({ preferences: prefs, seeks: prefs.genders }).eq('id', current.id);
  if (error) throw new Error(error.message);
  meStore.set({ seeks: prefs.genders as MyProfile['seeks'] });
}

export function useCloudAccount() {
  return useSyncExternalStore(cloudAccount.subscribe, () => current, () => current);
}
