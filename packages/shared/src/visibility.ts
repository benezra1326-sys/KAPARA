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

export type ViewerRelation = 'self' | 'match' | 'member';
const visRank: Record<Visibility, number> = { private: 0, matches: 1, members: 2 };
const relNeed: Record<ViewerRelation, number> = { self: 0, match: 1, member: 2 };

/**
 * Same rule as the API's filter, shared so the app can show "what others see".
 * A sensitive field is visible to a viewer only if answered, consented and wide enough.
 */
export function visibleSensitive<T extends Record<string, { value: unknown; preferNotToSay?: boolean; visibility: Visibility } | undefined>>(
  data: T, relation: ViewerRelation, consentedFields: ReadonlySet<string>,
): Partial<T> {
  if (relation === 'self') return data;
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(data)) {
    if (!field || field.value === null || field.value === undefined || field.preferNotToSay) continue;
    if (!consentedFields.has(key)) continue;
    if (visRank[field.visibility] >= relNeed[relation]) out[key] = field;
  }
  return out as Partial<T>;
}
