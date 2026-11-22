import { useQuery } from '@tanstack/react-query';
import type { Recommendation } from '@kapara/shared';
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
