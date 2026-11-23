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

/** What the caller proposes. The other person can always answer in audio only; each camera stays under its owner's control. */
export const CallMode = z.enum(['audio', 'video']);
export type CallMode = z.infer<typeof CallMode>;

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

/* ------------------------------------------------------------------ */
/* Live v1 contract (workstream C). Additive: earlier exports unchanged. */
/* ------------------------------------------------------------------ */

/** Who may propose a Live call to me. Default: people I already matched with. */
export const LiveCallsFrom = z.enum(['nobody', 'matches', 'members']);
export type LiveCallsFrom = z.infer<typeof LiveCallsFrom>;

export const LiveSettings = z.object({
  /** Live is opt-in: off until the member turns it on. */
  liveEnabled: z.boolean(),
  liveCallsFrom: LiveCallsFrom,
});
export type LiveSettings = z.infer<typeof LiveSettings>;

/** How calls are carried. `demo` = simulated, nothing is transmitted (announced in the UI). */
export const LiveMode = z.enum(['livekit', 'demo']);
export type LiveMode = z.infer<typeof LiveMode>;

export const LiveStatus = z.object({
  mode: LiveMode,
  availabilityMinutes: z.number().int(),
  inviteTtlSeconds: z.number().int(),
});
export type LiveStatus = z.infer<typeof LiveStatus>;

/** A member shown in Live. Only what is needed to decide to propose a call. */
export const LiveMember = z.object({
  userId: z.string(),
  firstName: z.string(),
  age: z.number().int(),
  headline: z.string().optional(),
  photoUrl: z.string().optional(),
  verified: z.boolean(),
  isDemo: z.boolean(),
});
export type LiveMember = z.infer<typeof LiveMember>;

/** Reasons an invitation can be refused. Deliberately vague towards the caller. */
export const InviteRefusal = z.enum([
  'not_available',   // offline, invisible, busy, blocked, not allowed: never say which
  'live_disabled',   // the caller has not turned Live on
  'cooldown',        // recently declined by this person
  'rate_limited',    // too many invitations in a short time
]);
export type InviteRefusal = z.infer<typeof InviteRefusal>;

/** What the app needs to join the media room. */
export const JoinInfo = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('livekit'), url: z.string(), token: z.string(), room: z.string() }),
  z.object({ mode: z.literal('demo'), room: z.string(), notice: z.literal('demo_call_simulated') }),
  /** Direct peer-to-peer call (WebRTC), signalled over the database's private realtime channel. */
  z.object({ mode: z.literal('webrtc'), room: z.string(), initiator: z.boolean() }),
]);
export type JoinInfo = z.infer<typeof JoinInfo>;

export const CallSnapshot = z.object({
  callId: z.string(),
  state: CallState,
  /** The other person, from the receiver's point of view. */
  peer: LiveMember,
  direction: z.enum(['outgoing', 'incoming']),
  /** Who asked for video, when state is video_requested. */
  videoRequestedBy: z.enum(['me', 'peer']).optional(),
  /** What the caller proposed (absent = audio, older servers). */
  mode: CallMode.optional(),
});
export type CallSnapshot = z.infer<typeof CallSnapshot>;

/**
 * Live "au hasard" (Azar-style): the app sends a few video requests at once to
 * random members present in Live. Filters are for paid plans only; the server
 * ignores them otherwise.
 */
export const LiveSearchFilters = z.object({
  gender: z.enum(['woman', 'man', 'nonbinary']).optional(),
  regionCode: z.string().max(40).optional(),
});
export type LiveSearchFilters = z.infer<typeof LiveSearchFilters>;

export const CallReportReason = z.enum(['inappropriate', 'harassment', 'fake_profile', 'underage', 'other']);
export type CallReportReason = z.infer<typeof CallReportReason>;

/** Socket payloads (client → server), validated on the server. */
export const LivePayloads = {
  presenceSet: z.object({ available: z.boolean() }),
  invite: z.object({ to: z.string().min(1), mode: CallMode.default('audio') }),
  /** `video`: answer a video call with my camera on (only if the caller proposed video). */
  respond: z.object({ callId: z.string().min(1), accept: z.boolean(), video: z.boolean().default(false) }),
  callRef: z.object({ callId: z.string().min(1) }),
  videoRespond: z.object({ callId: z.string().min(1), accept: z.boolean() }),
  report: z.object({ callId: z.string().min(1), reason: CallReportReason, block: z.boolean().default(true) }),
} as const;

/** Events added in v1 (server → client unless noted). */
export const LIVE_EVENTS_V1 = {
  ...LIVE_EVENTS,
  /** client → server: keep my availability alive (every ~30 s). */
  presenceHeartbeat: 'presence:heartbeat',
  /** server → client: someone became (un)available; refetch the list. */
  presenceChanged: 'presence:changed',
  /** server → client: media room credentials for a call. */
  join: 'call:join',
  /** client → server: switch back to audio only, for both. */
  videoStop: 'call:video:stop',
  /** client → server: report (and block) the other person; ends the call. */
  report: 'call:report',
} as const;
