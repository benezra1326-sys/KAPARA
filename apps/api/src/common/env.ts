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
