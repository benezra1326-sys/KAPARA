/**
 * Demo mode, ready to use by screens. Everything here is fictional and must
 * be shown with <DemoBadge /> (profiles) or the Live demo notice (calls).
 */
import type { ProfilePublic } from '@kapara/shared';
import { DEMO_PEOPLE, DEMO_VIEWER_KEY, demoUserId, personByKey } from './people';
import { DEMO_PROFILES, toPublicProfile } from './profiles';
import { DEMO_CONVERSATIONS, DEMO_CROSSED, DEMO_INTRODUCTIONS, DEMO_LIKES_RECEIVED, DEMO_LIVE, minutesAgo } from './scenarios';

export { DEMO_PICKS, DEMO_PROFILES, demoPicksIn, PROMPT_LABELS, toPublicProfile } from './profiles';
export { DEMO_CALL_SCRIPT } from './scenarios';
export { photoSource, isDemoImage } from './images';
export { DEMO_PEOPLE, DEMO_VIEWER_KEY, demoUserId } from './people';

const prof = (key: string): ProfilePublic => DEMO_PROFILES[demoUserId(key)]!;

/** The demo viewer ("me"), with all of their own answers, including private ones. */
export const DEMO_ME = { person: personByKey(DEMO_VIEWER_KEY), profile: toPublicProfile(personByKey(DEMO_VIEWER_KEY), true) };

export const demoCrossed = () => DEMO_CROSSED.map((c) => ({ profile: prof(c.key), times: c.times }));

export const demoLive = (now = new Date()) =>
  DEMO_LIVE.map((l) => ({ profile: prof(l.key), presence: l.presence, until: new Date(now.getTime() + l.availableForMinutes * 60_000) }));

export const demoConversations = (now = new Date()) =>
  DEMO_CONVERSATIONS.map((c) => ({
    id: c.id,
    with: toPublicProfile(personByKey(c.withKey), true),
    origin: c.origin.kind === 'introduction' ? { ...c.origin, introducer: prof(c.origin.introducerKey) } : c.origin,
    startedAt: minutesAgo(c.startedMinutesAgo, now),
    messages: c.messages.map((m, i) => ({ id: `${c.id}-${i}`, senderId: demoUserId(m.from), body: m.body, createdAt: minutesAgo(m.minutesAgo, now) })),
  })).sort((a, b) => (b.messages.at(-1)?.createdAt ?? b.startedAt).getTime() - (a.messages.at(-1)?.createdAt ?? a.startedAt).getTime());

export const demoIntroductions = (now = new Date()) =>
  DEMO_INTRODUCTIONS.map((i) => ({
    id: i.id, note: i.note, status: i.status, createdAt: minutesAgo(i.minutesAgo, now),
    introducer: prof(i.introducerKey), personA: prof(i.aKey), personB: prof(i.bKey),
    /** From the viewer's point of view. */
    role: i.introducerKey === DEMO_VIEWER_KEY ? ('introducer' as const) : ('introduced' as const),
  }));

export const demoLikesReceived = (now = new Date()) =>
  DEMO_LIKES_RECEIVED.map((l) => ({ ...l, from: prof(l.fromKey), createdAt: minutesAgo(l.minutesAgo, now) }));

/** Quick sanity numbers for the README and the back-office. */
export const DEMO_STATS = { people: DEMO_PEOPLE.length, conversations: DEMO_CONVERSATIONS.length, introductions: DEMO_INTRODUCTIONS.length };
