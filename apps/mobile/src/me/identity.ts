import { LAUNCH_REGION, REGIONS } from '@kapara/config';
import { visibleSensitive, type JewishLife, type ProfilePublic, type ViewerRelation } from '@kapara/shared';
import { ageFrom, type MyProfile } from './store';

/**
 * The member's identity has ONE source: the profile store (src/me/store),
 * filled by onboarding and the editor (and, connected, by the API).
 *
 * - Private account data, never shown to others: exact birth date, gender,
 *   e-mail / sign-in, consents.
 * - Public profile, derived here: first name, age (computed from the birth
 *   date, never typed), city (from the region), headline, languages, photos,
 *   prompts, and only the Jewish-life answers whose visibility allows it.
 *
 * "Moi", the editor, the preview and every card of the member read from
 * here, so they can never disagree again.
 */
export function cityOf(regionCode: string) {
  return (REGIONS.find((r) => r.code === regionCode) ?? LAUNCH_REGION).city;
}

export function myPublicProfile(me: MyProfile, as: Exclude<ViewerRelation, 'self'> = 'member'): ProfilePublic {
  const consented = new Set(Object.keys(me.consents));
  return {
    id: 'me', firstName: me.firstName || '—', age: ageFrom(me.birthDate) ?? 0,
    city: cityOf(me.regionCode), regionCode: me.regionCode,
    headline: me.headline || undefined, languages: me.languages, photos: me.photos, prompts: me.prompts,
    jewishLife: visibleSensitive(me.jewishLife as Record<string, JewishLife[keyof JewishLife]>, as, consented) as Partial<JewishLife>,
    verified: false, isDemo: false,
  };
}

/** "Avi, 41" — or just the first name while the birth date is missing. */
export function nameAndAge(me: Pick<MyProfile, 'firstName' | 'birthDate'>) {
  const age = ageFrom(me.birthDate);
  return me.firstName ? `${me.firstName}${age !== null ? `, ${age}` : ''}` : '';
}
