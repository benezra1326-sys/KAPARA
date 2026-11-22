import { z } from 'zod';

/** Live call lifecycle: each consent step is explicit and separate. */
export const CallState = z.enum([
  'invited',        // A proposed a call
  'accepted',       // B accepted the invitation (audio only)
  'declined',
  'expired',
  'connected',      // both in the room, microphones only
  'video_requested',// one side asked to turn cameras on
  'video_on',       // both explicitly consented; each still controls own camera
  'ended',
]);
export type CallState = z.infer<typeof CallState>;

export const CallMode = z.enum(['audio', 'video']);

/** Socket.io event names shared by app and API. */
export const LIVE_EVENTS = {
  presenceSet: 'presence:set',
  presenceList: 'presence:list',
  inviteSend: 'call:invite',
  inviteReceived: 'call:invited',
  inviteRespond: 'call:respond',
  stateChanged: 'call:state',
  videoRequest: 'call:video:request',
  videoRespond: 'call:video:respond',
  hangup: 'call:hangup',
} as const;
