/**
 * Kindness nudge (benchmark: "nudge before sending a hurtful message").
 * A short, conservative list per launch language. A match never blocks a
 * message: the app asks "Send anyway?" and the member decides. No AI, no
 * storage, no logging of the message.
 */
const WORDS = [
  // fr
  'connard', 'connasse', 'salope', 'pute', 'petasse', 'pouffiasse', 'boudin', 'grosse vache', 'gros lard', 'tu es moche', 't es moche', 'tu es grosse', 't es grosse',
  'debile', 'abruti', 'abrutie', 'cretin', 'cretine', 'conne', 'pd', 'encule', 'batard', 'batarde',
  'ta gueule', 'ferme la', 'ferme ta gueule', 'va te faire', 'nique', 'niquer', 'tu vaux rien', 'personne voudra de toi',
  // en
  'bitch', 'slut', 'whore', 'ugly', 'fatso', 'stupid', 'idiot', 'moron', 'retard', 'loser', 'shut up', 'fuck you', 'fuck off',
  'nobody will want you',
  // he
  'זונה', 'מכוערת', 'מכוער', 'שמנה', 'סתום', 'סתמי', 'טיפש', 'טיפשה', 'מטומטם', 'מטומטמת', 'יא חתיכת',
];

const normalize = (s: string) =>
  ` ${s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

const PATTERNS = WORDS.map((w) => normalize(w));

/** True when the message may hurt. Whole words only ("grossesse" is fine). */
export function mayHurt(body: string): boolean {
  const text = normalize(body);
  return PATTERNS.some((p) => text.includes(p));
}
