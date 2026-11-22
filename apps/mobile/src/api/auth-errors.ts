import type { TFunction } from 'i18next';
import { ApiError } from './client';

const KNOWN = ['invalid_code', 'code_expired', 'too_many_attempts', 'email_delivery_not_configured', 'account_deleted'] as const;

/** Human message for a sign-in error, in the member's language. Never shows a raw server code. */
export function authErrorMessage(t: TFunction, e: unknown): string {
  if (!(e instanceof ApiError)) return t('auth.errors.offline');
  if (e.status === 429) {
    const s = Number(e.data.retryAfter);
    return Number.isFinite(s) && s > 0 ? t('auth.errors.rateLimitedIn', { seconds: Math.ceil(s) }) : t('auth.errors.rateLimited');
  }
  if (e.code === 'invalid_code' && typeof e.data.attemptsLeft === 'number') {
    return e.data.attemptsLeft > 0 ? t('auth.errors.invalidCodeLeft', { n: e.data.attemptsLeft }) : t('auth.errors.too_many_attempts');
  }
  if ((KNOWN as readonly string[]).includes(e.code)) return t(`auth.errors.${e.code}`);
  if (e.status === 503) return t('auth.errors.email_delivery_not_configured');
  return t('auth.errors.generic');
}
