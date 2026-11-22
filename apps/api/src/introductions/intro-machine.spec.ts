import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IntroError, myAnswer, outcome, respond } from './intro-machine';

test('connects only when both said yes, in any order', () => {
  assert.equal(respond(respond('proposed', 'a', true), 'b', true), 'connected');
  assert.equal(respond(respond('proposed', 'b', true), 'a', true), 'connected');
});
test('one no closes it', () => {
  assert.equal(respond('accepted_by_a', 'b', false), 'declined');
  assert.equal(respond('proposed', 'a', false), 'declined');
});
test('saying yes twice does not connect alone', () => {
  assert.equal(respond('accepted_by_a', 'a', true), 'accepted_by_a');
});
test('closed introductions cannot be answered', () => {
  assert.throws(() => respond('declined', 'a', true), IntroError);
  assert.throws(() => respond('expired', 'b', true), IntroError);
  assert.throws(() => respond('connected', 'b', false), IntroError);
});
test('a person never sees the other side’s answer', () => {
  assert.equal(myAnswer('accepted_by_a', 'b'), 'pending');
  assert.equal(myAnswer('accepted_by_a', 'a'), 'accepted');
});
test('the introducer never learns who declined', () => {
  assert.equal(outcome('accepted_by_b'), 'waiting');
  assert.equal(outcome('declined'), 'closed');
  assert.equal(outcome('expired'), 'closed');
  assert.equal(outcome('connected'), 'connected');
});
