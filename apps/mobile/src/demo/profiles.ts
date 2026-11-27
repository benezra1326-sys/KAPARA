import type { ProfilePublic, Recommendation } from '@kapara/shared';
import { REGIONS, RULES } from '@kapara/config';
import { ageOf, DEMO_PEOPLE, DEMO_VIEWER_KEY, demoUserId, momentUrl, personByKey, portraitUrl, type DemoPerson, type Gender } from './people';
import { DEMO_PICKS_PLAN } from './scenarios';
import { seeksMatch } from '../me/seeks';

/**
 * Offline demo data for the app (EXPO_PUBLIC_DEMO, the default).
 * Fictional people, flagged isDemo, generated illustrated portraits.
 *
 * Sensitive answers: like the API, only answers shared with "members" are
 * exposed on a public profile. "matches" and "private" answers stay hidden.
 */
export function toPublicProfile(p: DemoPerson, viewerIsMatch = false): ProfilePublic {
  const jewishLife = Object.fromEntries(
    Object.entries(p.jewishLife).filter(([, f]) => f && !f.preferNotToSay && (f.visibility === 'members' || (viewerIsMatch && f.visibility === 'matches'))),
  ) as ProfilePublic['jewishLife'];
  return {
    id: demoUserId(p.key),
    firstName: p.firstName,
    age: ageOf(p.birthDate),
    city: REGIONS.find((r) => r.code === p.regionCode)?.city ?? '',
    regionCode: p.regionCode,
    headline: p.headline,
    languages: p.languages,
    photos: [
      { id: 'portrait', url: portraitUrl(p.key), isDemo: true },
      ...p.moments.map((m, i) => ({ id: `moment-${i}`, url: momentUrl(p.key, i), caption: m.caption, isDemo: true })),
    ],
    prompts: p.prompts.slice(0, 4),
    jewishLife,
    verified: p.verified,
    isDemo: true,
  };
}

/** Today's "Pour toi" selection for the demo viewer, each with its reasons. */
export const DEMO_PICKS: Recommendation[] = DEMO_PICKS_PLAN.map((pick, i) => ({
  profile: toPublicProfile(personByKey(pick.key)),
  score: Math.round((0.92 - i * 0.04) * 100) / 100,
  reasons: pick.reasons,
}));

/**
 * "Pour toi" in a given city (the member can change city freely, for free).
 * Today's plan first when it is in that city, then the other members there
 * who would also be interested in the viewer, up to RULES.dailyPicks.
 */
export function demoPicksIn(regionCode: string, viewer: { gender?: Gender; seeks?: Gender[] } = {}, viewerKey = DEMO_VIEWER_KEY): Recommendation[] {
  // "Je recherche", both ways (same rule as the database): see src/me/seeks.ts.
  const fits = (p: DemoPerson) => p.key !== viewerKey && p.regionCode === regionCode && seeksMatch(viewer, p);
  const planned = DEMO_PICKS_PLAN.filter((x) => fits(personByKey(x.key)));
  const others = DEMO_PEOPLE.filter((p) => fits(p) && !planned.some((x) => x.key === p.key));
  return [
    ...planned.map((x) => ({ key: x.key, reasons: [...x.reasons.slice(0, 2), { key: 'reason.in_city' }] })),
    ...others.map((p) => ({ key: p.key, reasons: [{ key: 'reason.in_city' }] })),
  ].slice(0, RULES.dailyPicks).map((pick, i) => ({
    profile: toPublicProfile(personByKey(pick.key)),
    score: Math.round((0.92 - i * 0.04) * 100) / 100,
    reasons: pick.reasons,
  }));
}

/** Every demo profile, by id (for profile screens, conversations, Live, Croisés). */
export const DEMO_PROFILES: Record<string, ProfilePublic> = Object.fromEntries(
  DEMO_PEOPLE.map((p) => [demoUserId(p.key), toPublicProfile(p)]),
);

/**
 * @deprecated Prompt titles are translated: use t(`prompts.${id}`).
 * Kept so existing screens keep working until they switch.
 */
export const PROMPT_LABELS: Record<string, string> = {
  ideal_shabbat_meal: 'Mon repas de Shabbat idéal', favorite_holiday: 'Ma fête préférée', favorite_tradition: 'La tradition qui me tient à cœur',
  teach_me: 'Apprends-moi…', makes_me_laugh: 'Ce qui me fait rire', project_excited_about: 'Le projet qui m’enthousiasme',
  perfect_sunday: 'Mon dimanche parfait', green_flag: 'Ce qui me plaît chez quelqu’un', family_recipe: 'La recette de famille',
  currently_learning: 'En ce moment, j’apprends', together_we_could: 'Ensemble, on pourrait', best_advice: 'Le meilleur conseil qu’on m’ait donné',
};
