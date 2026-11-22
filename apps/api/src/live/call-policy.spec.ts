import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canReach, type MemberFacts } from './call-policy';

const m = (o: Partial<MemberFacts> = {}): MemberFacts => ({
  exists: true, paused: false, liveEnabled: true, liveCallsFrom: 'members',
  gender: 'woman', age: 30, wantsGenders: [], ageMin: null, ageMax: null, ...o,
});
const stranger = { blockedEitherWay: false, connected: false };
const contact = { blockedEitherWay: false, connected: true };

test('the callee setting always wins', () => {
  assert.equal(canReach(m(), m({ liveCallsFrom: 'nobody' }), contact), 'not_available');
  assert.equal(canReach(m(), m({ liveCallsFrom: 'matches' }), stranger), 'not_available');
  assert.equal(canReach(m(), m({ liveCallsFrom: 'matches' }), contact), null);
  assert.equal(canReach(m(), m({ liveCallsFrom: 'members' }), stranger), null);
});

test('blocks, pause and disabled Live hide the member, without saying why', () => {
  assert.equal(canReach(m(), m(), { blockedEitherWay: true, connected: true }), 'not_available');
  assert.equal(canReach(m(), m({ paused: true }), contact), 'not_available');
  assert.equal(canReach(m(), m({ liveEnabled: false }), contact), 'not_available');
  assert.equal(canReach(m({ liveEnabled: false }), m(), contact), 'live_disabled');
});

test('strangers must fit each other\'s declared preferences; missing data never excludes', () => {
  const seeker = m({ gender: 'man', wantsGenders: ['woman'], ageMin: 28, ageMax: 38 });
  assert.equal(canReach(seeker, m({ gender: 'woman', age: 31, wantsGenders: ['man'] }), stranger), null);
  assert.equal(canReach(seeker, m({ gender: 'woman', age: 25 }), stranger), 'not_available');
  assert.equal(canReach(seeker, m({ gender: 'woman', wantsGenders: ['woman'] }), stranger), 'not_available');
  assert.equal(canReach(seeker, m({ gender: null, age: null }), stranger), null);
});
