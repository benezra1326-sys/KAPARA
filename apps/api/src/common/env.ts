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
});
export type Env = z.infer<typeof Env>;

let cached: Env | undefined;
export function env(): Env {
  if (!cached) cached = Env.parse(process.env);
  return cached;
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
