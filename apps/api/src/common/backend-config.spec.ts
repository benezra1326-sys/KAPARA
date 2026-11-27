import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkAppEnv } from '@kapara/config';
import { productionProblems, type Env } from './env';

test('app: production must use the real API over https', () => {
  const ok = checkAppEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'api', EXPO_PUBLIC_API_URL: 'https://api.ziv.app' });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.backend, 'api');
  const missing = checkAppEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'api' });
  assert.ok(missing.errors.some((e) => e.includes('EXPO_PUBLIC_API_URL')));
  assert.equal(missing.apiUrl, ''); // never falls back to localhost
  for (const url of ['http://api.ziv.app', 'https://localhost:3000', 'https://192.168.1.20:3000', 'https://127.0.0.1'])
    assert.ok(checkAppEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'api', EXPO_PUBLIC_API_URL: url }).errors.length > 0, url);
});

test('app: production refuses demo and Supabase test data', () => {
  assert.ok(checkAppEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'demo', EXPO_PUBLIC_API_URL: 'https://api.ziv.app' }).errors.length > 0);
  assert.ok(checkAppEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'test', EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_KEY: 'k' }).errors.length > 0);
  const mixed = checkAppEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'api', EXPO_PUBLIC_API_URL: 'https://api.ziv.app', EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' });
  assert.ok(mixed.errors.some((e) => e.includes('SUPABASE')));
  assert.ok(checkAppEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_API_URL: 'https://api.ziv.app' }).errors.some((e) => e.includes('EXPO_PUBLIC_BACKEND')));
});

test('app: one exclusive backend, older variables still map to one', () => {
  assert.equal(checkAppEnv({}).backend, 'demo');
  assert.equal(checkAppEnv({ EXPO_PUBLIC_DEMO: '0' }).backend, 'api');
  assert.equal(checkAppEnv({ EXPO_PUBLIC_DEMO: '0' }).apiUrl, 'http://localhost:3000'); // development only
  const test1 = checkAppEnv({ EXPO_PUBLIC_DEMO: '1', EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_KEY: 'k' });
  assert.equal(test1.backend, 'test');
  // The API backend never carries Supabase keys, even if they are in the environment.
  const api = checkAppEnv({ EXPO_PUBLIC_BACKEND: 'api', EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_KEY: 'k' });
  assert.equal(api.supabaseUrl, '');
});

const base = {
  NODE_ENV: 'production', PORT: 3000, DATABASE_URL: 'postgresql://u:p@db.internal:5432/ziv', JWT_SECRET: 'x'.repeat(40),
  LIVEKIT_URL: '', LIVEKIT_API_KEY: '', LIVEKIT_API_SECRET: '', REDIS_URL: '', RESEND_API_KEY: 're_x', MAIL_FROM: 'ZIV <hello@ziv.app>',
  APPLE_CLIENT_IDS: '', GOOGLE_CLIENT_IDS: '', S3_BUCKET: 'b', S3_REGION: 'auto', S3_ENDPOINT: '', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 's',
  S3_PUBLIC_URL: '', UPLOAD_DIR: '.uploads', PUBLIC_API_URL: '', API_INSTANCES: 1, ALLOW_DEMO_DATA: '0',
} as Env;

test('api: production starts only with mail, storage and a strong secret; Live may be off', () => {
  assert.deepEqual(productionProblems(base), []);
  assert.ok(productionProblems({ ...base, JWT_SECRET: 'change-me-to-a-long-random-string' }).length > 0);
  assert.ok(productionProblems({ ...base, RESEND_API_KEY: '' }).length > 0);
  assert.ok(productionProblems({ ...base, S3_BUCKET: '' }).length > 0);
  assert.ok(productionProblems({ ...base, LIVEKIT_URL: 'wss://x' }).length > 0); // half configured
  assert.ok(productionProblems({ ...base, API_INSTANCES: 2 }).length > 0);
  assert.deepEqual(productionProblems({ ...base, NODE_ENV: 'development', RESEND_API_KEY: '' }), []);
  // Messages name variables, never values.
  assert.ok(!productionProblems({ ...base, JWT_SECRET: 'short' }).join(' ').includes('short'));
});
