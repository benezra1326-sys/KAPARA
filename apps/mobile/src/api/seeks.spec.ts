import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultSeeks, seeksMatch } from '../me/seeks';

test('a man seeking women sees women seeking men, never men', () => {
  const me = { gender: 'man' as const, seeks: ['woman' as const] };
  assert.equal(seeksMatch(me, { gender: 'woman', seeks: ['man'] }), true);
  assert.equal(seeksMatch(me, { gender: 'man', seeks: ['woman'] }), false);
  assert.equal(seeksMatch(me, { gender: 'man', seeks: ['man'] }), false);
  assert.equal(seeksMatch(me, { gender: 'woman', seeks: ['woman'] }), false);
});

test('a man seeking men sees men seeking men', () => {
  const me = { gender: 'man' as const, seeks: ['man' as const] };
  assert.equal(seeksMatch(me, { gender: 'man', seeks: ['man'] }), true);
  assert.equal(seeksMatch(me, { gender: 'man', seeks: ['woman'] }), false);
  assert.equal(seeksMatch(me, { gender: 'woman', seeks: ['man'] }), false);
});

test('a woman seeking women, and several choices', () => {
  assert.equal(seeksMatch({ gender: 'woman', seeks: ['woman'] }, { gender: 'woman', seeks: ['woman', 'man'] }), true);
  assert.equal(seeksMatch({ gender: 'woman', seeks: ['woman', 'man'] }, { gender: 'man', seeks: ['woman'] }), true);
});

test('no gender on the other side: never shown; no answer yet: default from gender', () => {
  assert.equal(seeksMatch({ gender: 'man', seeks: ['woman'] }, { gender: null, seeks: [] }), false);
  assert.deepEqual(defaultSeeks('man'), ['woman']);
  assert.equal(seeksMatch({ gender: 'man' }, { gender: 'man', seeks: [] }), false);
});
