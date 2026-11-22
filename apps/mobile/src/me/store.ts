import { useSyncExternalStore } from 'react';
import { LAUNCH_REGION } from '@kapara/config';
import type { Gender, JewishLife, Photo, Prompt, Visibility } from '@kapara/shared';
import type { JLKey } from './fields';

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
  photos: Photo[];
  jewishLife: Partial<JewishLife>;
  /** field -> ISO date of explicit consent. Removing an entry = consent withdrawn. */
  consents: Partial<Record<JLKey, string>>;
}

export const emptyField = (): SensitiveField => ({ value: null, preferNotToSay: false, visibility: 'private', useForMatching: false });

/** A field leaves "private + not used" only after explicit consent. */
export const needsConsent = (f: Pick<SensitiveField, 'visibility' | 'useForMatching'>) => f.visibility !== 'private' || f.useForMatching;

const demoPhotos: Photo[] = [0, 1].map((n) => ({ id: `me-${n}`, url: `https://picsum.photos/seed/kapara-me-${n}/900/1200`, isDemo: true }));

const initial: MyProfile = {
  onboarded: false, firstName: '', headline: '', languages: ['fr'], regionCode: LAUNCH_REGION.code,
  prompts: [], photos: demoPhotos, jewishLife: {}, consents: {},
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

  /** Writes one answer. Consent must already be recorded if the field is shared or used. */
  setField(key: JLKey, field: SensitiveField, consentGiven = false) {
    meStore.set((s) => {
      const consents = { ...s.consents };
      if (consentGiven) consents[key] = new Date().toISOString();
      const safe = needsConsent(field) && !consents[key] ? { ...field, visibility: 'private' as Visibility, useForMatching: false } : field;
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
  /** Keeps answers but makes every one private and unused, and withdraws all consents. */
  makeAllPrivate() {
    meStore.set((s) => ({
      consents: {},
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
