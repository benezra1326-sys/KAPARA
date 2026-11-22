/**
 * Double opt-in introduction. Pure, so it can be tested without a database.
 *
 *   proposed ──A yes──▶ accepted_by_a ──B yes──▶ connected
 *      │      ──B yes──▶ accepted_by_b ──A yes──▶ connected
 *      └─ anyone no / block / expiry ──▶ declined | expired
 *
 * Privacy rules enforced by the views below:
 * - a person never learns the other's answer before both said yes;
 * - the introducer only sees waiting / connected / closed, never who declined.
 */
export type IntroStatus = 'proposed' | 'accepted_by_a' | 'accepted_by_b' | 'connected' | 'declined' | 'expired';
export type Side = 'a' | 'b';

export const OPEN_STATUSES: IntroStatus[] = ['proposed', 'accepted_by_a', 'accepted_by_b'];
/** Long on purpose: no anxious countdown, and the clock pauses during Shabbat mode. */
export const INTRO_TTL_DAYS = 14;
/** Anti-spam: open proposals per introducer. */
export const MAX_OPEN_PER_INTRODUCER = 5;

export class IntroError extends Error {}

export function respond(status: IntroStatus, side: Side, accept: boolean): IntroStatus {
  if (!OPEN_STATUSES.includes(status)) throw new IntroError('intro_closed');
  if (!accept) return 'declined';
  if (status === 'proposed') return side === 'a' ? 'accepted_by_a' : 'accepted_by_b';
  if (status === (side === 'a' ? 'accepted_by_b' : 'accepted_by_a')) return 'connected';
  return status; // answering yes twice changes nothing
}

/** What one of the two people sees about their own answer. */
export function myAnswer(status: IntroStatus, side: Side): 'pending' | 'accepted' {
  return status === (side === 'a' ? 'accepted_by_a' : 'accepted_by_b') ? 'accepted' : 'pending';
}

/** What the introducer sees. */
export function outcome(status: IntroStatus): 'waiting' | 'connected' | 'closed' {
  if (status === 'connected') return 'connected';
  return OPEN_STATUSES.includes(status) ? 'waiting' : 'closed';
}
