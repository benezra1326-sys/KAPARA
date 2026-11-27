/**
 * Anti-spam and anti-harassment rules for messages, counted in the database
 * (so they hold with several API instances). Pure decision, tested.
 */
export const MESSAGE_LIMITS = {
  /** Messages a member can send per minute, all conversations together. */
  perMinute: 20,
  /** Messages a member can send per day. */
  perDay: 500,
  /** The same text sent to this many different conversations in 10 minutes looks like a campaign. */
  sameTextConversations: 3,
  /** Messages in a row without any answer: wait for the other person. */
  unansweredInARow: 10,
} as const;

export interface SendStats {
  lastMinute: number;
  lastDay: number;
  /** Other conversations where this exact text was sent in the last 10 minutes. */
  sameTextElsewhere: number;
  /** Messages from me at the end of this conversation, since the other's last message. */
  unansweredInARow: number;
}

export type SendRefusal = 'rate_limited' | 'daily_limit' | 'duplicate_spam' | 'wait_for_reply';

export function sendRefusal(s: SendStats): SendRefusal | null {
  if (s.lastMinute >= MESSAGE_LIMITS.perMinute) return 'rate_limited';
  if (s.lastDay >= MESSAGE_LIMITS.perDay) return 'daily_limit';
  if (s.sameTextElsewhere >= MESSAGE_LIMITS.sameTextConversations - 1) return 'duplicate_spam';
  if (s.unansweredInARow >= MESSAGE_LIMITS.unansweredInARow) return 'wait_for_reply';
  return null;
}
