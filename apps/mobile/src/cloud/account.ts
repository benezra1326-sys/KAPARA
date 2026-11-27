import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { LAUNCH_REGION } from '@kapara/config';
import { meStore, type MyProfile } from '../me/store';
import type { MyPhoto } from '../me/photos';
import { CLOUD, must, sb, signupFn } from './client';

/**
 * Real accounts (Supabase Auth) and the member's own profile, kept in the
 * `members` table: the same profile on every device, from the first sign-in.
 *
 * - E-mail: create an account (password, 8 characters minimum) or sign in.
 * - Google, Facebook: OAuth through Supabase, once switched on in the dashboard
 *   (docs/supabase.md). Apple waits for the Apple Developer account.
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

const SEEKS: Record<string, string[]> = { woman: ['man'], man: ['woman'], nonbinary: [] };

function toRow(id: string, p: MyProfile, provider: string) {
  return {
    id, first_name: p.firstName.slice(0, 40), gender: p.gender ?? null, birth_date: p.birthDate ?? null, region_code: p.regionCode,
    headline: p.headline.slice(0, 140), languages: p.languages, prompts: p.prompts, photos: savedPhotos(p.photos as MyPhoto[]),
    jewish_life: p.jewishLife, consents: p.consents, onboarded: p.onboarded, provider,
    last_seen_at: new Date().toISOString(),
  };
}

function fromRow(r: Row): Partial<MyProfile> {
  return {
    onboarded: r.onboarded, firstName: r.first_name, gender: r.gender ?? undefined, birthDate: r.birth_date ?? undefined,
    regionCode: r.region_code || LAUNCH_REGION.code, headline: r.headline, languages: r.languages, prompts: r.prompts ?? [],
    photos: r.photos ?? [], jewishLife: r.jewish_life ?? {}, consents: r.consents ?? {},
  };
}

let hasPrefs = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving: PromiseLike<unknown> = Promise.resolve();
async function saveNow() {
  if (!current || loadedFor !== current.id) return;
  const p = meStore.get();
  const row = toRow(current.id, p, current.provider);
  // Until the member sets "Mes préférences", who they see follows a default from their gender.
  const seeks = hasPrefs ? {} : { seeks: p.gender ? SEEKS[p.gender] ?? [] : [] };
  setSave('saving');
  saving = sb.from('members').upsert({ ...row, ...seeks }, { onConflict: 'id' }).then(({ error }) => {
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

async function adopt(session: Session | null) {
  if (!session) {
    current = null; loadedFor = null; meStore.reset(); status = 'signedOut'; emit();
    return;
  }
  const u = session.user;
  if (current?.id === u.id && loadedFor === u.id) return;
  const provider = (u.app_metadata?.provider as string | undefined) ?? 'email';
  const { data: admin } = await sb.rpc('is_admin');
  current = { id: u.id, email: u.email ?? undefined, provider, role: admin ? 'admin' : 'member' };
  const { data: row } = await sb.from('members').select('*').eq('id', u.id).maybeSingle<Row>();
  meStore.reset();
  hasPrefs = !!row && Object.keys(row.preferences ?? {}).length > 0;
  if (row) {
    meStore.set(fromRow(row));
  } else {
    // First sign-in: the name given by Google/Facebook pre-fills the first step.
    const given = (u.user_metadata?.given_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? '') as string;
    meStore.set({ onboarded: false, firstName: given.split(' ')[0]?.slice(0, 40) ?? '', photos: [] });
  }
  loadedFor = u.id;
  if (!row) await saveNow();
  status = 'signedIn';
  emit();
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
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') setTimeout(() => void adopt(session), 0);
      });
      const { data } = await sb.auth.getSession();
      await adopt(data.session);
    })();
    return ready;
  },

  async signInEmail(email: string, password: string): Promise<EmailResult> {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, code: /confirm/i.test(error.message) ? 'email_not_confirmed' : 'invalid_credentials' };
    const { data } = await sb.auth.getSession();
    await adopt(data.session);
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
    await adopt(data.session);
    return { hasProfile: meStore.get().onboarded };
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
  hasPrefs = true;
}

export function useCloudAccount() {
  return useSyncExternalStore(cloudAccount.subscribe, () => current, () => current);
}
