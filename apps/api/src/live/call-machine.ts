import type { CallState } from '@kapara/shared';

export type CallEvent =
  | 'accept' | 'decline' | 'timeout' | 'join'
  | 'request_video' | 'accept_video' | 'decline_video' | 'stop_video'
  | 'hangup';

/**
 * Each consent step is a separate transition; video can never be skipped to.
 * invited → accepted (audio consent) → connected (mic only)
 *   → video_requested (one side asks) → video_on (the other side accepts)
 * Either side can go back to audio (stop_video) or hang up at any time.
 */
const T: Partial<Record<CallState, Partial<Record<CallEvent, CallState>>>> = {
  invited: { accept: 'accepted', decline: 'declined', timeout: 'expired', hangup: 'ended' },
  accepted: { join: 'connected', hangup: 'ended' },
  connected: { request_video: 'video_requested', hangup: 'ended' },
  video_requested: { accept_video: 'video_on', decline_video: 'connected', timeout: 'connected', hangup: 'ended' },
  video_on: { stop_video: 'connected', hangup: 'ended' },
};

export function next(state: CallState, ev: CallEvent): CallState {
  const to = T[state]?.[ev];
  if (!to) throw new Error(`illegal_transition:${state}:${ev}`);
  return to;
}

export const isTerminal = (s: CallState) => s === 'ended' || s === 'declined' || s === 'expired';
/** Camera publishing is allowed by the media server only in this state. */
export const cameraAllowed = (s: CallState) => s === 'video_on';
