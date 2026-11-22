import type { JewishLife } from '@kapara/shared';

type Field = { value: unknown; preferNotToSay?: boolean; note?: string };

/** Storing an actual answer (value or free note) to a sensitive question requires consent. */
export const storesSensitiveData = (f: Field | undefined) =>
  Boolean(f && ((f.value !== null && f.value !== undefined) || (f.note && f.note.trim())));

/**
 * Merges a partial update into the stored answers. Fields absent from the
 * patch are kept; a field set to `null` is erased. Returns the fields that
 * would store data without an active consent (the update must then be refused).
 */
export function applyJewishLifeUpdate(
  current: Partial<JewishLife>,
  patch: Partial<Record<keyof JewishLife, Field | null>>,
  consented: Set<string>,
): { next: Partial<JewishLife>; missingConsent: string[] } {
  const next: Record<string, unknown> = { ...current };
  const missingConsent: string[] = [];
  for (const [key, field] of Object.entries(patch)) {
    if (field === null) { delete next[key]; continue; }
    if (!field) continue;
    // "Prefer not to say" never keeps a value or a matching use.
    const stored = field.preferNotToSay ? { ...field, value: null, note: undefined, useForMatching: false } : field;
    if (storesSensitiveData(stored) && !consented.has(key)) missingConsent.push(key);
    next[key] = stored;
  }
  return { next: next as Partial<JewishLife>, missingConsent };
}

/** Erases one answer (used when consent is withdrawn). */
export function eraseField(current: Partial<JewishLife>, key: string): Partial<JewishLife> {
  const next: Record<string, unknown> = { ...current };
  delete next[key];
  return next as Partial<JewishLife>;
}
