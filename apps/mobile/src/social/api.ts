import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  coarsen,
  type ChatMessage, type ConversationSummary, type CrossedItem, type CrossedPing, type IntroductionReceived,
  type IntroductionSent, type ReportCreate, type SensitiveZone, type ShabbatSettings, type ShabbatStatus,
} from '@kapara/shared';
import { api, DEMO_MODE } from '../api/client';
import { demo } from './demo';
import { CLOUD } from '../cloud/client';
import { cloud } from '../cloud/data';
import { useEffect } from 'react';

/** Data layer for Croisés, conversations, introductions, safety, Shabbat mode. Demo-aware. */
const json = (body: unknown) => ({ body: JSON.stringify(body) });
/** Endpoints answering 204 return no JSON. */
const noContent = (path: string, init: RequestInit) => api<unknown>(path, init).catch((e) => {
  if (e instanceof SyntaxError) return undefined;
  throw e;
});

export const keys = {
  crossed: ['crossed'] as const, crossedSettings: ['crossed', 'settings'] as const, zones: ['crossed', 'zones'] as const,
  conversations: ['conversations'] as const, messages: (id: string) => ['conversations', id, 'messages'] as const,
  inbox: ['intro', 'inbox'] as const, sent: ['intro', 'sent'] as const, blocks: ['blocks'] as const, shabbat: ['shabbat'] as const,
};

// ── Croisés ────────────────────────────────────────────────────────────────

export const useCrossedSettings = () => useQuery({
  queryKey: keys.crossedSettings,
  queryFn: () => (DEMO_MODE ? demo.crossedSettings() : api<{ enabled: boolean }>('/crossed/settings')),
});

export function useSetCrossed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => (DEMO_MODE ? demo.setCrossed(enabled) : api<{ enabled: boolean }>('/crossed/settings', { method: 'PUT', ...json({ enabled }) })),
    onSuccess: (r) => { qc.setQueryData(keys.crossedSettings, r); void qc.invalidateQueries({ queryKey: keys.crossed }); },
  });
}

export const useCrossed = (enabled: boolean) => useQuery({
  queryKey: keys.crossed, enabled,
  queryFn: () => (DEMO_MODE ? demo.crossed() : api<CrossedItem[]>('/crossed')),
});

/** The position is coarsened on the device before it is sent. */
export const sendPing = (p: CrossedPing) => (DEMO_MODE ? Promise.resolve({ recorded: true }) : api<{ recorded: boolean }>('/crossed/ping', { method: 'POST', ...json(coarsen(p)) }));

export function useClearCrossed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => (DEMO_MODE ? demo.clearCrossed() : noContent('/crossed/history', { method: 'DELETE' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.crossed }),
  });
}

export const useZones = () => useQuery({ queryKey: keys.zones, queryFn: () => (DEMO_MODE ? demo.zones() : api<SensitiveZone[]>('/crossed/zones')) });

export function useAddZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (z: CrossedPing & { kind: SensitiveZone['kind'] }) => (DEMO_MODE ? demo.addZone(z.kind) : api('/crossed/zones', { method: 'POST', ...json({ ...coarsen(z), kind: z.kind }) })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.zones }),
  });
}

export function useRemoveZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (DEMO_MODE ? demo.removeZone(id) : noContent(`/crossed/zones/${id}`, { method: 'DELETE' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.zones }),
  });
}

// ── Conversations ──────────────────────────────────────────────────────────

export const useConversations = () => useQuery({
  queryKey: keys.conversations,
  queryFn: () => (CLOUD ? cloud.conversations() : DEMO_MODE ? demo.conversations() : api<ConversationSummary[]>('/conversations')),
});

export const useMessages = (id: string) => useQuery({
  queryKey: keys.messages(id),
  queryFn: () => (CLOUD ? cloud.messages(id) : DEMO_MODE ? demo.messages(id) : api<ChatMessage[]>(`/conversations/${id}/messages`)),
  // Real accounts: pushed by Realtime (useLiveMessages), with a slow safety refresh.
  refetchInterval: CLOUD ? 30_000 : DEMO_MODE ? false : 15_000,
});

/** Kindness nudge: the API answers 422 "kindness_check"; the demo checks a tiny list locally. */
export function useSend(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, confirmed }: { body: string; confirmed?: boolean }) => {
      if (CLOUD) {
        if (!confirmed && /\b(connasse|connard|ferme[- ]la|ta gueule|stupid|ugly|idiot)\b/i.test(body)) throw new Error('kindness_check');
        return cloud.send(id, body);
      }
      if (DEMO_MODE) {
        if (!confirmed && /\b(connasse|connard|ferme[- ]la|ta gueule|stupid|ugly|idiot)\b/i.test(body)) throw new Error('kindness_check');
        return demo.send(id, body);
      }
      return api<ChatMessage>(`/conversations/${id}/messages`, { method: 'POST', ...json({ body, confirmed }) });
    },
    onSuccess: (m) => {
      qc.setQueryData<ChatMessage[]>(keys.messages(id), (old) => [...(old ?? []), m]);
      void qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });
}

/** Real accounts: refreshes the thread as soon as a new message is written. */
export function useLiveMessages(id: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!CLOUD || !id) return undefined;
    return cloud.onMessages(id, () => {
      void qc.invalidateQueries({ queryKey: keys.messages(id) });
      void qc.invalidateQueries({ queryKey: keys.conversations });
    });
  }, [id, qc]);
}

/** What each person liked when the conversation opened (real accounts only; the demo has none). */
export function useLikesBetween(otherId?: string) {
  return useQuery({
    queryKey: ['likes-between', otherId],
    enabled: CLOUD && !!otherId,
    staleTime: 5 * 60_000,
    queryFn: () => cloud.likesBetween(otherId!),
  });
}

export function useCloseConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (CLOUD ? cloud.close(id) : DEMO_MODE ? demo.closeConversation(id) : noContent(`/conversations/${id}`, { method: 'DELETE' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.conversations }),
  });
}

// ── Introductions ──────────────────────────────────────────────────────────

// Real accounts: introductions are not in the database yet, so no fictional ones appear among real conversations.
export const useIntroInbox = () => useQuery({ queryKey: keys.inbox, queryFn: () => (CLOUD ? Promise.resolve([] as IntroductionReceived[]) : DEMO_MODE ? demo.inbox() : api<IntroductionReceived[]>('/introductions/inbox')) });
export const useIntroSent = () => useQuery({ queryKey: keys.sent, queryFn: () => (DEMO_MODE ? demo.sent() : api<IntroductionSent[]>('/introductions/sent')) });

export function useRespondIntro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => (DEMO_MODE ? demo.respond(id, accept)
      : api<{ status: string; conversationId?: string }>(`/introductions/${id}/respond`, { method: 'POST', ...json({ accept }) })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.inbox }); void qc.invalidateQueries({ queryKey: keys.conversations }); },
  });
}

export function useProposeIntro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { personAId: string; personBId: string; note: string }) => (DEMO_MODE ? demo.propose(b.personAId, b.personBId)
      : api<{ id: string }>('/introductions', { method: 'POST', ...json(b) })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sent }),
  });
}

// ── Safety ─────────────────────────────────────────────────────────────────

/** A block hides the person everywhere, so every list is refreshed. */
const refreshAll = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries();

export const useBlocks = () => useQuery({
  queryKey: keys.blocks,
  queryFn: () => (CLOUD ? cloud.blocks() : DEMO_MODE ? demo.blocks() : api<{ userId: string; firstName: string; blockedAt: string }[]>('/safety/blocks')),
});

export function useBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => (CLOUD ? cloud.block(userId) : DEMO_MODE ? demo.block(userId) : noContent(`/safety/blocks/${userId}`, { method: 'POST' })),
    onSuccess: () => refreshAll(qc),
  });
}

export function useUnblock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => (CLOUD ? cloud.unblock(userId) : DEMO_MODE ? demo.unblock(userId) : noContent(`/safety/blocks/${userId}`, { method: 'DELETE' })),
    onSuccess: () => refreshAll(qc),
  });
}

export function useReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: ReportCreate) => (CLOUD ? cloud.report(r) : DEMO_MODE ? demo.report(r.userId, r.alsoBlock) : api('/safety/reports', { method: 'POST', ...json(r) })),
    onSuccess: () => refreshAll(qc),
  });
}

// ── Shabbat mode ───────────────────────────────────────────────────────────

export const useShabbat = () => useQuery({ queryKey: keys.shabbat, queryFn: () => (DEMO_MODE ? demo.shabbat() : api<ShabbatStatus>('/shabbat')) });

export function useSetShabbat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: ShabbatSettings) => (DEMO_MODE ? demo.setShabbat(s) : api<ShabbatStatus>('/shabbat', { method: 'PUT', ...json(s) })),
    onSuccess: (r) => qc.setQueryData(keys.shabbat, r),
  });
}
