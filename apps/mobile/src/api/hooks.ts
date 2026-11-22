import { useMutation, useQuery } from '@tanstack/react-query';
import type { Like, ProfilePublic, Recommendation } from '@kapara/shared';
import { DEMO_PICKS } from '../demo/profiles';
import { api, DEMO_MODE } from './client';

export function useForYou() {
  return useQuery({
    queryKey: ['for-you'],
    queryFn: async (): Promise<Recommendation[]> => {
      if (DEMO_MODE) return DEMO_PICKS;
      // TODO(workstream api-integration): hydrate ids into full profiles server-side.
      const r = await api<{ picks: Recommendation[] }>('/for-you');
      return r.picks;
    },
  });
}

/** Reaction to a photo or an answer. Demo: simulated locally, nothing is sent. */
export function useSendLike() {
  return useMutation({
    mutationFn: async (like: Like): Promise<{ matched: boolean }> => {
      if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 450)); return { matched: false }; }
      return api<{ matched: boolean }>('/for-you/like', { method: 'POST', body: JSON.stringify(like) });
    },
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
      if (DEMO_MODE) return DEMO_PICKS.find((r) => r.profile.id === id)?.profile ?? null;
      return api<ProfilePublic>(`/profiles/${id}`);
    },
  });
}
