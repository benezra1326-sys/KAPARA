/**
 * ZIV's offer: free, Plus, Cercle. The limits mirror the `plans` table of
 * supabase/migrations/20261123130000_motek_premium.sql, which is what really
 * applies them for real accounts; this copy drives the paywall and the local
 * demo. Prices are shown in euros; payment is simulated until Apple in-app
 * purchases are set up (Apple Developer account).
 *
 * Rule from the benchmark: safety (block, report), values-based criteria and
 * messages with one's matches are never paid. One's own city is free;
 * looking at another city in "Pour toi" is Plus and Cercle (Avishay, 23/11).
 */
export type PlanId = 'free' | 'plus' | 'cercle';
export type Months = 1 | 3 | 6;
export type QuotaKind = 'like' | 'liveCall';

export interface PlanLimits {
  /** Reactions sent per day; null = unlimited. */
  likesPerDay: number | null;
  /** Profiles in the daily "Pour toi" selection. */
  picksPerDay: number;
  /** Live calls started per day (receiving a call is always free); null = unlimited. */
  liveCallsPerDay: number | null;
  /** See who noticed you. */
  seeLikes: boolean;
  /** Go back to a profile you passed. */
  rewind: boolean;
  /** Discreet mode: only people you noticed can see you. */
  discreet: boolean;
  /** Live: choose gender and city. Free Live is a random worldwide match. */
  liveFilters: boolean;
  /** "Pour toi" in another city than one's own (travel, a move to come). */
  otherCity: boolean;
}

export const LIMITS: Record<PlanId, PlanLimits> = {
  free: { likesPerDay: 20, picksPerDay: 8, liveCallsPerDay: null, seeLikes: false, rewind: false, discreet: false, liveFilters: false, otherCity: false },
  plus: { likesPerDay: 60, picksPerDay: 20, liveCallsPerDay: null, seeLikes: true, rewind: true, discreet: false, liveFilters: true, otherCity: true },
  cercle: { likesPerDay: null, picksPerDay: 40, liveCallsPerDay: null, seeLikes: true, rewind: true, discreet: true, liveFilters: true, otherCity: true },
};

/** Monthly price in euros for each commitment (total = monthly × months). */
export const PRICES: Record<Exclude<PlanId, 'free'>, Record<Months, number>> = {
  plus: { 1: 14.99, 3: 11.99, 6: 9.99 },
  cercle: { 1: 29.99, 3: 23.99, 6: 19.99 },
};

export const PLAN_ORDER: PlanId[] = ['free', 'plus', 'cercle'];
export const rank = (p: PlanId) => PLAN_ORDER.indexOf(p);

/** Total charged for a commitment, rounded to the cent. */
export const total = (plan: Exclude<PlanId, 'free'>, months: Months) => Math.round(PRICES[plan][months] * months * 100) / 100;

/** Saving against paying month by month, in whole percent. */
export const saving = (plan: Exclude<PlanId, 'free'>, months: Months) => Math.round((1 - PRICES[plan][months] / PRICES[plan][1]) * 100);

/** What is left today; null = unlimited. */
export function remaining(limits: PlanLimits, used: Record<QuotaKind, number>, kind: QuotaKind): number | null {
  const max = kind === 'like' ? limits.likesPerDay : limits.liveCallsPerDay;
  return max == null ? null : Math.max(0, max - (used[kind] ?? 0));
}

/** The cheapest plan that lifts a given limit or unlocks a feature. */
export function planFor(need: QuotaKind | 'seeLikes' | 'rewind' | 'discreet' | 'picks' | 'liveFilters' | 'otherCity', from: PlanId): PlanId {
  for (const p of PLAN_ORDER.slice(rank(from) + 1)) {
    const l = LIMITS[p], f = LIMITS[from];
    const better =
      need === 'like' ? l.likesPerDay == null || (f.likesPerDay != null && l.likesPerDay > f.likesPerDay)
      : need === 'liveCall' ? l.liveCallsPerDay == null || (f.liveCallsPerDay != null && l.liveCallsPerDay > f.liveCallsPerDay)
      : need === 'picks' ? l.picksPerDay > f.picksPerDay
      : l[need];
    if (better) return p;
  }
  return 'cercle';
}

/**
 * Live: choosing gender and city. Paid plans and the administrator, for
 * everyone alike (Avishay, 23/11). Same rule as can_filter_live() in the database.
 */
export const canFilterLive = (plan: PlanId, isAdmin = false) => isAdmin || LIMITS[plan].liveFilters;

/** The database refuses with "quota_exceeded" once a daily limit is reached. */
export const isQuotaError = (e: unknown) => e instanceof Error && /quota_exceeded/.test(e.message);

/** May look at another city in "Pour toi". The database's limits don't carry it yet: decided by the plan. */
export const canBrowseOtherCity = (plan: PlanId, isAdmin = false) => isAdmin || LIMITS[plan].otherCity;
