import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** Keyed hash: codes and refresh tokens are never stored in clear. */
export const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');
export const sha256 = (data: string) => createHash('sha256').update(data).digest('hex');

export const newOtpCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
export const newOpaqueToken = () => randomBytes(32).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
