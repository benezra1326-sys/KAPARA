import { test } from 'node:test';
import assert from 'node:assert/strict';
import { next } from './call-machine';

test('video requires explicit acceptance', () => {
  let s = next('invited', 'accept');
  s = next(s, 'join');
  assert.throws(() => next(s, 'accept_video'));
  s = next(s, 'request_video');
  assert.equal(next(s, 'decline_video'), 'connected');
  assert.equal(next(s, 'accept_video'), 'video_on');
});
test('cannot join without acceptance', () => {
  assert.throws(() => next('invited', 'join'));
});
