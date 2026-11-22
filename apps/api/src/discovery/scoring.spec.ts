import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affinity, matchableAnswers, meetsDealbreakers, mutuallyCompatible, rank, score, type Candidate, type Seeker } from './scoring';

const f = (value: unknown, useForMatching = true, extra = {}) => ({ value, preferNotToSay: false, visibility: 'private', useForMatching, ...extra }) as any;
const criteria = { ageMin: 25, ageMax: 40, maxDistanceKm: 20, dealbreakers: {}, soft: {} };
const seeker = (over: Partial<Seeker> = {}): Seeker => ({
  id: 's', age: 32, answers: {}, languages: ['fr'], dismissed: new Set(), liked: [], tooFarSignals: 0,
  criteria: { ...criteria, dealbreakers: { kashrutHome: ['strict_home_and_out', 'kosher_home_flexible_out'] }, soft: { shabbat: { values: ['friday_dinner'], weight: 3 } } },
  ...over,
});
const cand = (over: Partial<Candidate> = {}): Candidate => ({ id: 'c', age: 30, distanceKm: 5, answers: {}, languages: ['fr'], criteria: null, ...over });

test('only consented, shared-for-matching, answered fields are usable', () => {
  const jl = {
    practice: f('traditional'), shabbat: f('friday_dinner', false), kashrutHome: f('not_kosher'),
    holidays: f('some', true, { preferNotToSay: true }), communityName: f('Copernic'), children: f('want'),
  };
  assert.deepEqual(matchableAnswers(jl, new Set(['practice', 'shabbat', 'holidays', 'communityName', 'children'])), { practice: 'traditional', children: 'want' });
});
test('unanswered field never fails a dealbreaker', () => {
  assert.equal(meetsDealbreakers({ kashrutHome: ['strict_home_and_out'] }, {}), true);
  assert.equal(meetsDealbreakers({ kashrutHome: ['strict_home_and_out'] }, { kashrutHome: 'not_kosher' }), false);
});
test('dealbreakers are mutual', () => {
  const s = seeker({ answers: { shabbat: 'not_currently' } });
  const c = cand({ criteria: { ...criteria, dealbreakers: { shabbat: ['full_observance'] } } });
  assert.equal(mutuallyCompatible(s, c), false);
  assert.equal(mutuallyCompatible(seeker(), c), true); // seeker did not share shabbat: unknown, not excluded
});
test('age and distance criteria are mutual', () => {
  assert.equal(mutuallyCompatible(seeker(), cand({ criteria: { ...criteria, ageMax: 30 } })), false);
  assert.equal(mutuallyCompatible(seeker(), cand({ distanceKm: 8, criteria: { ...criteria, maxDistanceKm: 5 } })), false);
});
test('dismissed profiles are excluded', () => {
  assert.equal(mutuallyCompatible(seeker({ dismissed: new Set(['c']) }), cand()), false);
});
test('picks are ranked and explained', () => {
  const r = rank(seeker(), [cand({ id: 'x', distanceKm: 15 }), cand({ id: 'y', distanceKm: 2, answers: { shabbat: 'friday_dinner' } })], 8);
  assert.equal(r[0]!.id, 'y');
  assert.equal(r[0]!.reasons[0]!.key, 'reason.shared.shabbat');
  assert.ok(r[0]!.reasons.some((x) => x.key === 'reason.nearby' && x.params?.km === '2'));
});
test('every pick has at least one reason', () => {
  const s = seeker({ criteria: { ...criteria } });
  assert.deepEqual(score(s, cand({ distanceKm: 19 })).reasons, [{ key: 'reason.fits_your_criteria' }]);
});
test('missing signals are neutral, not penalties', () => {
  const s = seeker();
  const silent = score(s, cand({ id: 'a' }), 'seed').score;
  const mismatch = score(s, cand({ id: 'a', answers: { shabbat: 'not_currently' } }), 'seed').score;
  assert.ok(silent > mismatch);
});
test('affinity needs at least 3 signals and explains the strongest field', () => {
  const liked = [{ practice: 'traditional' }, { practice: 'traditional' }, { practice: 'masorti' }];
  assert.equal(affinity(liked.slice(0, 2), { practice: 'traditional' }).value, null);
  const a = affinity(liked, { practice: 'traditional' });
  assert.ok(a.value! > 0.6 && a.strongest === 'practice');
});
test('reciprocal preferences raise the score', () => {
  const s = seeker({ answers: { practice: 'traditional' } });
  const likesMe = cand({ id: 'a', criteria: { ...criteria, soft: { practice: { values: ['traditional'], weight: 3 } } } });
  const prefersOther = cand({ id: 'a', criteria: { ...criteria, soft: { practice: { values: ['orthodox'], weight: 3 } } } });
  assert.ok(score(s, likesMe).score > score(s, prefersOther).score);
});
