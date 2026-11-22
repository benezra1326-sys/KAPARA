import type { JewishLife } from '@kapara/shared';

export interface Candidate {
  id: string;
  age: number;
  distanceKm: number;
  jewishLife: Partial<JewishLife>;
}
export interface Seeker {
  ageMin: number; ageMax: number; maxDistanceKm: number;
  jewishLife: Partial<JewishLife>;
  /** criterion -> accepted values (hard, mutual) */
  dealbreakers: Record<string, string[]>;
  /** criterion -> preferred values + weight 0..3 */
  soft: Record<string, { values: string[]; weight: number }>;
  /** ids the member flagged "not for me" */
  dismissed: Set<string>;
}

/** Only answers the candidate shared AND allowed for matching are ever read. */
const usable = (jl: Partial<JewishLife>, key: string): string | undefined => {
  const f = (jl as Record<string, any>)[key];
  if (!f || f.preferNotToSay || !f.useForMatching || f.value == null) return undefined;
  return Array.isArray(f.value) ? undefined : String(f.value);
};

/** Hard filters. An unanswered field never fails a dealbreaker (no inference, no penalty). */
export function passesDealbreakers(s: Seeker, c: Candidate): boolean {
  if (c.age < s.ageMin || c.age > s.ageMax || c.distanceKm > s.maxDistanceKm) return false;
  if (s.dismissed.has(c.id)) return false;
  for (const [key, accepted] of Object.entries(s.dealbreakers)) {
    const v = usable(c.jewishLife, key);
    if (v !== undefined && accepted.length && !accepted.includes(v)) return false;
  }
  return true;
}

export interface Scored { id: string; score: number; reasons: { key: string; params?: Record<string, string> }[] }

/** Soft score in [0,1] with up to 3 human-readable reasons (i18n keys). */
export function score(s: Seeker, c: Candidate): Scored {
  let total = 0, max = 0;
  const reasons: Scored['reasons'] = [];
  for (const [key, pref] of Object.entries(s.soft)) {
    if (pref.weight <= 0) continue;
    max += pref.weight;
    const v = usable(c.jewishLife, key);
    if (v !== undefined && pref.values.includes(v)) {
      total += pref.weight;
      reasons.push({ key: `reason.shared.${key}`, params: { value: v } });
    }
  }
  const proximity = Math.max(0, 1 - c.distanceKm / Math.max(1, s.maxDistanceKm));
  if (proximity > 0.7) reasons.push({ key: 'reason.nearby' });
  const base = max ? total / max : 0.5;
  return { id: c.id, score: Math.round((0.8 * base + 0.2 * proximity) * 1000) / 1000, reasons: reasons.slice(0, 3) };
}

export function dailyPicks(s: Seeker, cs: Candidate[], n: number): Scored[] {
  return cs.filter((c) => passesDealbreakers(s, c)).map((c) => score(s, c))
    .sort((a, b) => b.score - a.score).slice(0, n);
}
