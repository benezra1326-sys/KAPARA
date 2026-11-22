import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '@kapara/config';
import { coarsen, crossedTimes } from '@kapara/shared';

test('the device rounds to ~110 m before sending', () => {
  assert.deepEqual(coarsen({ lat: 48.856614, lng: 2.352219 }), { lat: 48.857, lng: 2.352 });
});
test('crossings are never counted precisely', () => {
  assert.equal(crossedTimes(1), 'once');
  assert.equal(crossedTimes(7), 'several');
});
test('privacy rules stay strict', () => {
  assert.ok(RULES.crossedRadiusMeters >= 250);
  assert.ok(RULES.locationPrecisionMeters >= 100);
  assert.ok(RULES.crossedDisplayDelayHours >= 1);
  assert.ok(RULES.crossedSensitiveZoneMeters > RULES.crossedRadiusMeters);
});
