import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PresenceStore } from './presence.store';

const MIN = 60_000;

test('availability is opt-in and ends after the window', () => {
  const p = new PresenceStore(15 * MIN, 90_000);
  assert.equal(p.isAvailable('a', 0), false);
  p.set('a', 's1', true, 0);
  for (let t = 60_000; t < 15 * MIN; t += 60_000) p.heartbeat('a', t);
  assert.equal(p.isAvailable('a', 14 * MIN), true);
  assert.equal(p.isAvailable('a', 15 * MIN), false);
});

test('without heartbeat, availability lapses quickly', () => {
  const p = new PresenceStore(15 * MIN, 90_000);
  p.set('a', 's1', true, 0);
  assert.equal(p.isAvailable('a', 89_000), true);
  assert.equal(p.isAvailable('a', 91_000), false);
  assert.deepEqual(p.sweep(91_000), { available: [], expired: ['a'] });
});

test('turning off or closing the last socket hides the member', () => {
  const p = new PresenceStore();
  p.set('a', 's1', true, 0);
  p.set('a', 's2', true, 0);
  assert.equal(p.dropSocket('a', 's1'), false);
  assert.equal(p.isAvailable('a', 1), true);
  assert.equal(p.dropSocket('a', 's2'), true);
  assert.equal(p.isAvailable('a', 1), false);
  p.set('b', 's3', true, 0);
  p.set('b', 's3', false, 1);
  assert.equal(p.isAvailable('b', 2), false);
});
