import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  LIVEKIT_URL: z.string().optional().default(''),
  LIVEKIT_API_KEY: z.string().optional().default(''),
  LIVEKIT_API_SECRET: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  // Auth. Every provider is optional: without it the method is reported as unavailable (or demo in development).
  RESEND_API_KEY: z.string().optional().default(''),
  MAIL_FROM: z.string().optional().default(''),
  /** Comma-separated Apple audiences (iOS bundle id, Services ID). */
  APPLE_CLIENT_IDS: z.string().optional().default(''),
  /** Comma-separated Google OAuth client ids (iOS, Android, web). */
  GOOGLE_CLIENT_IDS: z.string().optional().default(''),
  // Profile photos. S3-compatible storage (AWS S3, Cloudflare R2, Scaleway, MinIO).
  // Without it, development stores photos on the API's disk (UPLOAD_DIR) and production refuses uploads.
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default(''),
  /** Leave empty for AWS (https://s3.<region>.amazonaws.com). R2: https://<account>.r2.cloudflarestorage.com */
  S3_ENDPOINT: z.string().optional().default(''),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  /** Public base URL photos are read from (CDN or public bucket domain). */
  S3_PUBLIC_URL: z.string().optional().default(''),
  UPLOAD_DIR: z.string().optional().default('.uploads'),
  /** Base URL of this API as phones reach it (local photo storage only). Defaults to the request host. */
  PUBLIC_API_URL: z.string().optional().default(''),
  /**
   * Number of API instances behind the load balancer. Live presence and calls
   * are kept in memory: more than one instance needs a shared store (not built
   * yet), so production refuses to start with API_INSTANCES > 1.
   */
  API_INSTANCES: z.coerce.number().int().min(1).default(1),
  /** Comma-separated e-mail addresses of the people allowed to review reports (moderation routes). */
  MODERATOR_EMAILS: z.string().optional().default(''),
  /** Escape hatch for a staging database seeded with demo members. Never in production. */
  ALLOW_DEMO_DATA: z.enum(['0', '1']).default('0'),
});
export type Env = z.infer<typeof Env>;

let cached: Env | undefined;
export function env(): Env {
  if (!cached) {
    const r = Env.safeParse(process.env);
    // Names only, never values: secrets must not reach the logs.
    if (!r.success) throw new Error(`Invalid configuration: ${r.error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', ')}`);
    cached = r.data;
  }
  return cached;
}

/**
 * What a production API needs before it may start. Returns readable problems
 * (variable names only). Live without LiveKit is allowed: it is then switched
 * off and announced as unavailable, never simulated.
 */
export function productionProblems(e: Env = env()): string[] {
  if (e.NODE_ENV !== 'production') return [];
  const p: string[] = [];
  if (e.JWT_SECRET.length < 32 || /change-me/i.test(e.JWT_SECRET)) p.push('JWT_SECRET must be a random string of at least 32 characters.');
  if (/localhost|127\.0\.0\.1/.test(e.DATABASE_URL)) p.push('DATABASE_URL points to localhost.');
  if (!e.RESEND_API_KEY || !e.MAIL_FROM) p.push('RESEND_API_KEY and MAIL_FROM are required (sign-in codes by e-mail).');
  const s3 = [e.S3_BUCKET, e.S3_REGION, e.S3_ACCESS_KEY_ID, e.S3_SECRET_ACCESS_KEY];
  if (s3.some((v) => !v)) p.push('S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required (profile photos).');
  const lk = [e.LIVEKIT_URL, e.LIVEKIT_API_KEY, e.LIVEKIT_API_SECRET].filter(Boolean).length;
  if (lk > 0 && lk < 3) p.push('LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET go together (or leave all three empty: Live is then off).');
  if (e.API_INSTANCES > 1) p.push('API_INSTANCES > 1: Live presence and calls are in memory, run a single instance until a shared store (Redis) is implemented.');
  if (e.ALLOW_DEMO_DATA === '1') p.push('ALLOW_DEMO_DATA=1 is not allowed in production.');
  return p;
}
export const liveKitConfigured = () => {
  const e = env();
  return Boolean(e.LIVEKIT_URL && e.LIVEKIT_API_KEY && e.LIVEKIT_API_SECRET);
};
export const list = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
export const mailConfigured = () => Boolean(env().RESEND_API_KEY && env().MAIL_FROM);
export const s3Configured = () => {
  const e = env();
  return Boolean(e.S3_BUCKET && e.S3_REGION && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY);
};
