import type {
  ChatMessage, ConversationSummary, CrossedItem, IntroductionReceived, IntroductionSent, SensitiveZone, ShabbatStatus,
} from '@kapara/shared';

/**
 * In-memory demo store for Croisés, conversations, introductions, safety and
 * Shabbat mode. Fictional people only (isDemo: true), placeholder photos.
 * Lives for the app session; nothing leaves the device.
 */
export const DEMO_ME = 'demo-me';
const photo = (seed: string) => `https://picsum.photos/seed/kapara-${seed}/600/800`;
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

type Person = { id: string; firstName: string; age: number; photoUrl: string; verified: boolean };
const PEOPLE: Person[] = [
  { id: 'demo-0', firstName: 'Léa', age: 31, photoUrl: photo('0-0'), verified: true },
  { id: 'demo-1', firstName: 'Sarah', age: 29, photoUrl: photo('1-0'), verified: false },
  { id: 'demo-4', firstName: 'Noam', age: 34, photoUrl: photo('c-4'), verified: true },
  { id: 'demo-5', firstName: 'Yaël', age: 30, photoUrl: photo('c-5'), verified: true },
  { id: 'demo-6', firstName: 'David', age: 36, photoUrl: photo('c-6'), verified: false },
  { id: 'demo-7', firstName: 'Ethan', age: 33, photoUrl: photo('c-7'), verified: true },
  { id: 'demo-8', firstName: 'Myriam', age: 28, photoUrl: photo('c-8'), verified: false },
];
export const person = (id: string) => PEOPLE.find((p) => p.id === id);

const state = {
  crossedEnabled: false,
  crossed: [
    { userId: 'demo-5', times: 'several' as const }, { userId: 'demo-7', times: 'once' as const },
    { userId: 'demo-8', times: 'once' as const }, { userId: 'demo-6', times: 'once' as const },
  ],
  zones: [] as SensitiveZone[],
  blocked: [] as { userId: string; firstName: string; blockedAt: string }[],
  conversations: [
    { id: 'c-1', otherId: 'demo-0', origin: 'like' as const, createdAt: ago(60 * 26), closed: false },
    { id: 'c-2', otherId: 'demo-4', origin: 'introduction' as const, createdAt: ago(60 * 5), closed: false },
  ],
  messages: {
    'c-1': [
      { id: 'm1', senderId: DEMO_ME, mine: true, body: 'Ta réponse sur la grande tablée du vendredi m’a fait sourire. Plutôt challah nature ou aux graines ?', createdAt: ago(60 * 25) },
      { id: 'm2', senderId: 'demo-0', mine: false, body: 'Aux graines, sans hésiter ! Et toi, tu cuisines pour Shabbat ?', createdAt: ago(60 * 20) },
      { id: 'm3', senderId: DEMO_ME, mine: true, body: 'J’essaie. Ma soupe de poisson est encore un projet en cours.', createdAt: ago(60 * 19) },
    ],
    'c-2': [
      { id: 'm4', senderId: 'demo-4', mine: false, body: 'Bonjour ! Yaël m’a dit que tu faisais de la céramique, c’est vrai ?', createdAt: ago(60 * 4) },
    ],
  } as Record<string, ChatMessage[]>,
  introsReceived: [
    { id: 'i-1', introducerId: 'demo-1', otherId: 'demo-6', note: 'Vous êtes tous les deux fous de randonnée et de cuisine marocaine. Je vous vois très bien discuter des heures.', myAnswer: 'pending' as 'pending' | 'accepted', createdAt: ago(60 * 30) },
  ],
  introsSent: [
    { id: 's-1', personA: 'demo-0', personB: 'demo-7', outcome: 'waiting' as const, createdAt: ago(60 * 48) },
  ] as { id: string; personA: string; personB: string; outcome: IntroductionSent['outcome']; createdAt: string }[],
  shabbat: { enabled: false, includeHolidays: true, candleLightingMins: 18, havdalahMins: null as number | null },
};

const hidden = (id: string) => state.blocked.some((b) => b.userId === id);
const wait = <T,>(v: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(v), ms));

// ── Croisés ────────────────────────────────────────────────────────────────
export const demo = {
  crossedSettings: () => wait({ enabled: state.crossedEnabled }),
  setCrossed: (enabled: boolean) => { state.crossedEnabled = enabled; return wait({ enabled }); },
  crossed: (): Promise<CrossedItem[]> => wait(state.crossedEnabled ? state.crossed.filter((c) => !hidden(c.userId)).map((c) => {
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
    .concat(PEOPLE.filter((p) => ['demo-1', 'demo-5', 'demo-7'].includes(p.id) && !hidden(p.id))),

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
