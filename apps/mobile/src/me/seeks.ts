import type { Gender } from '@kapara/shared';

/**
 * "Je recherche": who a member wants to meet. Same rule as the database
 * (public.seeks_match): both sides must want each other. A man seeking
 * women sees women who seek men; a man seeking men sees men who seek men.
 * Without an answer yet, a default from the member's own gender.
 */
export const ALL_GENDERS: Gender[] = ['woman', 'man', 'nonbinary'];

export const defaultSeeks = (gender?: Gender): Gender[] =>
  gender === 'man' ? ['woman'] : gender === 'woman' ? ['man'] : [...ALL_GENDERS];

export const effectiveSeeks = (gender?: Gender, seeks?: readonly Gender[] | null): Gender[] =>
  seeks?.length ? [...seeks] : defaultSeeks(gender);

type Side = { gender?: Gender | null; seeks?: readonly Gender[] | null };

/** Both ways: I seek their gender, they seek mine. Someone without a gender never shows. */
export function seeksMatch(me: Side, other: Side): boolean {
  if (!other.gender) return false;
  if (!effectiveSeeks(me.gender ?? undefined, me.seeks).includes(other.gender)) return false;
  if (!me.gender) return true;
  return effectiveSeeks(other.gender, other.seeks).includes(me.gender);
}
