import { z } from 'zod';
import {
  ChildrenWish, CommunityAttendance, HolidaysPractice, ImportanceOfJewishPartner, JewishLife,
  KashrutPractice, PracticeRelation, RelationshipIntent, ShabbatPractice, TraditionPlace,
} from './jewish-life';
import { Preferences, Prompt, PROMPT_KEYS } from './profile';

export const Gender = z.enum(['woman', 'man', 'nonbinary']);
export type Gender = z.infer<typeof Gender>;

export const JewishLifeField = z.enum(Object.keys(JewishLife.shape) as [keyof JewishLife, ...(keyof JewishLife)[]]);
export type JewishLifeField = z.infer<typeof JewishLifeField>;

/**
 * Version of the sensitive-data explanation the member read before consenting.
 * Bump it when the consent text changes: the app asks again.
 */
export const SENSITIVE_POLICY_VERSION = '2026-11-22';

/**
 * Fields that can be used as dealbreakers or soft preferences, with their
 * allowed values. Free-text fields (community name, cultural tags) are never
 * used for matching.
 */
export const MATCHABLE_FIELDS = {
  practice: PracticeRelation.options,
  partnerImportance: ImportanceOfJewishPartner.options,
  shabbat: ShabbatPractice.options,
  holidays: HolidaysPractice.options,
  kashrutHome: KashrutPractice.options,
  kashrutOutside: KashrutPractice.options,
  community: CommunityAttendance.options,
  traditionPlace: TraditionPlace.options,
  relationshipIntent: RelationshipIntent.options,
  children: ChildrenWish.options,
} as const satisfies Partial<Record<keyof JewishLife, readonly string[]>>;
export type MatchableField = keyof typeof MATCHABLE_FIELDS;
export const isMatchableField = (k: string): k is MatchableField => Object.hasOwn(MATCHABLE_FIELDS, k);

/** Basic profile, created at the end of onboarding and editable afterwards. */
export const ProfileUpdate = z.object({
  firstName: z.string().trim().min(1).max(40),
  /** ISO date YYYY-MM-DD. Members must be adults (checked server-side). */
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: Gender,
  headline: z.string().trim().max(140).optional(),
  languages: z.array(z.string().min(2).max(10)).max(8).default([]),
  prompts: z.array(Prompt.extend({ id: z.enum(PROMPT_KEYS) })).max(4).default([]),
  regionCode: z.string().max(40).optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdate>;

export const PhotosUpdate = z.object({
  photos: z.array(z.object({
    url: z.string().url().max(2048).refine((u) => u.startsWith('https://'), 'https_only'),
    caption: z.string().trim().max(120).optional(),
  })).min(1).max(6),
});
export type PhotosUpdate = z.infer<typeof PhotosUpdate>;

/** Approximate home area. Snapped to a ~1 km grid server-side, never returned. */
export const LocationUpdate = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LocationUpdate = z.infer<typeof LocationUpdate>;

/** Explicit consent for sensitive fields (GDPR art. 9), given on the explanation screen. */
export const ConsentGrant = z.object({
  fields: z.array(JewishLifeField).min(1),
  policyVersion: z.literal(SENSITIVE_POLICY_VERSION),
});
export type ConsentGrant = z.infer<typeof ConsentGrant>;

export const AccountSettings = z.object({
  paused: z.boolean().optional(),
  shabbatMode: z.boolean().optional(),
  locale: z.string().max(10).optional(),
});
export type AccountSettings = z.infer<typeof AccountSettings>;

/**
 * Preferences as accepted by the API: same shape as `Preferences`, plus
 * coherence checks (age range, known genders, only matchable fields and
 * known values in dealbreakers and soft preferences).
 */
export const PreferencesInput = Preferences.extend({ genders: z.array(Gender).min(1) }).superRefine((p, ctx) => {
  if (p.ageMin > p.ageMax) ctx.addIssue({ code: 'custom', path: ['ageMin'], message: 'age_range_inverted' });
  if (p.ageMin < 18) ctx.addIssue({ code: 'custom', path: ['ageMin'], message: 'adults_only' });
  const check = (group: 'dealbreakers' | 'soft', key: string, values: string[]) => {
    if (!isMatchableField(key)) return ctx.addIssue({ code: 'custom', path: [group, key], message: 'not_matchable' });
    const allowed = MATCHABLE_FIELDS[key] as readonly string[];
    for (const v of values) if (!allowed.includes(v)) ctx.addIssue({ code: 'custom', path: [group, key], message: `unknown_value:${v}` });
  };
  for (const [k, v] of Object.entries(p.dealbreakers)) check('dealbreakers', k, v);
  for (const [k, v] of Object.entries(p.soft)) check('soft', k, v.values);
});
export type PreferencesInput = z.infer<typeof PreferencesInput>;

export const FeedbackReason = z.enum(['too_far', 'values_differ', 'intent_differs', 'not_my_type', 'other']);
export const RecommendationFeedbackInput = z.object({
  subjectId: z.string().min(1),
  signal: z.enum(['more_like_this', 'not_for_me']),
  /** Optional, voluntary. Only used to tune this member's own suggestions. */
  reason: FeedbackReason.optional(),
});
export type RecommendationFeedbackInput = z.infer<typeof RecommendationFeedbackInput>;
