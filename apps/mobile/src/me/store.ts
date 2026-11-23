import { useSyncExternalStore } from 'react';
import { LAUNCH_REGION } from '@kapara/config';
import type { Gender, JewishLife, Prompt, ProfileUpdate, Visibility } from '@kapara/shared';
import { DEMO_MODE } from '../api/client';
import { CLOUD } from '../cloud/client';
import { DEMO_VIEWER_KEY, momentUrl, portraitUrl } from '../demo/people';
import type { JLKey } from './fields';
import type { MyPhoto } from './photos';

export type SensitiveField = NonNullable<JewishLife[JLKey]>;

export interface MyProfile {
  onboarded: boolean;
  firstName: string;
  birthDate?: string; // YYYY-MM-DD
  gender?: Gender;
  headline: string;
  languages: string[];
  regionCode: string;
  prompts: Prompt[];
  /** Ordered, first = main photo. See src/me/photos.ts for upload states. */
  photos: MyPhoto[];
  jewishLife: Partial<JewishLife>;
  /** field -> ISO date of explicit consent. Removing an entry = consent withdrawn. */
  consents: Partial<Record<JLKey, string>>;
}

export const emptyField = (): SensitiveField => ({ value: null, preferNotToSay: false, visibility: 'private', useForMatching: false });

/**
 * An actual answer (value or note) is stored only with explicit consent for
 * that field (GDPR art. 9, enforced by the API). "Prefer not to say" stores nothing sensitive.
 */
export const storesData = (f: Pick<SensitiveField, 'value' | 'preferNotToSay' | 'note'>) =>
  !f.preferNotToSay && ((f.value !== null && f.value !== undefined && !(Array.isArray(f.value) && !f.value.length)) || !!f.note?.trim());

/** Demo: the viewer's generated illustrations (src/demo/art), never a real person's photo. */
const demoPhotos: MyPhoto[] = [portraitUrl(DEMO_VIEWER_KEY), momentUrl(DEMO_VIEWER_KEY, 0)].map((url, n) => ({ id: `me-${n}`, url, isDemo: true }));

const initial: MyProfile = {
  onboarded: false, firstName: '', headline: '', languages: ['fr'], regionCode: LAUNCH_REGION.code,
  prompts: [], photos: DEMO_MODE && !CLOUD ? demoPhotos : [], jewishLife: {}, consents: {},
};

/**
 * The member's own profile. In demo mode it lives in memory for the session
 * (nothing leaves the phone). With an API, `src/me/api.ts` hydrates and saves it.
 */
let state: MyProfile = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const meStore = {
  get: () => state,
  set(patch: Partial<MyProfile> | ((s: MyProfile) => Partial<MyProfile>)) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    emit();
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },

  /** Writes one answer. Without consent for the field, only "prefer not to say" can be kept. */
  setField(key: JLKey, field: SensitiveField, consentGiven = false) {
    meStore.set((s) => {
      const consents = { ...s.consents };
      if (consentGiven) consents[key] = new Date().toISOString();
      const clean: SensitiveField = field.preferNotToSay ? { ...field, value: null, note: undefined, useForMatching: false } : field;
      const safe = storesData(clean) && !consents[key]
        ? { ...emptyField(), preferNotToSay: clean.preferNotToSay } : clean;
      return { jewishLife: { ...s.jewishLife, [key]: safe }, consents };
    });
  },
  /** Removes the answer, its visibility and its consent. Immediate effect on filters. */
  withdrawField(key: JLKey) {
    meStore.set((s) => {
      const { [key]: _gone, ...rest } = s.jewishLife;
      const { [key]: _c, ...consents } = s.consents;
      return { jewishLife: rest, consents };
    });
  },
  /** Keeps answers (and their storage consent) but makes every one private and unused. */
  makeAllPrivate() {
    meStore.set((s) => ({
      jewishLife: Object.fromEntries(Object.entries(s.jewishLife).map(([k, f]) => [k, f && { ...f, visibility: 'private', useForMatching: false }])),
    }));
  },
  reset() { state = initial; emit(); },
};

export function useMe<T = MyProfile>(select: (s: MyProfile) => T = (s) => s as unknown as T): T {
  return useSyncExternalStore(meStore.subscribe, () => select(state), () => select(state));
}

export function ageFrom(birthDate?: string, now = new Date()): number | null {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Full basics payload for PUT /profiles/me, or null while something required is missing. */
export function basicsPayload(s: MyProfile): ProfileUpdate | null {
  if (!s.firstName || !s.birthDate || !s.gender) return null;
  return { firstName: s.firstName, birthDate: s.birthDate, gender: s.gender, headline: s.headline || undefined, languages: s.languages, prompts: s.prompts as ProfileUpdate['prompts'], regionCode: s.regionCode };
}
