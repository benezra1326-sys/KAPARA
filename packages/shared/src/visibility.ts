import { z } from 'zod';

/**
 * Who can see a profile field. Sensitive fields default to `private`
 * and can only be widened after explicit consent (see SensitiveConsent).
 */
export const Visibility = z.enum([
  'private', // only me; never used for matching unless `useForMatching` is true
  'matches', // people I matched / am talking with
  'members', // every verified member who can see my profile
]);
export type Visibility = z.infer<typeof Visibility>;

/** Every sensitive answer is wrapped so value, visibility and matching use are independent. */
export const sensitive = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value: value.nullable(), // null = not answered
    preferNotToSay: z.boolean().default(false),
    note: z.string().max(280).optional(), // free nuance in the member's own words
    visibility: Visibility.default('private'),
    useForMatching: z.boolean().default(false),
  });
