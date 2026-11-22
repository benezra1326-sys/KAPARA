import type { CallState } from '@kapara/shared';

export type CallEvent = 'accept' | 'decline' | 'timeout' | 'join' | 'request_video' | 'accept_video' | 'decline_video' | 'hangup';

/** Each consent step is a separate transition; video can never be skipped to. */
const T: Partial<Record<CallState, Partial<Record<CallEvent, CallState>>>> = {
  invited: { accept: 'accepted', decline: 'declined', timeout: 'expired', hangup: 'ended' },
  accepted: { join: 'connected', hangup: 'ended' },
  connected: { request_video: 'video_requested', hangup: 'ended' },
  video_requested: { accept_video: 'video_on', decline_video: 'connected', hangup: 'ended' },
  video_on: { hangup: 'ended' },
};

export function next(state: CallState, ev: CallEvent): CallState {
  const to = T[state]?.[ev];
  if (!to) throw new Error(`illegal_transition:${state}:${ev}`);
  return to;
}
