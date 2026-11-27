import { useSyncExternalStore } from 'react';
import type { ReportReason } from '@kapara/shared';
import { DEMO_PEOPLE, ageOf, demoUserId, momentUrl, portraitUrl } from '../demo/people';
import { CLOUD, must, sb } from '../cloud/client';
import { api, DEMO_MODE } from '../api/client';

/**
 * Back-office data for the demo: fictional members, reports and photos
 * waiting for review, derived from the demo people. Decisions taken here
 * live in memory only. With the API or Supabase, every decision is saved on
 * the server first and shown only once saved (never a local fake).
 */
export type MemberStatus = 'active' | 'paused' | 'suspended';
export type ReportStatus = 'open' | 'dismissed' | 'warned' | 'suspended';
export type PhotoStatus = 'pending' | 'approved' | 'rejected';

/** `key` is the member id (demo-<clé> for demo profiles, the account id for real members). */
export interface AdminMember {
  key: string; firstName: string; regionCode: string; gender: string | null; photoUrl: string | null; isDemo: boolean;
  age: number | null; status: MemberStatus; joinedDaysAgo: number; lastActiveMinutesAgo: number | null; verified: boolean; reportsCount: number;
  email?: string | null; provider?: string | null; onboarded?: boolean; isAdmin?: boolean;
}
export interface AdminReport {
  id: string; reportedKey: string; reporterKey: string; reason: ReportReason; context: 'profile' | 'conversation' | 'live' | 'crossed' | 'introduction';
  details: string; hoursAgo: number; status: ReportStatus; photoId?: string | null; decisionNote?: string | null;
}
export interface AdminPhoto { id: string; key: string; url: string; kind: 'portrait' | 'moment'; hoursAgo: number; status: PhotoStatus }

// Deterministic "random" so the demo looks the same for everyone.
const seed = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7);

const REPORT_PLAN: Omit<AdminReport, 'id' | 'status'>[] = [
  { reportedKey: 'thomas', reporterKey: 'sarah', reason: 'harassment', context: 'conversation', details: 'Plusieurs messages insistants après que j’ai dit ne pas être intéressée.', hoursAgo: 2 },
  { reportedKey: 'samuel', reporterKey: 'clara', reason: 'fake_profile', context: 'profile', details: 'Les photos semblent venir d’un compte Instagram public.', hoursAgo: 5 },
  { reportedKey: 'ruben', reporterKey: 'myriam', reason: 'scam', context: 'conversation', details: 'Me demande de passer sur une autre messagerie pour « un investissement ».', hoursAgo: 9 },
  { reportedKey: 'eli', reporterKey: 'noemie', reason: 'inappropriate_content', context: 'live', details: 'Comportement déplacé pendant l’appel Live.', hoursAgo: 20 },
  { reportedKey: 'benjamin', reporterKey: 'hannah', reason: 'other', context: 'crossed', details: 'Semble suivre mes passages dans le quartier.', hoursAgo: 31 },
  { reportedKey: 'ari', reporterKey: 'rebecca', reason: 'hateful', context: 'conversation', details: 'Remarque blessante sur mes origines.', hoursAgo: 46 },
];

function build() {
  const keys = new Set(DEMO_PEOPLE.map((p) => p.key));
  const reports: AdminReport[] = REPORT_PLAN.filter((r) => keys.has(r.reportedKey) && keys.has(r.reporterKey))
    .map((r, i) => ({ ...r, reportedKey: demoUserId(r.reportedKey), reporterKey: demoUserId(r.reporterKey), id: `rep-${i + 1}`, status: i < 4 ? 'open' : i === 4 ? 'warned' : 'dismissed' }));
  const members: AdminMember[] = DEMO_PEOPLE.map((p) => {
    const n = seed(p.key);
    return {
      key: demoUserId(p.key), firstName: p.firstName, regionCode: p.regionCode, gender: p.gender, photoUrl: portraitUrl(p.key), isDemo: true,
      age: ageOf(p.birthDate), verified: p.verified,
      status: n % 11 === 0 ? 'paused' : 'active',
      joinedDaysAgo: n % 5 === 0 ? 1 + (n % 6) : 8 + (n % 60), lastActiveMinutesAgo: n % 7 === 0 ? 60 * 24 * (1 + (n % 5)) : n % 240,
      reportsCount: reports.filter((r) => r.reportedKey === demoUserId(p.key)).length,
    };
  });
  const photos: AdminPhoto[] = DEMO_PEOPLE.filter((p) => seed(p.key) % 4 === 0).slice(0, 6).flatMap((p, i) => [
    { id: `ph-${p.key}-0`, key: demoUserId(p.key), url: portraitUrl(p.key), kind: 'portrait' as const, hoursAgo: 1 + i * 3, status: 'pending' as const },
    ...(i % 2 === 0 ? [{ id: `ph-${p.key}-1`, key: demoUserId(p.key), url: momentUrl(p.key, 0), kind: 'moment' as const, hoursAgo: 2 + i * 3, status: 'pending' as const }] : []),
  ]);
  return { members, reports, photos };
}

type State = ReturnType<typeof build> & { cloud?: CloudStats; loading?: boolean; error?: string };
export type CloudStats = { members: number; onboarded: number; demo: number; suspended: number; likes: number; conversations: number; messages: number; openReports: number; signups7d: number };
const SERVER = CLOUD || !DEMO_MODE;
let state: State = SERVER ? { members: [], reports: [], photos: [], loading: true } : build();
const listeners = new Set<() => void>();
const set = (next: State) => { state = next; listeners.forEach((l) => l()); };

const minutesSince = (iso?: string | null) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)) : null);

type CloudMember = { id: string; firstName: string; isDemo: boolean; gender: string | null; regionCode: string; age: number | null; photoUrl: string | null;
  onboarded: boolean; suspended: boolean; verified: boolean; provider: string | null; email: string | null; createdAt: string; lastSignInAt: string | null; reports: number; isAdmin: boolean };
type CloudReport = { id: string; reason: ReportReason; details: string | null; context: AdminReport['context']; status: ReportStatus; createdAt: string;
  reported: { id: string }; reporter: { id: string } };

/** Real accounts: everything comes from the database (admin_* functions, administrators only). */
async function loadCloud() {
  set({ ...state, loading: true, error: undefined });
  try {
    const [members, reports, stats] = await Promise.all([sb.rpc('admin_members'), sb.rpc('admin_reports'), sb.rpc('admin_stats')]);
    set({
      photos: [],
      cloud: must(stats) as CloudStats,
      members: (must(members) as CloudMember[]).map((m) => ({
        key: m.id, firstName: m.firstName || '—', regionCode: m.regionCode, gender: m.gender, photoUrl: m.photoUrl, isDemo: m.isDemo, age: m.age,
        status: m.suspended ? 'suspended' : 'active', verified: m.verified, reportsCount: m.reports, email: m.email, provider: m.provider,
        onboarded: m.onboarded, isAdmin: m.isAdmin,
        joinedDaysAgo: Math.floor((minutesSince(m.createdAt) ?? 0) / 1440), lastActiveMinutesAgo: minutesSince(m.lastSignInAt),
      })),
      reports: (must(reports) as CloudReport[]).map((r) => ({
        id: r.id, reportedKey: r.reported.id, reporterKey: r.reporter.id, reason: r.reason, context: r.context, details: r.details ?? '',
        hoursAgo: Math.floor((minutesSince(r.createdAt) ?? 0) / 60), status: r.status,
      })),
    });
  } catch (e) {
    set({ ...state, loading: false, error: e instanceof Error ? e.message : 'error' });
  }
}

async function cloudSuspend(key: string, suspended: boolean) {
  const { error } = await sb.from('members').update({ suspended }).eq('id', key);
  if (error) throw new Error(error.message);
}

type ApiPerson = { id: string; firstName: string; isDemo: boolean; regionCode: string; age: number | null; gender: string | null; photoUrl: string | null;
  email: string | null; createdAt: string; hidden: boolean; suspended: boolean; paused: boolean; deleted: boolean; reports: number };
type ApiReport = { id: string; reason: ReportReason; details: string | null; context: AdminReport['context']; status: 'open' | 'dismissed' | 'actioned';
  photoId: string | null; createdAt: string; decisionNote: string | null; reported: ApiPerson; reporter: ApiPerson };

const personToMember = (m: ApiPerson): AdminMember => ({
  key: m.id, firstName: m.firstName || '—', regionCode: m.regionCode, gender: m.gender, photoUrl: m.photoUrl, isDemo: m.isDemo, age: m.age,
  status: m.suspended ? 'suspended' : m.paused || m.hidden ? 'paused' : 'active', verified: false, reportsCount: m.reports, email: m.email,
  joinedDaysAgo: Math.floor((minutesSince(m.createdAt) ?? 0) / 1440), lastActiveMinutesAgo: null,
});

/** ZIV API (production): GET /v1/moderation/reports, moderators only. Members come with their reports. */
async function loadApi() {
  set({ ...state, loading: true, error: undefined });
  try {
    const r = await api<{ reports: ApiReport[] }>('/moderation/reports');
    const people = new Map<string, AdminMember>();
    for (const x of r.reports) for (const p of [x.reported, x.reporter]) if (p && !p.deleted && p.firstName !== undefined) people.set(p.id, personToMember(p));
    set({
      photos: [], loading: false,
      members: [...people.values()],
      reports: r.reports.map((x) => ({
        id: x.id, reportedKey: x.reported.id, reporterKey: x.reporter.id, reason: x.reason, context: x.context, details: x.details ?? '',
        hoursAgo: Math.floor((minutesSince(x.createdAt) ?? 0) / 60), photoId: x.photoId, decisionNote: x.decisionNote,
        status: x.status === 'open' ? 'open' : x.status === 'dismissed' ? 'dismissed' : x.reported.suspended ? 'suspended' : 'warned',
      })),
    });
  } catch (e) {
    set({ ...state, loading: false, error: e instanceof Error ? e.message : 'error' });
  }
}

const post = (path: string, body: unknown = {}) => api(path, { method: 'POST', body: JSON.stringify(body) });

export const adminStore = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  get: () => state,
  load: () => (CLOUD ? loadCloud() : !DEMO_MODE ? loadApi() : Promise.resolve()),
  /** Saved on the server first; the screen changes only once it is saved. Throws (and sets `error`) otherwise. */
  async setMemberStatus(key: string, status: MemberStatus, reportId?: string) {
    try {
      if (CLOUD) await cloudSuspend(key, status === 'suspended');
      else if (!DEMO_MODE) await post(`/moderation/users/${key}/${status === 'suspended' ? 'suspend' : status === 'paused' ? 'hide' : 'restore'}`, { reportId });
    } catch (e) { set({ ...state, error: e instanceof Error ? e.message : 'error' }); return false; }
    set({ ...state, error: undefined, members: state.members.map((m) => (m.key === key ? { ...m, status } : m)) });
    return true;
  },
  /** Reported photo: removed and its file deleted (API). */
  async removePhoto(reportId: string, photoId: string) {
    try { await api(`/moderation/photos/${photoId}`, { method: 'DELETE', body: JSON.stringify({ reportId }) }); }
    catch (e) { set({ ...state, error: e instanceof Error ? e.message : 'error' }); return false; }
    set({ ...state, error: undefined, reports: state.reports.map((x) => (x.id === reportId ? { ...x, photoId: null } : x)) });
    return true;
  },
  async decideReport(id: string, status: Exclude<ReportStatus, 'open'>) {
    const r = state.reports.find((x) => x.id === id);
    try {
      if (CLOUD) {
        const { error } = await sb.from('reports').update({ status, handled_at: new Date().toISOString() }).eq('id', id);
        if (error) throw new Error(error.message);
        if (status === 'suspended' && r) await cloudSuspend(r.reportedKey, true);
      } else if (!DEMO_MODE) {
        await post(`/moderation/reports/${id}/decision`, { decision: status === 'dismissed' ? 'dismissed' : 'actioned' });
        if (status === 'suspended' && r) await post(`/moderation/users/${r.reportedKey}/suspend`, { reportId: id });
      }
    } catch (e) { set({ ...state, error: e instanceof Error ? e.message : 'error' }); return false; }
    set({
      ...state,
      reports: state.reports.map((x) => (x.id === id ? { ...x, status } : x)),
      members: status === 'suspended' && r ? state.members.map((m) => (m.key === r.reportedKey ? { ...m, status: 'suspended' } : m)) : state.members,
    });
    return true;
  },
  decidePhoto(id: string, status: Exclude<PhotoStatus, 'pending'>) {
    set({ ...state, photos: state.photos.map((p) => (p.id === id ? { ...p, status } : p)) });
  },
};

/** Selects from the back-office state. The selector must return stored values (derive with useMemo). */
export function useAdmin<T>(select: (s: State) => T): T {
  return useSyncExternalStore(adminStore.subscribe, () => select(state), () => select(state));
}

/** Headline numbers for the overview. */
export function adminStats(s: State) {
  const active = s.members.filter((m) => m.status === 'active');
  const byRegion: Record<string, number> = {};
  const byGender: Record<string, number> = {};
  for (const m of s.members) {
    byRegion[m.regionCode] = (byRegion[m.regionCode] ?? 0) + 1;
    if (m.gender) byGender[m.gender] = (byGender[m.gender] ?? 0) + 1;
  }
  return {
    members: s.members.length,
    activeToday: active.filter((m) => m.lastActiveMinutesAgo !== null && m.lastActiveMinutesAgo < 60 * 24).length,
    newThisWeek: s.members.filter((m) => m.joinedDaysAgo <= 7).length,
    verified: s.members.filter((m) => m.verified).length,
    suspended: s.members.filter((m) => m.status === 'suspended').length,
    openReports: s.reports.filter((r) => r.status === 'open').length,
    pendingPhotos: s.photos.filter((p) => p.status === 'pending').length,
    byRegion, byGender,
  };
}
