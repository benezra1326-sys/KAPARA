import { useMutation, useQuery } from '@tanstack/react-query';
import type { JewishLife, ProfileUpdate } from '@kapara/shared';
import { api, ApiError, DEMO_MODE } from '../api/client';
import { meStore, type MyProfile } from './store';

/**
 * Loads the member's own profile from the API (non-demo). A 404 means the
 * account has no profile yet, so the app shows onboarding.
 */
export function useHydrateMe() {
  return useQuery({
    queryKey: ['me'],
    enabled: !DEMO_MODE,
    queryFn: async () => {
      try {
        const p = await api<{ firstName: string; headline?: string; languages: string[]; regionCode: string; prompts: MyProfile['prompts']; photos: MyProfile['photos']; jewishLife: Partial<JewishLife> }>('/profiles/me');
        // Consent dates live server-side; any non-private field there was consented.
        const consents = Object.fromEntries(Object.entries(p.jewishLife).filter(([, f]) => f && (f.visibility !== 'private' || f.useForMatching)).map(([k]) => [k, 'server']));
        meStore.set({ ...p, headline: p.headline ?? '', consents, onboarded: true });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) meStore.set({ onboarded: false });
        else throw e;
      }
      return true;
    },
  });
}

/** Saves basics/prompts and Jewish-life answers. In demo mode nothing leaves the phone. */
export function useSaveMe() {
  return useMutation({
    mutationFn: async (what: { basics?: ProfileUpdate; jewishLife?: boolean }) => {
      if (DEMO_MODE) return;
      // PUT /profiles/me is the basics contract (ProfileUpdate) — see PR notes for workstream B.
      if (what.basics) await api('/profiles/me', { method: 'PUT', body: JSON.stringify(what.basics) });
      if (what.jewishLife) await api('/profiles/me/jewish-life', { method: 'PUT', body: JSON.stringify(meStore.get().jewishLife) });
    },
  });
}
