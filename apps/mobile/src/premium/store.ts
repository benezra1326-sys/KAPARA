import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ProfilePublic } from '@kapara/shared';
import { useRole } from '../account';
import { kv } from '../account/kv';
import { CLOUD, must, sb } from '../cloud/client';
import { DEMO_PICKS } from '../demo/profiles';
import i18n from '../i18n';
import { meStore } from '../me/store';
import { canFilterLive, LIMITS, type Months, type PlanId, type PlanLimits, type QuotaKind } from './plans';

/**
 * The member's plan, what it allows and what is left today.
 *
 * Real accounts: read from the database (my_plan()), which also enforces the
 * limits (a reaction or a Live call beyond the limit is refused there, not
 * just hidden here). Local demo: kept on this device, announced as a demo.
 */
export interface PlanState {
  /** What applies now (the administrator has everything). */
  plan: PlanId;
  /** What the member pays for (or was given). */
  subscribed: PlanId;
  until: string | null;
  source: 'demo' | 'apple' | 'admin' | null;
  isAdmin: boolean;
  limits: PlanLimits;
  used: Record<QuotaKind, number>;
  resetsAt: string;
  discreetOn: boolean;
  /** Live: may choose gender and city (paid plan or administrator). */
  liveFiltersAllowed: boolean;
}

export type PaywallReason = 'like' | 'liveFilters' | 'picks' | 'seeLikes' | 'rewind' | 'discreet' | 'otherCity' | 'browse';
export const openPaywall = (reason: PaywallReason = 'browse') => router.push({ pathname: '/premium', params: { reason } });

const KEY = ['plan'] as const;
const LOCAL = 'motek.premium';
const deviceTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
const today = () => new Date().toLocaleDateString('en-CA');
const nextMidnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.toISOString(); };

// ── Local demo (no database) ────────────────────────────────────────────────
type Local = { plan: PlanId; until: string | null; discreet: boolean; usage: { day: string; like: number; liveCall: number } };
const fresh = (): Local => ({ plan: 'free', until: null, discreet: false, usage: { day: today(), like: 0, liveCall: 0 } });
async function readLocal(): Promise<Local> {
  try {
    const v = JSON.parse((await kv.get(LOCAL)) ?? 'null') as Local | null;
    if (!v) return fresh();
    if (v.until && Date.parse(v.until) < Date.now()) { v.plan = 'free'; v.until = null; }
    if (v.usage?.day !== today()) v.usage = { day: today(), like: 0, liveCall: 0 };
    return v;
  } catch { return fresh(); }
}
const writeLocal = (v: Local) => kv.set(LOCAL, JSON.stringify(v));

let localAdmin = false;
function localState(v: Local): PlanState {
  const plan = localAdmin ? 'cercle' : v.plan;
  return {
    plan, subscribed: v.plan, until: v.until, source: v.plan === 'free' ? null : 'demo', isAdmin: localAdmin,
    limits: LIMITS[plan], used: { like: v.usage.like, liveCall: v.usage.liveCall }, resetsAt: nextMidnight(), discreetOn: v.discreet,
    liveFiltersAllowed: canFilterLive(plan, localAdmin),
  };
}

/** Local demo only: counts one use, or refuses like the database does. */
export async function consumeLocal(kind: QuotaKind) {
  if (CLOUD) return;
  const v = await readLocal();
  const s = localState(v);
  const max = kind === 'like' ? s.limits.likesPerDay : s.limits.liveCallsPerDay;
  if (max != null && v.usage[kind] >= max) throw new Error('quota_exceeded');
  v.usage[kind] += 1;
  await writeLocal(v);
}

// ── Real accounts ─────────────────────────────────────────────────────────
type Remote = Omit<PlanState, 'discreetOn' | 'used'> & { used: { like: number; liveCall: number } };
async function readCloud(): Promise<PlanState> {
  const { data: u } = await sb.auth.getSession();
  const id = u.session?.user.id;
  const row = id ? (await sb.from('members').select('privacy, timezone').eq('id', id).maybeSingle<{ privacy: Record<string, unknown>; timezone: string }>()).data : null;
  // Daily limits reset at midnight where the member is.
  if (id && row && row.timezone !== deviceTz()) await sb.from('members').update({ timezone: deviceTz() }).eq('id', id);
  const r = must(await sb.rpc('my_plan')) as Remote;
  return { ...r, discreetOn: row?.privacy?.discreet === true };
}

export function usePlan() {
  localAdmin = useRole() === 'admin';
  return useQuery({ queryKey: [...KEY, localAdmin], queryFn: async () => (CLOUD ? readCloud() : localState(await readLocal())), staleTime: 15_000 });
}

/** Refresh after anything that spends a quota. */
export const useRefreshPlan = () => {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: KEY });
};

/** Simulated payment (demo). Real purchases will go through Apple and a server check of the receipt. */
export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ plan, months }: { plan: Exclude<PlanId, 'free'>; months: Months }) => {
      await new Promise((r) => setTimeout(r, 700));
      if (CLOUD) { must(await sb.rpc('subscribe_demo', { plan_id: plan, months })); return; }
      const v = await readLocal();
      const until = new Date(); until.setMonth(until.getMonth() + months);
      await writeLocal({ ...v, plan, until: until.toISOString() });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCancelPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (CLOUD) { must(await sb.rpc('cancel_demo_plan')); return; }
      const v = await readLocal();
      await writeLocal({ ...v, plan: 'free', until: null, discreet: false });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** Discreet mode (Cercle): only people you noticed can see you. The database applies it. */
export function useSetDiscreet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => {
      if (CLOUD) {
        const { data: u } = await sb.auth.getSession();
        const id = u.session?.user.id;
        if (!id) throw new Error('signed_out');
        const cur = must(await sb.from('members').select('privacy').eq('id', id).single()) as { privacy: Record<string, unknown> };
        must(await sb.from('members').update({ privacy: { ...(cur.privacy ?? {}), discreet: on } }).eq('id', id));
        return;
      }
      const v = await readLocal();
      await writeLocal({ ...v, discreet: on });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * For the Live screens: can this member choose gender and city? If not,
 * `ask()` opens the membership page on that reason. Free Live stays a random
 * worldwide match.
 */
export function useLiveFilters() {
  const plan = usePlan();
  return { allowed: plan.data?.liveFiltersAllowed ?? false, ask: () => openPaywall('liveFilters') };
}

/** Before starting a Live call: counts it, or refuses once today's calls are used. */
export async function startLiveCall() {
  if (CLOUD) { must(await sb.rpc('live_call_start')); return; }
  await consumeLocal('liveCall');
}

// ── Who noticed you ───────────────────────────────────────────────────────
export interface LikesInbox {
  count: number;
  /** Free plan: the number only, the people stay hidden (enforced by the database). */
  locked: boolean;
  /** `target`: the photo or answer of mine they liked ({ kind, id }); see src/social/liked.ts. */
  items: { from: ProfilePublic; target?: { kind?: 'photo' | 'prompt'; id?: string } | null; comment?: string | null; createdAt: string }[];
  demo?: boolean;
}

export function useLikesInbox() {
  const plan = usePlan();
  return useQuery({
    queryKey: ['likes-inbox', plan.data?.plan],
    enabled: !!plan.data,
    queryFn: async (): Promise<LikesInbox> => {
      if (CLOUD) return must(await sb.rpc('likes_inbox')) as LikesInbox;
      // Local demo: three demo profiles, announced as such.
      const picks = DEMO_PICKS.slice(2, 5).map((r) => r.profile);
      const locked = !plan.data!.limits.seeLikes;
      // Each one liked something precise of mine: a photo, or one of my answers.
      const me = meStore.get();
      const targets = [me.prompts[0] ? { kind: 'prompt' as const, id: me.prompts[0].id } : null, me.photos[0] ? { kind: 'photo' as const, id: me.photos[0].id } : null, me.prompts[1] ? { kind: 'prompt' as const, id: me.prompts[1].id } : null];
      const words = [i18n.t('liked.demoComment1'), null, i18n.t('liked.demoComment2')];
      return { count: picks.length, locked, demo: true, items: locked ? [] : picks.map((p, i) => ({ from: p, target: targets[i] ?? (me.photos[0] ? { kind: 'photo' as const, id: me.photos[0].id } : null), comment: words[i], createdAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString() })) };
    },
  });
}
