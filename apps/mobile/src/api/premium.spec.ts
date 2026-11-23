import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canFilterLive, isQuotaError, LIMITS, planFor, remaining, saving, total } from '../premium/plans';

test('free plan: 20 reactions a day, then nothing left; Live never capped', () => {
  assert.equal(remaining(LIMITS.free, { like: 0, liveCall: 0 }, 'like'), 20);
  assert.equal(remaining(LIMITS.free, { like: 25, liveCall: 0 }, 'like'), 0);
  assert.equal(remaining(LIMITS.free, { like: 0, liveCall: 99 }, 'liveCall'), null);
});

test('Live gender and city: paid plans only, the same for everyone', () => {
  assert.equal(canFilterLive('free'), false);
  assert.equal(canFilterLive('plus'), true);
  assert.equal(canFilterLive('free', true), true);
  assert.equal(planFor('liveFilters', 'free'), 'plus');
});

test('Cercle is unlimited for reactions and Live', () => {
  assert.equal(remaining(LIMITS.cercle, { like: 500, liveCall: 500 }, 'like'), null);
  assert.equal(remaining(LIMITS.cercle, { like: 500, liveCall: 500 }, 'liveCall'), null);
});

test('each plan gives strictly more than the one below', () => {
  assert.ok(LIMITS.plus.picksPerDay > LIMITS.free.picksPerDay && LIMITS.cercle.picksPerDay > LIMITS.plus.picksPerDay);
  assert.ok(LIMITS.plus.likesPerDay! > LIMITS.free.likesPerDay!);
  assert.equal(LIMITS.free.seeLikes, false);
});

test('the paywall suggests the cheapest plan that answers the need', () => {
  assert.equal(planFor('like', 'free'), 'plus');
  assert.equal(planFor('seeLikes', 'free'), 'plus');
  assert.equal(planFor('discreet', 'free'), 'cercle');
  assert.equal(planFor('like', 'plus'), 'cercle');
});

test('prices: longer commitments cost less per month', () => {
  assert.equal(total('plus', 3), 35.97);
  assert.equal(saving('plus', 1), 0);
  assert.ok(saving('cercle', 6) > saving('cercle', 3));
});

test('quota errors from the database are recognised', () => {
  assert.ok(isQuotaError(new Error('quota_exceeded')));
  assert.ok(!isQuotaError(new Error('network')));
});
