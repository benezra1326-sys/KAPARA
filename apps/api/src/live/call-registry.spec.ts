import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '@kapara/config';
import { CallRegistry } from './call-registry';

test('one call at a time per member', () => {
  const r = new CallRegistry();
  r.create('a', 'b', true, {}, 0);
  assert.equal(r.check('c', 'b', 0), 'not_available');
  assert.equal(r.check('a', 'c', 0), 'rate_limited');
  assert.equal(r.check('c', 'd', 0), null);
});

test('a decline starts a cooldown for that caller only', () => {
  const r = new CallRegistry();
  const c = r.create('a', 'b', true, {}, 0);
  r.apply(c.id, 'decline', 'b', 0);
  assert.equal(r.isBusy('a'), false);
  assert.equal(r.check('a', 'b', 1), 'cooldown');
  assert.equal(r.check('c', 'b', 1), null);
  assert.equal(r.check('a', 'b', RULES.liveDeclineCooldownHours * 3_600_000 + 1), null);
});

test('invitations are rate limited', () => {
  const r = new CallRegistry();
  for (let i = 0; i < RULES.liveMaxInvitesPer10Min; i++) {
    const c = r.create('a', `x${i}`, true, {}, i);
    r.apply(c.id, 'hangup', 'a', i);
  }
  assert.equal(r.check('a', 'y', 100), 'rate_limited');
  assert.equal(r.check('a', 'y', 10 * 60_000 + 100), null);
});

test('video request remembers who asked and is cleared afterwards', () => {
  const r = new CallRegistry();
  const c = r.create('a', 'b', true, {}, 0);
  r.apply(c.id, 'accept', 'b');
  r.apply(c.id, 'join', 'b');
  r.apply(c.id, 'request_video', 'a');
  assert.equal(r.get(c.id)?.videoRequestedBy, 'a');
  r.apply(c.id, 'accept_video', 'b');
  assert.equal(r.get(c.id)?.videoRequestedBy, undefined);
});
