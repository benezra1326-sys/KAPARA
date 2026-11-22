import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyJewishLifeUpdate } from './jewish-life-update';

const f = (value: unknown, extra = {}) => ({ value, preferNotToSay: false, visibility: 'private', useForMatching: false, ...extra }) as any;

test('update merges instead of replacing other answers', () => {
  const { next } = applyJewishLifeUpdate({ practice: f('traditional') } as any, { shabbat: f('friday_dinner') }, new Set(['practice', 'shabbat']));
  assert.ok(next.practice && next.shabbat);
});
test('answer without consent is refused', () => {
  const r = applyJewishLifeUpdate({}, { kashrutHome: f('not_kosher') }, new Set());
  assert.deepEqual(r.missingConsent, ['kashrutHome']);
});
test('a free note also needs consent', () => {
  const r = applyJewishLifeUpdate({}, { shabbat: f(null, { note: 'ça dépend des semaines' }) }, new Set());
  assert.deepEqual(r.missingConsent, ['shabbat']);
});
test('prefer not to say needs no consent and drops value and matching use', () => {
  const r = applyJewishLifeUpdate({}, { practice: f('orthodox', { preferNotToSay: true, useForMatching: true }) }, new Set());
  assert.deepEqual(r.missingConsent, []);
  assert.equal(r.next.practice!.value, null);
  assert.equal(r.next.practice!.useForMatching, false);
});
test('null erases a field', () => {
  const r = applyJewishLifeUpdate({ practice: f('traditional') } as any, { practice: null }, new Set());
  assert.equal(r.next.practice, undefined);
});
