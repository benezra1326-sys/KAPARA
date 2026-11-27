import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { kv } from '../account/kv';
import { ENV } from '../env';

/**
 * Real backend (Supabase): accounts, profiles, likes, conversations, reports,
 * photos. On when the build has EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_KEY (publishable key, safe to ship). Features not yet
 * backed by the database (Croisés, Live, introductions) keep their demo,
 * announced as such.
 */
// Only with EXPO_PUBLIC_BACKEND=test: never mixed with the API or a production build.
const URL = ENV.backend === 'test' ? ENV.supabaseUrl : '';
const KEY = ENV.backend === 'test' ? ENV.supabaseKey : '';
export const CLOUD = !!URL && !!KEY;
export const SUPABASE_URL = URL;

export const sb: SupabaseClient = createClient(URL || 'https://invalid.local', KEY || 'none', {
  auth: {
    storage: { getItem: kv.get, setItem: (k: string, v: string) => kv.set(k, v), removeItem: (k: string) => kv.set(k, null) },
    persistSession: true,
    autoRefreshToken: CLOUD,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

/** Which providers are switched on in the Supabase dashboard (Authentication › Providers). */
export async function enabledProviders(): Promise<Record<string, boolean>> {
  if (!CLOUD) return {};
  try {
    const r = await fetch(`${URL}/auth/v1/settings`, { headers: { apikey: KEY } });
    const j = (await r.json()) as { external?: Record<string, boolean> };
    return j.external ?? {};
  } catch { return {}; }
}

/** Account creation by e-mail goes through the `signup` edge function (see supabase/functions/signup). */
export async function signupFn(email: string, password: string): Promise<{ flow?: 'created' | 'confirm'; code?: string }> {
  const r = await fetch(`${URL}/functions/v1/signup`, {
    method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  return (await r.json().catch(() => ({ code: 'network' }))) as { flow?: 'created' | 'confirm'; code?: string };
}

/** Throws the Postgres/REST error, so react-query shows it. */
export function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
