import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterJewishLife } from './visibility';

const field = (visibility: 'private' | 'matches' | 'members', value: any = 'traditional') =>
  ({ value, preferNotToSay: false, visibility, useForMatching: true });

test('private fields never leak to others', () => {
  const r = filterJewishLife({ practice: field('private') } as any, 'match', new Set(['practice']));
  assert.deepEqual(r, {});
});
test('matches-only fields are hidden from members', () => {
  const data = { shabbat: field('matches', 'friday_dinner') } as any;
  assert.deepEqual(filterJewishLife(data, 'member', new Set(['shabbat'])), {});
  assert.ok(filterJewishLife(data, 'match', new Set(['shabbat'])).shabbat);
});
test('no consent means hidden even if visibility is members', () => {
  assert.deepEqual(filterJewishLife({ practice: field('members') } as any, 'member', new Set()), {});
});
test('prefer-not-to-say is never shown', () => {
  const data = { practice: { ...field('members'), preferNotToSay: true } } as any;
  assert.deepEqual(filterJewishLife(data, 'member', new Set(['practice'])), {});
});
