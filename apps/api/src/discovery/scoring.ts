import type { JewishLife } from '@kapara/shared';
import { isMatchableField } from '@kapara/shared';

/** Answers a member shared for matching: consented, useForMatching, not "prefer not to say". */
export type Answers = Partial<Record<string, string>>;

export interface Criteria {
  ageMin: number; ageMax: number; maxDistanceKm: number;
  /** criterion -> accepted values (hard, mutual) */
  dealbreakers: Record<string, string[]>;
  /** criterion -> preferred values + weight 0..3 */
  soft: Record<string, { values: string[]; weight: number }>;
}

export interface Person {
  id: string;
  age: number;
  answers: Answers;
  languages: string[];
  /** Null when the member never saved preferences: nothing to check on their side. */
  criteria: Criteria | null;
}
export interface Candidate extends Person { distanceKm: number }

export interface Seeker extends Person {
  criteria: Criteria;
  /** ids the member flagged "not for me" */
  dismissed: Set<string>;
  /** Answers of profiles the member liked or asked more of (behaviour, voluntarily shared answers only). */
  liked: Answers[];
  /** Count of "not for me — too far" in the recent past. */
  tooFarSignals: number;
}

export interface Reason { key: string; params?: Record<string, string> }
export interface Scored { id: string; score: number; reasons: Reason[] }

/**
 * The only door through which Jewish-life answers enter matching. Nothing is
 * ever inferred: an absent, private-to-matching or unconsented answer is
 * simply unknown.
 */
export function matchableAnswers(jl: Partial<JewishLife> | null | undefined, consented: Set<string>): Answers {
  const out: Answers = {};
  for (const [key, f] of Object.entries(jl ?? {})) {
    if (!isMatchableField(key) || !consented.has(key)) continue;
    if (!f || f.preferNotToSay || !f.useForMatching || f.value == null || Array.isArray(f.value)) continue;
    out[key] = String(f.value);
  }
  return out;
}

/** An unanswered (or unshared) field never fails a dealbreaker: no inference, no penalty. */
export function meetsDealbreakers(dealbreakers: Record<string, string[]>, answers: Answers): boolean {
  for (const [key, accepted] of Object.entries(dealbreakers)) {
    const v = answers[key];
    if (v !== undefined && accepted.length && !accepted.includes(v)) return false;
  }
  return true;
}

/** Hard filters, checked both ways: each member must fit the other's criteria. */
export function mutuallyCompatible(s: Seeker, c: Candidate): boolean {
  if (s.dismissed.has(c.id) || s.id === c.id) return false;
  const a = s.criteria;
  if (c.age < a.ageMin || c.age > a.ageMax || c.distanceKm > a.maxDistanceKm) return false;
  if (!meetsDealbreakers(a.dealbreakers, c.answers)) return false;
  const b = c.criteria;
  if (b) {
    if (s.age < b.ageMin || s.age > b.ageMax || c.distanceKm > b.maxDistanceKm) return false;
    if (!meetsDealbreakers(b.dealbreakers, s.answers)) return false;
  }
  return true;
}

/** Share of soft-preference weight satisfied (unknown answers count half), with the matching criteria (heaviest first). */
function softFit(soft: Criteria['soft'] | undefined, answers: Answers): { fit: number | null; hits: { key: string; value: string; weight: number }[] } {
  let total = 0, max = 0;
  const hits: { key: string; value: string; weight: number }[] = [];
  for (const [key, pref] of Object.entries(soft ?? {})) {
    if (pref.weight <= 0 || !pref.values.length) continue;
    max += pref.weight;
    const v = answers[key];
    if (v === undefined) total += pref.weight / 2; // unknown is neutral, never a penalty
    else if (pref.values.includes(v)) { total += pref.weight; hits.push({ key, value: v, weight: pref.weight }); }
  }
  return { fit: max ? total / max : null, hits: hits.sort((x, y) => y.weight - x.weight) };
}

/**
 * Similarity with profiles the member appreciated, field by field: share of
 * appreciated profiles that gave the same answer. Needs at least 3 signals.
 */
export function affinity(liked: Answers[], answers: Answers): { value: number | null; strongest?: string } {
  if (liked.length < 3) return { value: null };
  let sum = 0, n = 0, best = 0, strongest: string | undefined;
  for (const [key, v] of Object.entries(answers)) {
    const withKey = liked.filter((l) => l[key] !== undefined);
    if (withKey.length < 2) continue;
    const share = withKey.filter((l) => l[key] === v).length / withKey.length;
    sum += share; n++;
    if (share > best) { best = share; strongest = key; }
  }
  if (!n) return { value: null };
  return { value: sum / n, strongest: best >= 0.6 ? strongest : undefined };
}

/** Small stable tie-breaker so equal scores don't always come in the same order. */
export function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 100_000; // 0 … 0.01
}

/**
 * Score in [0,1] with up to 3 reasons (i18n keys). Weights:
 * my soft preferences 50 %, theirs about me 15 %, proximity 15 % (30 % if
 * I said "too far" twice recently), similarity with profiles I appreciated 20 %.
 * A missing signal counts as neutral (0.5), never as a penalty.
 */
export function score(s: Seeker, c: Candidate, seed = ''): Scored {
  const mine = softFit(s.criteria.soft, c.answers);
  const theirs = softFit(c.criteria?.soft, s.answers);
  const proximity = Math.max(0, 1 - c.distanceKm / Math.max(1, s.criteria.maxDistanceKm));
  const aff = affinity(s.liked, c.answers);
  const wProx = s.tooFarSignals >= 2 ? 0.3 : 0.15;
  const parts: [number, number][] = [
    [0.5, mine.fit ?? 0.5], [0.15, theirs.fit ?? 0.5], [wProx, proximity], [0.2, aff.value ?? 0.5],
  ];
  const wSum = parts.reduce((a, [w]) => a + w, 0);
  let total = parts.reduce((a, [w, v]) => a + w * v, 0) / wSum;

  const reasons: Reason[] = mine.hits.map((h) => ({ key: `reason.shared.${h.key}`, params: { value: h.value } }));
  const sameIntent = s.answers.relationshipIntent && s.answers.relationshipIntent === c.answers.relationshipIntent;
  if (sameIntent && !mine.hits.some((h) => h.key === 'relationshipIntent')) {
    total += 0.03;
    reasons.push({ key: 'reason.same_intent', params: { value: c.answers.relationshipIntent! } });
  }
  if (aff.strongest) reasons.push({ key: 'reason.like_profiles_you_appreciated', params: { field: aff.strongest } });
  // Shown as "Nearby", never as a number of km: a precise distance would reveal too much.
  if (proximity >= 0.7) reasons.push({ key: 'reason.nearby' });
  const common = c.languages.filter((l) => s.languages.includes(l) && l !== 'fr' && l !== 'en');
  if (common.length) reasons.push({ key: 'reason.shared_language', params: { language: common[0]! } });
  if (!reasons.length) reasons.push({ key: 'reason.fits_your_criteria' });

  total = Math.min(1, total + jitter(seed + c.id));
  return { id: c.id, score: Math.round(total * 1000) / 1000, reasons: reasons.slice(0, 3) };
}

export function rank(s: Seeker, cs: Candidate[], n: number, seed = ''): Scored[] {
  return cs.filter((c) => mutuallyCompatible(s, c)).map((c) => score(s, c, seed))
    .sort((a, b) => b.score - a.score).slice(0, n);
}
