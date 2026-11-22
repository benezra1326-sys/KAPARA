import { z } from 'zod';
import { JewishLife } from './jewish-life';

export const Prompt = z.object({
  id: z.string(), // prompt key, e.g. "ideal_shabbat_meal"
  answer: z.string().min(1).max(300),
});

export const PROMPT_KEYS = [
  'favorite_tradition', 'ideal_shabbat_meal', 'favorite_holiday', 'makes_me_laugh',
  'project_excited_about', 'perfect_sunday', 'green_flag', 'teach_me',
] as const;

export const Photo = z.object({
  id: z.string(),
  url: z.string().url(),
  caption: z.string().max(120).optional(),
  isDemo: z.boolean().default(false),
});

export const ProfilePublic = z.object({
  id: z.string(),
  firstName: z.string().min(1).max(40),
  age: z.number().int().min(18),
  city: z.string(),
  regionCode: z.string(),
  headline: z.string().max(140).optional(),
  languages: z.array(z.string()).max(8),
  photos: z.array(Photo).min(1).max(6),
  prompts: z.array(Prompt).max(4),
  /** Already filtered server-side according to the viewer's rights. */
  jewishLife: JewishLife.partial(),
  verified: z.boolean(),
  isDemo: z.boolean(),
});
export type ProfilePublic = z.infer<typeof ProfilePublic>;

/** Hard filters (dealbreakers) vs soft preferences (weights 0..3). */
export const Preferences = z.object({
  ageMin: z.number().int().min(18),
  ageMax: z.number().int().max(99),
  maxDistanceKm: z.number().int().min(1).max(500),
  genders: z.array(z.string()).min(1),
  dealbreakers: z.record(z.string(), z.array(z.string())).default({}),
  soft: z.record(z.string(), z.object({ values: z.array(z.string()), weight: z.number().int().min(0).max(3) })).default({}),
});
export type Preferences = z.infer<typeof Preferences>;

/** "Pour toi" always explains itself. Reasons only use voluntarily shared answers. */
export const Recommendation = z.object({
  profile: ProfilePublic,
  score: z.number().min(0).max(1),
  reasons: z.array(z.object({ key: z.string(), params: z.record(z.string(), z.string()).optional() })).max(3),
});
export type Recommendation = z.infer<typeof Recommendation>;

/** A like must point at something specific: a photo or a prompt, optionally with a comment. */
export const Like = z.object({
  toProfileId: z.string(),
  target: z.object({ kind: z.enum(['photo', 'prompt']), id: z.string() }),
  comment: z.string().max(200).optional(),
});
export type Like = z.infer<typeof Like>;

export const IntroductionRequest = z.object({
  personAId: z.string(),
  personBId: z.string(),
  note: z.string().min(10).max(400),
});
export type IntroductionRequest = z.infer<typeof IntroductionRequest>;
