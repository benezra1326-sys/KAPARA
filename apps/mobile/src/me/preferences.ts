import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MATCHABLE_FIELDS, PreferencesInput, type Gender, type MatchableField } from '@kapara/shared';
import { DEMO_PEOPLE, DEMO_VIEWER_KEY } from '../demo/people';
import { api, DEMO_MODE } from '../api/client';
import { loadPreferences, savePreferences } from '../cloud/account';
import { CLOUD } from '../cloud/client';
import { meStore } from './store';
import { effectiveSeeks } from './seeks';

/** What the member is looking for. Same shape as PUT /v1/preferences. */
export type Prefs = PreferencesInput;
export type CriterionMode = 'none' | 'soft' | 'dealbreaker';
export interface Criterion { mode: CriterionMode; values: string[]; weight: 1 | 2 | 3 }

export const AGE_MIN = 18;
export const AGE_MAX = 99;
export const DISTANCE_STEPS = [5, 10, 25, 50, 100, 250, 500] as const;
export const GENDERS: Gender[] = ['woman', 'man', 'nonbinary'];
export const CRITERIA = Object.keys(MATCHABLE_FIELDS) as MatchableField[];

/** Demo: starts from the demo viewer's fictional preferences, then lives in memory. */
const viewer = DEMO_PEOPLE.find((p) => p.key === DEMO_VIEWER_KEY);
let demoPrefs: Prefs = {
  ageMin: viewer?.preferences.ageMin ?? 25, ageMax: viewer?.preferences.ageMax ?? 40,
  maxDistanceKm: viewer?.preferences.maxDistanceKm ?? 25, genders: viewer?.seeks ?? ['woman'],
  dealbreakers: {}, soft: { relationshipIntent: { values: ['marriage', 'long_term'], weight: 2 } },
};

/** How one criterion is used: not at all, as a weighted preference, or as a mutual dealbreaker. */
export function criterionOf(p: Prefs, key: MatchableField): Criterion {
  const db = p.dealbreakers[key];
  if (db?.length) return { mode: 'dealbreaker', values: db, weight: 3 };
  const s = p.soft[key];
  if (s?.values.length && s.weight > 0) return { mode: 'soft', values: s.values, weight: Math.min(3, s.weight) as 1 | 2 | 3 };
  return { mode: 'none', values: [], weight: 2 };
}

/** A criterion lives in exactly one group; no value selected means "doesn't matter". */
export function withCriterion(p: Prefs, key: MatchableField, c: Criterion): Prefs {
  const { [key]: _d, ...dealbreakers } = p.dealbreakers;
  const { [key]: _s, ...soft } = p.soft;
  const allowed = MATCHABLE_FIELDS[key] as readonly string[];
  const values = allowed.filter((v) => c.values.includes(v));
  if (c.mode === 'dealbreaker' && values.length) return { ...p, dealbreakers: { ...dealbreakers, [key]: values }, soft };
  if (c.mode === 'soft' && values.length) return { ...p, dealbreakers, soft: { ...soft, [key]: { values, weight: c.weight } } };
  return { ...p, dealbreakers, soft };
}

/** Keeps only what the API accepts, whatever the server or an older app version sent. */
export function normalize(raw: Partial<Prefs> & Record<string, unknown>): Prefs {
  const clamp = (n: unknown, lo: number, hi: number, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d);
  const ageMin = clamp(raw.ageMin, AGE_MIN, AGE_MAX, 25);
  let p: Prefs = {
    ageMin, ageMax: Math.max(ageMin, clamp(raw.ageMax, AGE_MIN, AGE_MAX, 40)),
    maxDistanceKm: clamp(raw.maxDistanceKm, 1, 500, 25),
    genders: (raw.genders ?? []).filter((g): g is Gender => GENDERS.includes(g as Gender)),
    dealbreakers: {}, soft: {},
  };
  const src = { dealbreakers: raw.dealbreakers ?? {}, soft: raw.soft ?? {} } as Pick<Prefs, 'dealbreakers' | 'soft'>;
  for (const key of CRITERIA) p = withCriterion(p, key, criterionOf(src as Prefs, key));
  return p;
}

export const samePrefs = (a: Prefs, b: Prefs) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: async (): Promise<Prefs & { isDefault?: boolean }> => {
      if (CLOUD) {
        const saved = await loadPreferences();
        // "Je recherche" (profile) and "Mes préférences" are the same answer.
        const me = meStore.get();
        if (saved) return normalize({ ...(saved as Partial<Prefs>), ...(me.seeks?.length ? { genders: me.seeks } : {}) });
        return { ...demoPrefs, soft: {}, genders: effectiveSeeks(me.gender, me.seeks), isDefault: true };
      }
      if (DEMO_MODE) return demoPrefs;
      const r = await api<Prefs & { isDefault: boolean }>('/preferences');
      return { ...normalize(r), isDefault: r.isDefault };
    },
  });
}

/** Saves, then refreshes "Pour toi": the server recomputes today's picks with the new criteria. */
export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Prefs): Promise<Prefs> => {
      const body = PreferencesInput.parse(normalize(p));
      if (CLOUD) { await savePreferences(body); return body; }
      if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 300)); demoPrefs = body; return body; }
      return normalize(await api<Prefs>('/preferences', { method: 'PUT', body: JSON.stringify(body) }));
    },
    onSuccess: (saved) => {
      qc.setQueryData(['preferences'], { ...saved, isDefault: false });
      void qc.invalidateQueries({ queryKey: ['for-you'] });
    },
  });
}
