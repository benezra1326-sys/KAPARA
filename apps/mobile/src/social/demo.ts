import type {
  ChatMessage, ConversationSummary, CrossedItem, IntroductionReceived, IntroductionSent, SensitiveZone, ShabbatStatus,
} from '@kapara/shared';
import { ageOf, DEMO_PEOPLE, DEMO_VIEWER_KEY, demoUserId, portraitUrl } from '../demo/people';
import { DEMO_CONVERSATIONS, DEMO_CROSSED, DEMO_INTRODUCTIONS } from '../demo/scenarios';
import { meStore } from '../me/store';

/**
 * In-memory demo store for Croisés, conversations, introductions, safety and
 * Shabbat mode. Built from the shared demo cast (src/demo), so every screen
 * tells the same story as "Pour toi", Live and the seeded database.
 * Fictional people only (isDemo: true). Lives for the app session; nothing leaves the device.
 */
export const DEMO_ME = demoUserId(DEMO_VIEWER_KEY);
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

type Person = { id: string; firstName: string; age: number; photoUrl: string; verified: boolean };
const PEOPLE: Person[] = DEMO_PEOPLE.map((p) => ({ id: demoUserId(p.key), firstName: p.firstName, age: ageOf(p.birthDate), photoUrl: portraitUrl(p.key), verified: p.verified }));
export const person = (id: string) => PEOPLE.find((p) => p.id === id);

const OPEN_INTRO = ['proposed', 'accepted_by_a', 'accepted_by_b'];
const state = {
  crossedEnabled: false,
  crossed: DEMO_CROSSED.map((c) => ({ userId: demoUserId(c.key), times: c.times > 1 ? ('several' as const) : ('once' as const) })),
  zones: [] as SensitiveZone[],
  blocked: [] as { userId: string; firstName: string; blockedAt: string }[],
  conversations: DEMO_CONVERSATIONS.map((c) => ({ id: c.id, otherId: demoUserId(c.withKey), origin: c.origin.kind, createdAt: ago(c.startedMinutesAgo), closed: false })),
  messages: Object.fromEntries(DEMO_CONVERSATIONS.map((c) => [c.id, c.messages.map((m, i): ChatMessage => ({
    id: `${c.id}-${i}`, senderId: demoUserId(m.from), mine: m.from === DEMO_VIEWER_KEY, body: m.body, createdAt: ago(m.minutesAgo),
  }))])) as Record<string, ChatMessage[]>,
  introsReceived: DEMO_INTRODUCTIONS
    .filter((i) => i.introducerKey !== DEMO_VIEWER_KEY && [i.aKey, i.bKey].includes(DEMO_VIEWER_KEY) && OPEN_INTRO.includes(i.status))
    .map((i) => ({
      id: i.id, introducerId: demoUserId(i.introducerKey), otherId: demoUserId(i.aKey === DEMO_VIEWER_KEY ? i.bKey : i.aKey), note: i.note,
      myAnswer: 'pending' as 'pending' | 'accepted', createdAt: ago(i.minutesAgo),
    })),
  introsSent: DEMO_INTRODUCTIONS.filter((i) => i.introducerKey === DEMO_VIEWER_KEY).map((i) => ({
    id: i.id, personA: demoUserId(i.aKey), personB: demoUserId(i.bKey), createdAt: ago(i.minutesAgo),
    outcome: (OPEN_INTRO.includes(i.status) ? 'waiting' : i.status === 'connected' ? 'connected' : 'closed') as IntroductionSent['outcome'],
  })),
  shabbat: { enabled: false, includeHolidays: true, candleLightingMins: 18, havdalahMins: null as number | null },
};

const hidden = (id: string) => state.blocked.some((b) => b.userId === id);
// Croisés follows who the member seeks, like "Pour toi": a man seeking women sees women, and the other way round.
const fits = (id: string) => {
  const viewer = meStore.get().gender;
  const p = DEMO_PEOPLE.find((x) => demoUserId(x.key) === id);
  if (!p || !viewer) return true;
  const seeks = viewer === 'man' ? ['woman'] : viewer === 'woman' ? ['man'] : [];
  return (!seeks.length || seeks.includes(p.gender)) && (!p.seeks.length || p.seeks.includes(viewer));
};
const wait = <T,>(v: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(v), ms));

// ── Croisés ────────────────────────────────────────────────────────────────
export const demo = {
  crossedSettings: () => wait({ enabled: state.crossedEnabled }),
  setCrossed: (enabled: boolean) => { state.crossedEnabled = enabled; return wait({ enabled }); },
  crossed: (): Promise<CrossedItem[]> => wait(state.crossedEnabled ? state.crossed.filter((c) => !hidden(c.userId) && fits(c.userId)).map((c) => {
    const p = person(c.userId)!;
    return { userId: p.id, firstName: p.firstName, age: p.age, photoUrl: p.photoUrl, isDemo: true, verified: p.verified, times: c.times };
  }) : []),
  clearCrossed: () => wait(undefined),
  zones: () => wait([...state.zones]),
  addZone: (kind: SensitiveZone['kind']) => {
    state.zones.push({ id: `z-${Date.now()}`, kind, createdAt: new Date().toISOString() });
    return wait(undefined);
  },
  removeZone: (id: string) => { state.zones = state.zones.filter((z) => z.id !== id); return wait(undefined); },

  // ── Conversations ────────────────────────────────────────────────────────
  conversations: (): Promise<ConversationSummary[]> => wait(state.conversations
    .filter((c) => !c.closed && !hidden(c.otherId))
    .map((c) => {
      const p = person(c.otherId)!;
      const msgs = state.messages[c.id] ?? [];
      return { id: c.id, other: { id: p.id, firstName: p.firstName, photoUrl: p.photoUrl, isDemo: true }, origin: c.origin, lastMessage: msgs[msgs.length - 1] ?? null, createdAt: c.createdAt };
    })
    .sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt))),
  conversation: (id: string) => {
    const c = state.conversations.find((x) => x.id === id);
    return c ? { ...c, other: person(c.otherId)!, closed: c.closed || hidden(c.otherId) } : null;
  },
  messages: (id: string) => wait([...(state.messages[id] ?? [])]),
  send: (id: string, body: string): Promise<ChatMessage> => {
    const m = { id: `m-${Date.now()}`, senderId: DEMO_ME, mine: true, body, createdAt: new Date().toISOString() };
    (state.messages[id] ??= []).push(m);
    return wait(m, 350);
  },
  closeConversation: (id: string) => { const c = state.conversations.find((x) => x.id === id); if (c) c.closed = true; return wait(undefined); },

  // ── Introductions ────────────────────────────────────────────────────────
  inbox: (): Promise<IntroductionReceived[]> => wait(state.introsReceived.filter((i) => !hidden(i.otherId) && !hidden(i.introducerId)).map((i) => {
    const o = person(i.otherId)!; const by = person(i.introducerId)!;
    return { id: i.id, introducer: { id: by.id, firstName: by.firstName }, other: { id: o.id, firstName: o.firstName, age: o.age, photoUrl: o.photoUrl, isDemo: true }, note: i.note, myAnswer: i.myAnswer, createdAt: i.createdAt };
  })),
  sent: (): Promise<IntroductionSent[]> => wait(state.introsSent.map((s) => ({
    id: s.id, personA: { id: s.personA, firstName: person(s.personA)!.firstName }, personB: { id: s.personB, firstName: person(s.personB)!.firstName },
    outcome: s.outcome, createdAt: s.createdAt,
  }))),
  /** Demo: the other side "accepts" so the full flow can be seen. Said clearly in the UI by the demo banner. */
  respond: (id: string, accept: boolean): Promise<{ status: string; conversationId?: string }> => {
    const i = state.introsReceived.find((x) => x.id === id);
    if (!i) return wait({ status: 'declined' });
    state.introsReceived = state.introsReceived.filter((x) => x.id !== id);
    if (!accept) return wait({ status: 'declined' });
    const conv = { id: `c-${Date.now()}`, otherId: i.otherId, origin: 'introduction' as const, createdAt: new Date().toISOString(), closed: false };
    state.conversations.push(conv);
    return wait({ status: 'connected', conversationId: conv.id }, 500);
  },
  propose: (a: string, b: string) => {
    state.introsSent.unshift({ id: `s-${Date.now()}`, personA: a, personB: b, outcome: 'waiting', createdAt: new Date().toISOString() });
    return wait({ id: 'ok' });
  },
  contacts: () => state.conversations.filter((c) => !c.closed && !hidden(c.otherId)).map((c) => person(c.otherId)!)
    .concat(PEOPLE.filter((p) => ['noam', 'esther', 'yael'].map(demoUserId).includes(p.id) && !hidden(p.id))),

  // ── Safety ───────────────────────────────────────────────────────────────
  block: (userId: string) => {
    if (!hidden(userId)) state.blocked.unshift({ userId, firstName: person(userId)?.firstName ?? '', blockedAt: new Date().toISOString() });
    return wait(undefined);
  },
  unblock: (userId: string) => { state.blocked = state.blocked.filter((b) => b.userId !== userId); return wait(undefined); },
  blocks: () => wait([...state.blocked]),
  report: (userId: string, alsoBlock: boolean) => (alsoBlock ? demo.block(userId) : wait(undefined)),

  // ── Shabbat ──────────────────────────────────────────────────────────────
  shabbat: (): Promise<ShabbatStatus> => {
    const start = nextFridayAtUtc(15, 40); // ≈ Paris candle lighting in late autumn
    const end = new Date(start.getTime() + (24 * 60 + 71) * 60_000);
    return wait({ ...state.shabbat, resting: false, current: null, next: { start: start.toISOString(), end: end.toISOString(), kind: 'shabbat', title: 'Shabbat' }, timezone: 'Europe/Paris', city: 'Paris' });
  },
  setShabbat: (s: typeof state.shabbat) => { state.shabbat = { ...s }; return demo.shabbat(); },
};

/** Demo only: an approximate Friday time; the real app uses server-computed times. */
function nextFridayAtUtc(h: number, m: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7));
  d.setUTCHours(h, m, 0, 0);
  return d;
}
