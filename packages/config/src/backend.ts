/**
 * Which backend an app build talks to. One explicit, exclusive choice:
 *
 * | EXPO_PUBLIC_BACKEND | Data | Use |
 * | --- | --- | --- |
 * | `demo`  | fictional members on the device, nothing leaves it | design reviews, offline demos |
 * | `test`  | Supabase test project (real accounts + labelled demo profiles) | web preview, testers |
 * | `api`   | ZIV API (NestJS + PostGIS) | development against the API, and **production** |
 *
 * EXPO_PUBLIC_APP_ENV = development | preview | production. A production
 * build must use `api` with a real https address, and never ships Supabase
 * test keys or demo data. `checkAppEnv` explains what is missing without
 * printing any value.
 */
export type Backend = 'demo' | 'test' | 'api';
export type AppEnv = 'development' | 'preview' | 'production';

export interface AppEnvConfig {
  backend: Backend;
  appEnv: AppEnv;
  apiUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  errors: string[];
}

type Vars = Record<string, string | undefined>;

const LOCAL = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

/** Older variables (EXPO_PUBLIC_DEMO, Supabase keys alone) still map to one backend. */
function inferBackend(v: Vars): Backend {
  if (v.EXPO_PUBLIC_SUPABASE_URL && v.EXPO_PUBLIC_SUPABASE_KEY) return 'test';
  return v.EXPO_PUBLIC_DEMO === '0' ? 'api' : 'demo';
}

export function checkAppEnv(v: Vars): AppEnvConfig {
  const errors: string[] = [];
  const rawBackend = (v.EXPO_PUBLIC_BACKEND ?? '').trim();
  const rawEnv = (v.EXPO_PUBLIC_APP_ENV ?? '').trim();
  const appEnv: AppEnv = rawEnv === 'production' || rawEnv === 'preview' ? rawEnv : 'development';
  if (rawEnv && rawEnv !== appEnv) errors.push(`EXPO_PUBLIC_APP_ENV="${rawEnv}" is not one of development, preview, production.`);
  let backend: Backend;
  if (rawBackend === 'demo' || rawBackend === 'test' || rawBackend === 'api') backend = rawBackend;
  else {
    if (rawBackend) errors.push(`EXPO_PUBLIC_BACKEND="${rawBackend}" is not one of demo, test, api.`);
    if (appEnv === 'production') errors.push('EXPO_PUBLIC_BACKEND is required for a production build (set it to "api").');
    backend = inferBackend(v);
  }
  const apiUrl = (v.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const supabaseUrl = backend === 'test' ? (v.EXPO_PUBLIC_SUPABASE_URL ?? '').trim() : '';
  const supabaseKey = backend === 'test' ? (v.EXPO_PUBLIC_SUPABASE_KEY ?? '').trim() : '';

  if (backend === 'test' && (!supabaseUrl || !supabaseKey)) errors.push('EXPO_PUBLIC_BACKEND=test needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY (publishable key).');
  if (backend === 'api' && !apiUrl && appEnv !== 'development') errors.push('EXPO_PUBLIC_API_URL is required (address of the ZIV API).');

  if (appEnv === 'production') {
    if (backend !== 'api') errors.push(`A production build must use EXPO_PUBLIC_BACKEND=api (got "${backend}"): demo and test data never reach production.`);
    if (!apiUrl) { if (backend === 'api') { /* already reported */ } else errors.push('EXPO_PUBLIC_API_URL is required for production.'); }
    else {
      let host = '';
      try { const u = new URL(apiUrl); host = u.hostname; if (u.protocol !== 'https:') errors.push('EXPO_PUBLIC_API_URL must use https:// in production.'); }
      catch { errors.push('EXPO_PUBLIC_API_URL is not a valid URL.'); }
      if (host && (LOCAL.test(host) || host.endsWith('.local') || host.endsWith('.invalid'))) errors.push('EXPO_PUBLIC_API_URL points to a local or placeholder address; production needs the public API address.');
    }
    if (v.EXPO_PUBLIC_SUPABASE_URL || v.EXPO_PUBLIC_SUPABASE_KEY) errors.push('Remove EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY from production builds (test project only).');
    if (v.EXPO_PUBLIC_DEMO && v.EXPO_PUBLIC_DEMO !== '0') errors.push('EXPO_PUBLIC_DEMO must be unset or 0 in production.');
  }
  return { backend, appEnv, apiUrl: apiUrl || (backend === 'api' && appEnv === 'development' ? 'http://localhost:3000' : ''), supabaseUrl, supabaseKey, errors };
}
