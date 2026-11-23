import { useSyncExternalStore } from 'react';
import type { ReportReason } from '@kapara/shared';
import { DEMO_PEOPLE, ageOf, demoUserId, momentUrl, portraitUrl } from '../demo/people';
import { CLOUD, must, sb } from '../cloud/client';

/**
 * Back-office data for the demo: fictional members, reports and photos
 * waiting for review, derived from the demo people. Decisions taken here
 * live in memory only (connected mode will call the API's admin routes).
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
  id: string; reportedKey: string; reporterKey: string; reason: ReportReason; context: 'profile' | 'conversation' | 'live' | 'crossed';
  details: string; hoursAgo: number; status: ReportStatus;
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
let state: State = CLOUD ? { members: [], reports: [], photos: [], loading: true } : build();
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
  if (error) set({ ...state, error: error.message });
}

export const adminStore = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  get: () => state,
  load: () => (CLOUD ? loadCloud() : Promise.resolve()),
  setMemberStatus(key: string, status: MemberStatus) {
    set({ ...state, members: state.members.map((m) => (m.key === key ? { ...m, status } : m)) });
    if (CLOUD) void cloudSuspend(key, status === 'suspended');
  },
  decideReport(id: string, status: Exclude<ReportStatus, 'open'>) {
    const r = state.reports.find((x) => x.id === id);
    if (CLOUD) {
      void sb.from('reports').update({ status, handled_at: new Date().toISOString() }).eq('id', id);
      if (status === 'suspended' && r) void cloudSuspend(r.reportedKey, true);
    }
    set({
      ...state,
      reports: state.reports.map((x) => (x.id === id ? { ...x, status } : x)),
      members: status === 'suspended' && r ? state.members.map((m) => (m.key === r.reportedKey ? { ...m, status: 'suspended' } : m)) : state.members,
    });
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
