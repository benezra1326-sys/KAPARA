import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Like, ProfilePublic, Recommendation } from '@kapara/shared';
import { DEMO_PICKS, DEMO_PROFILES, demoPicksIn } from '../demo/profiles';
import { meStore, useMe } from '../me/store';
import { api, DEMO_MODE } from './client';
import { CLOUD } from '../cloud/client';
import { cloud } from '../cloud/data';

/** Today's picks in the member's current city (changing city is free). */
export function useForYou() {
  const regionCode = useMe((s) => s.regionCode);
  return useQuery({
    queryKey: ['for-you', regionCode],
    queryFn: async (): Promise<Recommendation[]> => {
      if (CLOUD) return cloud.forYou(regionCode);
      if (DEMO_MODE) return demoPicksIn(regionCode, meStore.get().gender);
      // The API returns today's picks already filtered for the viewer (visibility, consents, blocks).
      const r = await api<{ picks: Recommendation[] }>('/for-you');
      return r.picks.filter((p) => !p.profile.regionCode || p.profile.regionCode === regionCode);
    },
  });
}

/** Reaction to a photo or an answer. Demo: simulated locally, nothing is sent. */
export function useSendLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (like: Like): Promise<{ matched: boolean; conversationId?: string }> => {
      if (CLOUD) return cloud.like(like);
      if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 450)); return { matched: false }; }
      return api<{ matched: boolean; conversationId?: string }>('/for-you/like', { method: 'POST', body: JSON.stringify(like) });
    },
    // A mutual like opens a conversation: Messages shows it right away.
    onSuccess: (r) => { if (r.matched) void qc.invalidateQueries({ queryKey: ['conversations'] }); },
  });
}

/** Voluntary feedback on a suggestion ("not for me"). Recorded server-side; the profile is not shown again. */
export function useSuggestionFeedback() {
  return useMutation({
    mutationFn: async (b: { subjectId: string; signal: 'more_like_this' | 'not_for_me' }) => {
      if (DEMO_MODE) return { ok: true };
      return api<{ ok: boolean }>('/for-you/feedback', { method: 'POST', body: JSON.stringify(b) });
    },
  });
}

/** One profile, as the API filters it for the viewer. */
export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async (): Promise<ProfilePublic | null> => {
      if (CLOUD) return cloud.profile(id!);
      if (DEMO_MODE) return DEMO_PICKS.find((r) => r.profile.id === id)?.profile ?? DEMO_PROFILES[id!] ?? null;
      return api<ProfilePublic>(`/profiles/${id}`);
    },
  });
}
