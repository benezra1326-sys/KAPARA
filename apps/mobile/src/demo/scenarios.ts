/**
 * Demo interactions around the demo viewer (Ilan): today's picks, people
 * crossed, Live presence, conversations, introductions, reactions received.
 * Times are relative ("minutes ago") so the demo always looks current.
 * Plain TypeScript (no React Native) — also used by the database seed.
 */
import type { CallState } from '@kapara/shared';

export interface DemoPick { key: string; reasons: { key: string; params?: Record<string, string> }[] }

/** "Pour toi": a finite daily selection (RULES.dailyPicks = 8), each one explained. */
export const DEMO_PICKS_PLAN: DemoPick[] = [
  { key: 'lea', reasons: [{ key: 'shared.shabbat' }, { key: 'shared.relationshipIntent' }, { key: 'nearby' }] },
  { key: 'clara', reasons: [{ key: 'shared.practice' }, { key: 'shared.children' }] },
  { key: 'hannah', reasons: [{ key: 'shared.holidays' }, { key: 'shared.children' }] },
  { key: 'noemie', reasons: [{ key: 'shared.kashrutHome' }, { key: 'shared.traditionPlace' }] },
  { key: 'rachel', reasons: [{ key: 'shared.shabbat' }, { key: 'shared.languages', params: { value: 'he' } }] },
  { key: 'sarah', reasons: [{ key: 'shared.holidays' }, { key: 'shared.children' }] },
  { key: 'maya', reasons: [{ key: 'feedback.moreLikeThis' }, { key: 'nearby' }] },
  { key: 'judith', reasons: [{ key: 'crossedRecently' }, { key: 'shared.languages', params: { value: 'en' } }] },
];

/** "Croisés": never a place or a time, only that you crossed paths recently. */
export const DEMO_CROSSED: { key: string; times: number }[] = [
  { key: 'lea', times: 3 },
  { key: 'judith', times: 1 },
  { key: 'clara', times: 2 },
  { key: 'myriam', times: 1 },
  { key: 'ruben', times: 1 },
];

export type LivePresence = 'available' | 'busy';
/** "Live": who is available now. Each entry expires (RULES.livePresenceTtlSeconds). */
export const DEMO_LIVE: { key: string; presence: LivePresence; availableForMinutes: number }[] = [
  { key: 'maya', presence: 'available', availableForMinutes: 12 },
  { key: 'clara', presence: 'available', availableForMinutes: 4 },
  { key: 'daniel', presence: 'available', availableForMinutes: 9 },
  { key: 'naomi', presence: 'available', availableForMinutes: 14 },
  { key: 'tamar', presence: 'busy', availableForMinutes: 7 },
  { key: 'ruben', presence: 'busy', availableForMinutes: 3 },
];

/**
 * A scripted demo call so the Live screens can be shown end to end without
 * LiveKit. Each consent step is a separate state; nothing is transmitted.
 */
export const DEMO_CALL_SCRIPT: { state: CallState; afterMs: number }[] = [
  { state: 'invited', afterMs: 0 },
  { state: 'accepted', afterMs: 2500 },
  { state: 'connected', afterMs: 3500 },
  { state: 'video_requested', afterMs: 15000 },
  { state: 'video_on', afterMs: 18000 },
  { state: 'ended', afterMs: 60000 },
];

export type ConversationOrigin =
  | { kind: 'like'; target: 'photo' | 'prompt'; targetId: string; comment?: string; fromKey: string }
  | { kind: 'introduction'; introducerKey: string }
  | { kind: 'live'; callMinutes: number };

export interface DemoMessage { from: string; body: string; minutesAgo: number }
export interface DemoConversation { id: string; withKey: string; origin: ConversationOrigin; startedMinutesAgo: number; messages: DemoMessage[] }

/** Conversations: no read receipts, no typing indicators — by design. */
export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: 'demo-conv-lea', withKey: 'lea', startedMinutesAgo: 60 * 30,
    origin: { kind: 'like', target: 'prompt', targetId: 'ideal_shabbat_meal', fromKey: 'ilan', comment: 'Le débat jusqu’à minuit, c’est sur quel sujet en général ?' },
    messages: [
      { from: 'lea', body: 'Ça dépend des invités ! La semaine dernière : est-ce qu’on peut aimer une ville sans aimer son architecture.', minutesAgo: 60 * 29 },
      { from: 'ilan', body: 'Question piège pour une architecte. Et pour un ingénieur acoustique, la réponse est : ça dépend de comment elle sonne.', minutesAgo: 60 * 28 },
      { from: 'lea', body: 'Bonne réponse. Quelle est la ville qui sonne le mieux, alors ?', minutesAgo: 60 * 20 },
      { from: 'ilan', body: 'Venise, le matin, sans voitures. Et toi, la ville que tu aimes malgré son architecture ?', minutesAgo: 60 * 19 },
      { from: 'lea', body: 'Tel-Aviv. Le Bauhaus me réconcilie avec tout le reste.', minutesAgo: 60 * 3 },
      { from: 'lea', body: 'Il y a une expo sur la Ville blanche à la Cité de l’architecture. Ça te dirait, dimanche ?', minutesAgo: 45 },
    ],
  },
  {
    id: 'demo-conv-sarah', withKey: 'sarah', startedMinutesAgo: 60 * 24 * 4,
    origin: { kind: 'introduction', introducerKey: 'noam' },
    messages: [
      { from: 'sarah', body: 'Bonjour Ilan ! Noam m’a dit que tu chantais faux mais avec conviction. Je dirige une chorale, je suis intriguée.', minutesAgo: 60 * 24 * 4 },
      { from: 'ilan', body: 'Noam exagère toujours. Je chante juste, simplement dans une tonalité qui n’existe pas encore.', minutesAgo: 60 * 24 * 4 - 30 },
      { from: 'sarah', body: 'Voilà une réponse d’ingénieur. On en parle autour d’un café cette semaine ?', minutesAgo: 60 * 24 * 3 },
      { from: 'ilan', body: 'Avec plaisir. Jeudi après ta répétition ?', minutesAgo: 60 * 24 * 2 },
    ],
  },
  {
    id: 'demo-conv-clara', withKey: 'clara', startedMinutesAgo: 60 * 6,
    origin: { kind: 'live', callMinutes: 14 },
    messages: [
      { from: 'clara', body: 'Merci pour l’appel, c’était une jolie surprise pour un mardi soir.', minutesAgo: 60 * 5 },
      { from: 'ilan', body: 'Merci à toi. Je cherche toujours le nom de ce quatuor dont tu parlais.', minutesAgo: 60 * 4 },
      { from: 'clara', body: 'Le quatuor Ébène. Commence par le Debussy.', minutesAgo: 60 * 2 },
    ],
  },
  {
    id: 'demo-conv-hannah', withKey: 'hannah', startedMinutesAgo: 25,
    origin: { kind: 'like', target: 'prompt', targetId: 'currently_learning', fromKey: 'hannah', comment: 'Tu parles hébreu ? J’ai besoin d’un partenaire de conversation patient.' },
    messages: [],
  },
];

export type DemoIntroStatus = 'proposed' | 'accepted_by_a' | 'accepted_by_b' | 'connected' | 'declined' | 'expired';
export interface DemoIntroduction { id: string; introducerKey: string; aKey: string; bKey: string; note: string; status: DemoIntroStatus; minutesAgo: number }

/** Introductions are double opt-in: each person accepts separately. */
export const DEMO_INTRODUCTIONS: DemoIntroduction[] = [
  {
    id: 'demo-intro-sarah', introducerKey: 'noam', aKey: 'ilan', bKey: 'sarah', status: 'connected', minutesAgo: 60 * 24 * 5,
    note: 'Vous êtes les deux seules personnes que je connais qui écoutent vraiment la musique. Et vous cherchez la même chose.',
  },
  {
    id: 'demo-intro-noemie', introducerKey: 'esther', aKey: 'ilan', bKey: 'noemie', status: 'proposed', minutesAgo: 60 * 2,
    note: 'Noémie vient souvent à la librairie avec son fils. Elle est drôle, directe, et elle adore les longues tablées, comme toi.',
  },
  {
    id: 'demo-intro-thomas', introducerKey: 'ilan', aKey: 'thomas', bKey: 'benjamin', status: 'accepted_by_a', minutesAgo: 60 * 26,
    note: 'Thomas, Benjamin cuisine comme un chef et adore le cinéma. Benjamin, Thomas écrit sur le cinéma et mange comme un chef. Je pense que vous devriez vous rencontrer.',
  },
  {
    id: 'demo-intro-myriam', introducerKey: 'yael', aKey: 'ilan', bKey: 'myriam', status: 'expired', minutesAgo: 60 * 24 * 12,
    note: 'Vous aimez tous les deux les musiques du Moyen-Orient. Ça vaut au moins un café.',
  },
];

/** Reactions received but not answered yet ("Ils ont réagi"). */
export const DEMO_LIKES_RECEIVED: { fromKey: string; target: 'photo' | 'prompt'; targetId: string; comment?: string; minutesAgo: number }[] = [
  { fromKey: 'judith', target: 'prompt', targetId: 'perfect_sunday', comment: 'Un concert de quartier que personne ne connaît : j’en connais un, justement.', minutesAgo: 90 },
  { fromKey: 'deborah', target: 'photo', targetId: 'moment-0', minutesAgo: 60 * 8 },
  { fromKey: 'maya', target: 'prompt', targetId: 'family_recipe', comment: 'Et si on essayait de la refaire ensemble ?', minutesAgo: 60 * 20 },
];

export const minutesAgo = (m: number, now: Date = new Date()) => new Date(now.getTime() - m * 60_000);
