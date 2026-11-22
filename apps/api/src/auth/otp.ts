import { hmac, safeEqual } from './crypto';

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_MIN_INTERVAL_SECONDS = 30;

export const otpHash = (secret: string, email: string, code: string) => hmac(secret, `otp:${email}:${code}`);

export interface OtpRecord { codeHash: string; expiresAt: Date; attempts: number; consumedAt: Date | null }
export type OtpCheck = 'ok' | 'expired' | 'too_many_attempts' | 'mismatch' | 'consumed';

/** Pure check of a submitted code against the latest stored record. */
export function checkOtp(secret: string, email: string, code: string, rec: OtpRecord, now = new Date()): OtpCheck {
  if (rec.consumedAt) return 'consumed';
  if (rec.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (rec.attempts >= OTP_MAX_ATTEMPTS) return 'too_many_attempts';
  return safeEqual(rec.codeHash, otpHash(secret, email, code)) ? 'ok' : 'mismatch';
}

/** Throttling of code requests for one address (anti-spam, anti-enumeration timing is constant). */
export function otpRequestAllowed(recent: { createdAt: Date }[], now = new Date()): { ok: true } | { ok: false; retryAfter: number } {
  const hourAgo = now.getTime() - 3600_000;
  const lastHour = recent.filter((r) => r.createdAt.getTime() > hourAgo);
  if (lastHour.length >= OTP_MAX_PER_HOUR) {
    const oldest = Math.min(...lastHour.map((r) => r.createdAt.getTime()));
    return { ok: false, retryAfter: Math.ceil((oldest + 3600_000 - now.getTime()) / 1000) };
  }
  const last = Math.max(0, ...lastHour.map((r) => r.createdAt.getTime()));
  const wait = last + OTP_MIN_INTERVAL_SECONDS * 1000 - now.getTime();
  return wait > 0 ? { ok: false, retryAfter: Math.ceil(wait / 1000) } : { ok: true };
}
