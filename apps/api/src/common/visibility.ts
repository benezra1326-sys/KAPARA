import type { JewishLife, Visibility } from '@kapara/shared';

export type ViewerRelation = 'self' | 'match' | 'member';
const rank: Record<Visibility, number> = { private: 0, matches: 1, members: 2 };
const need: Record<ViewerRelation, number> = { self: 0, match: 1, member: 2 };

/**
 * Returns only the sensitive fields the viewer may see. A field is shown when
 * the owner answered it, consented, and its visibility is wide enough.
 * Fields without active consent are dropped even for "members" visibility.
 */
export function filterJewishLife(
  data: Partial<JewishLife>,
  relation: ViewerRelation,
  consentedFields: Set<string>,
): Partial<JewishLife> {
  if (relation === 'self') return data;
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(data)) {
    if (!field || field.value === null || field.preferNotToSay) continue;
    if (!consentedFields.has(key)) continue;
    if (rank[field.visibility] >= need[relation]) {
      out[key] = { ...field, useForMatching: undefined };
    }
  }
  return out as Partial<JewishLife>;
}
