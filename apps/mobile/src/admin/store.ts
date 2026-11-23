import { useSyncExternalStore } from 'react';
import type { ReportReason } from '@kapara/shared';
import { DEMO_PEOPLE, ageOf, momentUrl, portraitUrl, type DemoPerson } from '../demo/people';

/**
 * Back-office data for the demo: fictional members, reports and photos
 * waiting for review, derived from the demo people. Decisions taken here
 * live in memory only (connected mode will call the API's admin routes).
 */
export type MemberStatus = 'active' | 'paused' | 'suspended';
export type ReportStatus = 'open' | 'dismissed' | 'warned' | 'suspended';
export type PhotoStatus = 'pending' | 'approved' | 'rejected';

export interface AdminMember {
  key: string; person: DemoPerson; age: number; status: MemberStatus;
  joinedDaysAgo: number; lastActiveMinutesAgo: number; verified: boolean; reportsCount: number;
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
    .map((r, i) => ({ ...r, id: `rep-${i + 1}`, status: i < 4 ? 'open' : i === 4 ? 'warned' : 'dismissed' }));
  const members: AdminMember[] = DEMO_PEOPLE.map((p) => {
    const n = seed(p.key);
    return {
      key: p.key, person: p, age: ageOf(p.birthDate), verified: p.verified,
      status: n % 11 === 0 ? 'paused' : 'active',
      joinedDaysAgo: n % 5 === 0 ? 1 + (n % 6) : 8 + (n % 60), lastActiveMinutesAgo: n % 7 === 0 ? 60 * 24 * (1 + (n % 5)) : n % 240,
      reportsCount: reports.filter((r) => r.reportedKey === p.key).length,
    };
  });
  const photos: AdminPhoto[] = DEMO_PEOPLE.filter((p) => seed(p.key) % 4 === 0).slice(0, 6).flatMap((p, i) => [
    { id: `ph-${p.key}-0`, key: p.key, url: portraitUrl(p.key), kind: 'portrait' as const, hoursAgo: 1 + i * 3, status: 'pending' as const },
    ...(i % 2 === 0 ? [{ id: `ph-${p.key}-1`, key: p.key, url: momentUrl(p.key, 0), kind: 'moment' as const, hoursAgo: 2 + i * 3, status: 'pending' as const }] : []),
  ]);
  return { members, reports, photos };
}

type State = ReturnType<typeof build>;
let state: State = build();
const listeners = new Set<() => void>();
const set = (next: State) => { state = next; listeners.forEach((l) => l()); };

export const adminStore = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  get: () => state,
  setMemberStatus(key: string, status: MemberStatus) {
    set({ ...state, members: state.members.map((m) => (m.key === key ? { ...m, status } : m)) });
  },
  decideReport(id: string, status: Exclude<ReportStatus, 'open'>) {
    const r = state.reports.find((x) => x.id === id);
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
    byRegion[m.person.regionCode] = (byRegion[m.person.regionCode] ?? 0) + 1;
    byGender[m.person.gender] = (byGender[m.person.gender] ?? 0) + 1;
  }
  return {
    members: s.members.length,
    activeToday: active.filter((m) => m.lastActiveMinutesAgo < 60 * 24).length,
    newThisWeek: s.members.filter((m) => m.joinedDaysAgo <= 7).length,
    verified: s.members.filter((m) => m.verified).length,
    suspended: s.members.filter((m) => m.status === 'suspended').length,
    openReports: s.reports.filter((r) => r.status === 'open').length,
    pendingPhotos: s.photos.filter((p) => p.status === 'pending').length,
    byRegion, byGender,
  };
}
