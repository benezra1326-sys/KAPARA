import type { CallMode } from '@kapara/shared';

/**
 * Call quotas (free vs premium). One place for the app to ask « may I start
 * this call? » before ringing anyone. Today nothing is limited: the premium
 * work replaces the policy with `setCallQuota(...)` at start-up (and the
 * database checks the same thing in `public.call_allowance`, so a modified
 * app cannot bypass it).
 */
export type CallContext = 'live' | 'match';
export type QuotaRefusal = 'quota_reached' | 'premium_required';
export type QuotaAnswer = { ok: true } | { ok: false; reason: QuotaRefusal };

export interface CallQuota {
  /** Before an outgoing call. */
  check(input: { mode: CallMode; context: CallContext }): Promise<QuotaAnswer> | QuotaAnswer;
  /** After any call that was answered (both directions), to count minutes. */
  record?(input: { mode: CallMode; context: CallContext; durationSec: number; direction: 'outgoing' | 'incoming' }): void;
}

const unlimited: CallQuota = { check: () => ({ ok: true }) };
let current: CallQuota = unlimited;

export function setCallQuota(q: CallQuota | null) { current = q ?? unlimited; }
export function callQuota(): CallQuota { return current; }
