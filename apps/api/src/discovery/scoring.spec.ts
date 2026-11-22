import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyPicks, passesDealbreakers } from './scoring';

const f = (value: string, useForMatching = true) => ({ value, preferNotToSay: false, visibility: 'private', useForMatching }) as any;
const seeker = { ageMin: 25, ageMax: 40, maxDistanceKm: 20, jewishLife: {}, dismissed: new Set<string>(),
  dealbreakers: { kashrutHome: ['strict_home_and_out', 'kosher_home_flexible_out'] },
  soft: { shabbat: { values: ['friday_dinner'], weight: 3 } } };

test('unanswered field never fails a dealbreaker', () => {
  assert.equal(passesDealbreakers(seeker, { id: 'a', age: 30, distanceKm: 5, jewishLife: {} }), true);
});
test('answer not allowed for matching is ignored', () => {
  assert.equal(passesDealbreakers(seeker, { id: 'a', age: 30, distanceKm: 5, jewishLife: { kashrutHome: f('not_kosher', false) } }), true);
});
test('shared answer outside dealbreaker excludes', () => {
  assert.equal(passesDealbreakers(seeker, { id: 'a', age: 30, distanceKm: 5, jewishLife: { kashrutHome: f('not_kosher') } }), false);
});
test('picks are ranked and explained', () => {
  const r = dailyPicks(seeker, [
    { id: 'x', age: 30, distanceKm: 15, jewishLife: {} },
    { id: 'y', age: 31, distanceKm: 2, jewishLife: { shabbat: f('friday_dinner') } },
  ], 8);
  assert.equal(r[0]!.id, 'y');
  assert.ok(r[0]!.reasons.some((x) => x.key === 'reason.shared.shabbat'));
});
