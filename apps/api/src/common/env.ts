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
