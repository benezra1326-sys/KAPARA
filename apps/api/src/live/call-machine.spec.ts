import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraAllowed, next } from './call-machine';

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
test('camera is allowed only in video_on, and either side can go back to audio', () => {
  assert.equal(cameraAllowed('connected'), false);
  assert.equal(cameraAllowed('video_requested'), false);
  assert.equal(cameraAllowed('video_on'), true);
  assert.equal(next('video_on', 'stop_video'), 'connected');
});
test('an unanswered video request falls back to audio', () => {
  assert.equal(next('video_requested', 'timeout'), 'connected');
});
test('hang up is always possible before the end', () => {
  for (const s of ['invited', 'accepted', 'connected', 'video_requested', 'video_on'] as const) assert.equal(next(s, 'hangup'), 'ended');
  assert.throws(() => next('ended', 'hangup'));
});
