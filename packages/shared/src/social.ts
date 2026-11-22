import { z } from 'zod';

/**
 * Contracts for Croisés, introductions, conversations, safety and Shabbat
 * mode. Shared by the app and the API.
 */

// ── Croisés ────────────────────────────────────────────────────────────────

/** A ping is coarse already on the device (≈100 m), then snapped again on the server. */
export const CrossedPing = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type CrossedPing = z.infer<typeof CrossedPing>;

/** Device-side rounding (3 decimals ≈ 110 m) before anything leaves the phone. */
export const coarsen = (p: CrossedPing): CrossedPing => ({
  lat: Math.round(p.lat * 1000) / 1000,
  lng: Math.round(p.lng * 1000) / 1000,
});

/** Never a count: "once" or "several times". */
export const crossedTimes = (n: number): 'once' | 'several' => (n > 1 ? 'several' : 'once');

/** "Croisés" shows who, never where or when. `times` is bucketed on purpose. */
export const CrossedItem = z.object({
  userId: z.string(),
  firstName: z.string(),
  age: z.number().int(),
  photoUrl: z.string().nullable(),
  isDemo: z.boolean(),
  verified: z.boolean(),
  times: z.enum(['once', 'several']),
});
export type CrossedItem = z.infer<typeof CrossedItem>;

export const CrossedSettings = z.object({ enabled: z.boolean() });

/** Places where Croisés never records anything (home, work…). */
export const SensitiveZoneKind = z.enum(['home', 'work', 'other']);
export const SensitiveZoneCreate = CrossedPing.extend({ kind: SensitiveZoneKind });
/** Zones are returned without coordinates. */
export const SensitiveZone = z.object({ id: z.string(), kind: SensitiveZoneKind, createdAt: z.string() });
export type SensitiveZone = z.infer<typeof SensitiveZone>;

// ── Introductions ──────────────────────────────────────────────────────────

export const IntroductionResponse = z.object({ accept: z.boolean() });
export type IntroductionResponse = z.infer<typeof IntroductionResponse>;

/** What a person being introduced sees. Never the other side's answer. */
export const IntroductionReceived = z.object({
  id: z.string(),
  introducer: z.object({ id: z.string(), firstName: z.string() }),
  other: z.object({ id: z.string(), firstName: z.string(), age: z.number().int(), photoUrl: z.string().nullable(), isDemo: z.boolean() }),
  note: z.string(),
  myAnswer: z.enum(['pending', 'accepted']),
  createdAt: z.string(),
});
export type IntroductionReceived = z.infer<typeof IntroductionReceived>;

/** What the introducer sees: an outcome, never who declined. */
export const IntroductionSent = z.object({
  id: z.string(),
  personA: z.object({ id: z.string(), firstName: z.string() }),
  personB: z.object({ id: z.string(), firstName: z.string() }),
  outcome: z.enum(['waiting', 'connected', 'closed']),
  createdAt: z.string(),
});
export type IntroductionSent = z.infer<typeof IntroductionSent>;

// ── Conversations ──────────────────────────────────────────────────────────

export const SendMessage = z.object({
  body: z.string().trim().min(1).max(2000),
  /** Set after the member saw the kindness nudge and still wants to send. */
  confirmed: z.boolean().optional(),
});
export type SendMessage = z.infer<typeof SendMessage>;

export const ChatMessage = z.object({
  id: z.string(),
  senderId: z.string(),
  /** Computed for the viewer, so the app never needs its own id to render. */
  mine: z.boolean(),
  body: z.string(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

/** No read receipts, no "seen at", no typing indicator: by design. */
export const ConversationSummary = z.object({
  id: z.string(),
  other: z.object({ id: z.string(), firstName: z.string(), photoUrl: z.string().nullable(), isDemo: z.boolean() }),
  origin: z.enum(['like', 'introduction', 'live', 'other']),
  lastMessage: ChatMessage.nullable(),
  createdAt: z.string(),
});
export type ConversationSummary = z.infer<typeof ConversationSummary>;

// ── Safety ─────────────────────────────────────────────────────────────────

export const ReportReason = z.enum([
  'fake_profile', 'harassment', 'inappropriate_content', 'hateful', 'scam', 'underage', 'safety_concern', 'other',
]);
export type ReportReason = z.infer<typeof ReportReason>;

export const ReportCreate = z.object({
  userId: z.string(),
  reason: ReportReason,
  details: z.string().max(1000).optional(),
  /** Where it happened, to help moderation. */
  context: z.enum(['profile', 'conversation', 'live', 'crossed', 'introduction']).default('profile'),
  /** A report always blocks too, unless the member explicitly opts out. */
  alsoBlock: z.boolean().default(true),
});
export type ReportCreate = z.infer<typeof ReportCreate>;

// ── Shabbat mode ───────────────────────────────────────────────────────────

/**
 * Optional, private. While resting: no Live presence, no Croisés recording,
 * notifications held, introduction deadlines paused. Never shown to others.
 */
export const ShabbatSettings = z.object({
  enabled: z.boolean(),
  includeHolidays: z.boolean().default(true),
  /** Minutes before sunset. 18 is common in Paris; 40 in Jerusalem. */
  candleLightingMins: z.number().int().min(0).max(60).default(18),
  /** Minutes after sunset; null = when three stars are visible (sun 8.5° below horizon). */
  havdalahMins: z.number().int().min(20).max(90).nullable().default(null),
});
export type ShabbatSettings = z.infer<typeof ShabbatSettings>;

export const ShabbatWindow = z.object({
  start: z.string(), // ISO
  end: z.string(),
  kind: z.enum(['shabbat', 'holiday']),
  title: z.string(),
});
export type ShabbatWindow = z.infer<typeof ShabbatWindow>;

export const ShabbatStatus = ShabbatSettings.extend({
  resting: z.boolean(),
  current: ShabbatWindow.nullable(),
  next: ShabbatWindow.nullable(),
  timezone: z.string(),
  city: z.string(),
});
export type ShabbatStatus = z.infer<typeof ShabbatStatus>;
