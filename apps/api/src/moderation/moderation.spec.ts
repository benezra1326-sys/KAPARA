import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendRefusal } from '../conversations/anti-spam';
import { accountTransition, isModeratorEmail, normalizeStatus } from './moderation-rules';

test('moderators: only listed e-mails, case-insensitive, nobody when the list is empty', () => {
  assert.equal(isModeratorEmail('Avi@Example.org', 'avi@example.org, team@example.org'), true);
  assert.equal(isModeratorEmail('other@example.org', 'avi@example.org'), false);
  assert.equal(isModeratorEmail('avi@example.org', ''), false);
  assert.equal(isModeratorEmail(null, 'avi@example.org'), false);
});

test('report statuses: legacy "reviewed" reads as dismissed', () => {
  assert.equal(normalizeStatus('open'), 'open');
  assert.equal(normalizeStatus('actioned'), 'actioned');
  assert.equal(normalizeStatus('reviewed'), 'dismissed');
});

test('account actions: suspend, restore, hide, show', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  const clean = { hiddenAt: null, suspendedAt: null };
  assert.deepEqual(accountTransition('suspend', clean, now), { data: { suspendedAt: now }, kind: 'account_suspended', changed: true });
  const suspended = { hiddenAt: now, suspendedAt: now };
  assert.equal(accountTransition('suspend', suspended, now).changed, false); // idempotent, date kept
  assert.deepEqual(accountTransition('restore', suspended, now).data, { suspendedAt: null, hiddenAt: null });
  assert.equal(accountTransition('show', clean, now).changed, false);
  assert.equal(accountTransition('hide', clean, now).kind, 'profile_hidden');
});

test('messages: rate, daily cap, copy-paste campaigns, unanswered streaks', () => {
  const ok = { lastMinute: 0, lastDay: 0, sameTextElsewhere: 0, unansweredInARow: 0 };
  assert.equal(sendRefusal(ok), null);
  assert.equal(sendRefusal({ ...ok, lastMinute: 20 }), 'rate_limited');
  assert.equal(sendRefusal({ ...ok, lastDay: 500 }), 'daily_limit');
  assert.equal(sendRefusal({ ...ok, sameTextElsewhere: 1 }), null);
  assert.equal(sendRefusal({ ...ok, sameTextElsewhere: 2 }), 'duplicate_spam');
  assert.equal(sendRefusal({ ...ok, unansweredInARow: 9 }), null);
  assert.equal(sendRefusal({ ...ok, unansweredInARow: 10 }), 'wait_for_reply');
});
