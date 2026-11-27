import { list } from '../common/env';

/** Moderators are named by e-mail in MODERATOR_EMAILS (case-insensitive). Nobody else. */
export function isModeratorEmail(email: string | null | undefined, configured: string): boolean {
  if (!email) return false;
  const allowed = new Set(list(configured).map((e) => e.toLowerCase()));
  return allowed.has(email.trim().toLowerCase());
}

export const REPORT_STATUSES = ['open', 'dismissed', 'actioned'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
/** Older rows used "reviewed": read as dismissed, never rewritten. */
export const normalizeStatus = (s: string): ReportStatus => (s === 'actioned' ? 'actioned' : s === 'open' ? 'open' : 'dismissed');

export type ModerationActionKind =
  | 'report_dismissed' | 'report_actioned' | 'profile_hidden' | 'profile_shown'
  | 'account_suspended' | 'account_restored' | 'photo_removed';

/** Which audit entries an account action writes, and the state it leads to. Pure, tested. */
export function accountTransition(action: 'hide' | 'show' | 'suspend' | 'restore', current: { hiddenAt: Date | null; suspendedAt: Date | null }, now = new Date()) {
  switch (action) {
    case 'hide': return { data: { hiddenAt: current.hiddenAt ?? now }, kind: 'profile_hidden' as const, changed: !current.hiddenAt };
    case 'show': return { data: { hiddenAt: null }, kind: 'profile_shown' as const, changed: !!current.hiddenAt };
    case 'suspend': return { data: { suspendedAt: current.suspendedAt ?? now }, kind: 'account_suspended' as const, changed: !current.suspendedAt };
    case 'restore': return { data: { suspendedAt: null, hiddenAt: null }, kind: 'account_restored' as const, changed: !!(current.suspendedAt || current.hiddenAt) };
  }
}
