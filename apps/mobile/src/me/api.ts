import { useMutation, useQuery } from '@tanstack/react-query';
import { SENSITIVE_POLICY_VERSION, type Gender, type JewishLife, type ProfilePublic } from '@kapara/shared';
import { api, ApiError, DEMO_MODE } from '../api/client';
import type { JLKey } from './fields';
import { commitPhotos } from './photos';
import { basicsPayload, meStore, type SensitiveField } from './store';

type MeResponse = {
  regionCode: string;
  profile: (ProfilePublic & { birthDate?: string; gender?: Gender }) | null;
  consents: { field: string; grantedAt: string }[];
};

/**
 * Loads the member's own profile from the API (non-demo). No profile yet
 * means the account still needs onboarding.
 */
export function useHydrateMe() {
  return useQuery({
    queryKey: ['me'],
    enabled: !DEMO_MODE,
    queryFn: async () => {
      const r = await api<MeResponse>('/profiles/me');
      const consents = Object.fromEntries(r.consents.map((c) => [c.field, c.grantedAt]));
      if (!r.profile) { meStore.set({ onboarded: false, regionCode: r.regionCode, consents }); return true; }
      const p = r.profile;
      meStore.set({
        onboarded: true, firstName: p.firstName, headline: p.headline ?? '', languages: p.languages, regionCode: r.regionCode,
        prompts: p.prompts, jewishLife: p.jewishLife, consents,
        // Photos still uploading (or not yet attached) on this phone are kept.
        photos: [...p.photos, ...meStore.get().photos.filter((x) => x.key || x.status)],
        // Self view may not include these; the basics editor then asks for them again.
        ...(p.birthDate ? { birthDate: p.birthDate.slice(0, 10) } : {}), ...(p.gender ? { gender: p.gender } : {}),
      });
      return true;
    },
  });
}

export type SaveRequest = {
  /** Send the basic profile (PUT /profiles/me). */
  basics?: boolean;
  /** Fields to grant storage consent for, before writing answers. */
  grant?: JLKey[];
  /** Answers to write (merged server-side). `null` erases. */
  answers?: Partial<Record<JLKey, SensitiveField | null>>;
  /** Fields whose consent is withdrawn: the API erases the answer. */
  revoke?: JLKey[];
  /** Attach the photos uploaded during onboarding (PUT /profiles/me/photos). */
  photos?: boolean;
  /** During onboarding everything stays local until the last step sends it all. */
  force?: boolean;
};

/** Saves to the API in the order it requires. In demo mode nothing leaves the phone. */
export function useSaveMe() {
  return useMutation({
    mutationFn: async (r: SaveRequest) => {
      if (DEMO_MODE) return;
      const s = meStore.get();
      if (!s.onboarded && !r.force) return;
      if (r.basics) {
        const b = basicsPayload(s);
        if (!b) throw new ApiError(400, 'basics_incomplete');
        await api('/profiles/me', { method: 'PUT', body: JSON.stringify(b) });
      }
      if (r.grant?.length) await api('/profiles/me/consents', { method: 'POST', body: JSON.stringify({ fields: r.grant, policyVersion: SENSITIVE_POLICY_VERSION }) });
      if (r.answers && Object.keys(r.answers).length) await api('/profiles/me/jewish-life', { method: 'PUT', body: JSON.stringify(r.answers as Partial<JewishLife>) });
      for (const f of r.revoke ?? []) await api(`/profiles/me/consents/${f}`, { method: 'DELETE' });
      if (r.photos && s.photos.some((p) => !p.status)) await commitPhotos();
    },
  });
}
