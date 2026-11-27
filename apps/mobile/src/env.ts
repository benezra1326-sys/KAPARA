import { checkAppEnv } from '@kapara/config';

/**
 * The backend this build talks to, decided once (see packages/config/src/backend.ts).
 * Each variable is read literally so Expo inlines it at build time.
 * app.config.ts runs the same check and refuses a broken production build;
 * this copy lets the app show a clear screen instead of silently falling back.
 */
export const ENV = checkAppEnv({
  EXPO_PUBLIC_BACKEND: process.env.EXPO_PUBLIC_BACKEND,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  EXPO_PUBLIC_DEMO: process.env.EXPO_PUBLIC_DEMO,
});

export const BACKEND = ENV.backend;
export const IS_PRODUCTION = ENV.appEnv === 'production';
/** Configuration problems in a production build block the app (ConfigError screen). Elsewhere they are warnings. */
export const CONFIG_BLOCKED = IS_PRODUCTION && ENV.errors.length > 0;
