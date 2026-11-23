/**
 * KAPARA demo cast. Single source of truth for the offline app (src/demo) and
 * the database seed (apps/api/prisma/seed.ts imports this file).
 *
 * Rules:
 * - Every person is fictional and flagged isDemo. No real names, faces or data.
 * - Portraits are generated illustrations (see ./art), never photos of people.
 * - Jewish-life answers are what each fictional member chose to share, with a
 *   visibility per field. Some fields are left unanswered or "prefer not to say"
 *   on purpose: the app must handle them gracefully.
 * - Variety without caricature: practice, origins, ages, family situations and
 *   orientations differ, and no answer is implied by a name, face or city.
 *
 * Plain TypeScript only (no React Native imports) so Node can import it.
 */
import type { JewishLife } from '@kapara/shared';

export type Gender = 'woman' | 'man' | 'nonbinary';
export type Visibility = 'private' | 'matches' | 'members';

type Field<T> = { value: T | null; preferNotToSay: boolean; note?: string; visibility: Visibility; useForMatching: boolean };
type Answers = { [K in keyof JewishLife]?: Field<NonNullable<JewishLife[K]['value']>> };

/** Shared answer. Visibility defaults to "members"; matching only when shared for it. */
const s = <T>(value: T, visibility: Visibility = 'members', note?: string): Field<T> => ({
  value, preferNotToSay: false, visibility, useForMatching: visibility !== 'private', ...(note ? { note } : {}),
});
/** Answered but kept for myself (not used for matching, not shown). */
const priv = <T>(value: T): Field<T> => ({ value, preferNotToSay: false, visibility: 'private', useForMatching: false });
/** Explicit "I'd rather not say". */
const pnts = <T>(): Field<T> => ({ value: null, preferNotToSay: true, visibility: 'private', useForMatching: false });

export type HairStyle = 'short' | 'curly' | 'long' | 'bun' | 'wavy' | 'buzz' | 'bob' | 'coils' | 'ponytail';
export type Scene = 'candlelight' | 'dusk' | 'garden' | 'sea' | 'studio' | 'library' | 'terrace' | 'night';
export type MomentKind = 'candles' | 'coffee' | 'sea' | 'rooftops' | 'books' | 'flowers' | 'ceramics' | 'vinyl' | 'bread' | 'boat' | 'mountains' | 'citrus';

export interface PortraitSpec {
  skin: number; // 0 (lightest) … 7 (deepest)
  hair: HairStyle;
  hairColor: 'black' | 'darkBrown' | 'brown' | 'auburn' | 'blond' | 'grey' | 'white';
  outfit: string; // hex
  scene: Scene;
  glasses?: boolean;
  beard?: boolean;
  earrings?: boolean;
  /** Horizontal offset of the head, -1 … 1, for variety. */
  lean?: number;
}

export interface DemoPerson {
  key: string;
  firstName: string;
  gender: Gender;
  seeks: Gender[];
  birthDate: string; // ISO date
  /** A region code from REGIONS (@kapara/config). */
  regionCode: string;
  languages: string[];
  headline: string;
  verified: boolean;
  jewishLife: Answers;
  prompts: { id: string; answer: string }[];
  portrait: PortraitSpec;
  moments: { kind: MomentKind; caption: string }[];
  privacy: { crossedEnabled: boolean; liveEnabled: boolean; liveCallsFrom: 'nobody' | 'matches' | 'members'; introducible: boolean };
  preferences: { ageMin: number; ageMax: number; maxDistanceKm: number };
}

const open = { crossedEnabled: true, liveEnabled: true, liveCallsFrom: 'members' as const, introducible: true };
const careful = { crossedEnabled: false, liveEnabled: true, liveCallsFrom: 'matches' as const, introducible: true };
const quiet = { crossedEnabled: true, liveEnabled: false, liveCallsFrom: 'nobody' as const, introducible: true };

export const DEMO_PEOPLE: DemoPerson[] = [
  // ——— Paris ———
  {
    key: 'ilan', firstName: 'Ilan', gender: 'man', seeks: ['woman'], birthDate: '1993-03-08', regionCode: 'fr-paris',
    languages: ['fr', 'en', 'he'], headline: 'Ingénieur acoustique, j’écoute les salles de concert avant leur ouverture', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner', 'members', 'Le vendredi soir chez mes parents, presque toujours.'),
      holidays: s('all_major'), kashrutHome: s('kosher_home_flexible_out', 'matches'), kashrutOutside: s('no_pork_seafood', 'matches'),
      community: s('holidays'), traditionPlace: s('important'), culturalBackground: s(['Sépharade', 'Tunisie']),
      relationshipIntent: s('long_term'), children: s('want', 'matches'),
    },
    prompts: [
      { id: 'perfect_sunday', answer: 'Un marché, un vélo, et un concert de quartier que personne ne connaît encore.' },
      { id: 'family_recipe', answer: 'La boulette de ma grand-mère, que personne n’a jamais réussi à refaire à l’identique.' },
    ],
    portrait: { skin: 3, hair: 'short', hairColor: 'black', outfit: '#2F3E46', scene: 'studio', beard: true, lean: -0.2 },
    moments: [{ kind: 'vinyl', caption: 'Ma collection, triée par émotion plutôt que par ordre alphabétique.' }, { kind: 'rooftops', caption: 'Vue depuis un chantier de salle de concert.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 40, maxDistanceKm: 20 },
  },
  {
    key: 'lea', firstName: 'Léa', gender: 'woman', seeks: ['man'], birthDate: '1994-06-15', regionCode: 'fr-paris',
    languages: ['fr', 'en'], headline: 'Architecte, toujours un carnet dans le sac', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('kosher_home_flexible_out', 'matches'), community: s('holidays'), culturalBackground: s(['Ashkénaze']),
      relationshipIntent: s('long_term'), children: s('want', 'matches'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Une grande tablée, des hallot encore tièdes et un débat qui dure jusqu’à minuit.' },
      { id: 'together_we_could', answer: 'Dessiner le plan de la maison idéale, puis se disputer sur l’emplacement de la cuisine.' },
      { id: 'currently_learning', answer: 'Le chant. Mes voisins sont très patients.' },
    ],
    portrait: { skin: 1, hair: 'wavy', hairColor: 'brown', outfit: '#C9A27E', scene: 'terrace', earrings: true, lean: 0.15 },
    moments: [{ kind: 'bread', caption: 'Mes premières hallot. Pas parfaites, mais fières.' }, { kind: 'rooftops', caption: 'Croquis du jour depuis Belleville.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 15 },
  },
  {
    key: 'sarah', firstName: 'Sarah', gender: 'woman', seeks: ['man'], birthDate: '1996-02-21', regionCode: 'fr-paris',
    languages: ['fr', 'he', 'en'], headline: 'Pédiatre, chorale le jeudi soir', verified: true,
    jewishLife: {
      practice: s('modern_orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), kashrutOutside: s('strict_home_and_out'), community: s('weekly'),
      communityName: s('Une communauté du 17e', 'matches'), traditionPlace: s('central'),
      relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'favorite_holiday', answer: 'Souccot : dîner dehors, guirlandes, et toute la famille entassée sous la cabane.' },
      { id: 'green_flag', answer: 'Quelqu’un qui sait écouter jusqu’au bout avant de répondre.' },
    ],
    portrait: { skin: 2, hair: 'long', hairColor: 'darkBrown', outfit: '#6B4E71', scene: 'garden', lean: -0.1 },
    moments: [{ kind: 'flowers', caption: 'Le bouquet de la semaine, toujours pour vendredi.' }, { kind: 'candles', caption: 'Mon moment préféré de la semaine.' }],
    privacy: careful, preferences: { ageMin: 26, ageMax: 35, maxDistanceKm: 25 },
  },
  {
    key: 'rachel', firstName: 'Rachel', gender: 'woman', seeks: ['man'], birthDate: '1992-11-02', regionCode: 'fr-paris',
    languages: ['fr', 'he', 'en'], headline: 'Je traduis des romans israéliens en français', verified: false,
    jewishLife: {
      practice: s('liberal_reform'), partnerImportance: s('open_to_jewish_life'), shabbat: s('friday_dinner'), holidays: s('some'),
      kashrutHome: s('vegetarian_for_kashrut', 'members', 'Végétarienne, ça règle beaucoup de questions.'), community: s('monthly'),
      culturalBackground: s(['Ashkénaze', 'Pologne']), relationshipIntent: s('long_term'), children: s('open'),
    },
    prompts: [
      { id: 'favorite_tradition', answer: 'Allumer les bougies, même seule, même en voyage.' },
      { id: 'teach_me', answer: 'Un mot d’argot que je ne connais pas encore. J’en collectionne.' },
    ],
    portrait: { skin: 0, hair: 'bob', hairColor: 'auburn', outfit: '#3E5C76', scene: 'library', glasses: true },
    moments: [{ kind: 'books', caption: 'La pile « à traduire ». Elle ne diminue jamais.' }, { kind: 'coffee', caption: 'Bureau du matin.' }],
    privacy: open, preferences: { ageMin: 30, ageMax: 42, maxDistanceKm: 20 },
  },
  {
    key: 'maya', firstName: 'Maya', gender: 'woman', seeks: ['man'], birthDate: '1998-09-10', regionCode: 'fr-paris',
    languages: ['fr', 'en'], headline: 'Céramiste, lève-tôt assumée', verified: true,
    jewishLife: {
      practice: s('exploring', 'members', 'J’ai découvert Shabbat chez une amie il y a deux ans, et j’y prends goût.'),
      partnerImportance: s('open_to_jewish_life'), shabbat: s('sometimes'), holidays: s('some'), kashrutHome: s('other', 'members', 'Je m’y intéresse, sans règle fixe.'),
      relationshipIntent: s('see_where_it_goes'), children: pnts(),
    },
    prompts: [
      { id: 'teach_me', answer: 'Apprends-moi le backgammon, je t’apprends le tour de potier.' },
      { id: 'makes_me_laugh', answer: 'Les bols ratés qui finissent en pots à crayons pour toute ma famille.' },
    ],
    portrait: { skin: 4, hair: 'curly', hairColor: 'black', outfit: '#B5651D', scene: 'studio', earrings: true, lean: 0.25 },
    moments: [{ kind: 'ceramics', caption: 'La série de printemps, cuite hier.' }, { kind: 'citrus', caption: 'Nature morte improvisée à l’atelier.' }],
    privacy: open, preferences: { ageMin: 25, ageMax: 34, maxDistanceKm: 10 },
  },
  {
    key: 'ines', firstName: 'Inès', gender: 'woman', seeks: ['woman'], birthDate: '1991-04-27', regionCode: 'fr-paris',
    languages: ['fr', 'en', 'es'], headline: 'Avocate en droit social, nageuse du dimanche', verified: true,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('important'), shabbat: s('family_occasions'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Sépharade', 'Algérie']), traditionPlace: s('occasional'),
      relationshipIntent: s('long_term'), children: s('open', 'matches'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Chez ma mère, avec la t’fina qui a cuit toute la nuit.' },
      { id: 'best_advice', answer: '« Ne signe rien que tu n’as pas lu deux fois. » Valable aussi hors du bureau.' },
    ],
    portrait: { skin: 3, hair: 'ponytail', hairColor: 'darkBrown', outfit: '#1F4E5F', scene: 'sea' },
    moments: [{ kind: 'sea', caption: 'Dernière baignade de septembre.' }, { kind: 'books', caption: 'Lecture de vacances, enfin pas de code du travail.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 40, maxDistanceKm: 20 },
  },
  {
    key: 'yael', firstName: 'Yaël', gender: 'woman', seeks: ['woman'], birthDate: '1989-12-12', regionCode: 'fr-paris',
    languages: ['fr', 'he'], headline: 'Cheffe pâtissière, j’ai toujours de la farine quelque part', verified: false,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), community: s('events_only'), culturalBackground: s(['Sépharade', 'Maroc']),
      relationshipIntent: s('long_term'), children: s('want', 'matches'),
    },
    prompts: [
      { id: 'family_recipe', answer: 'Les cigares aux amandes de Pourim. Je garde la recette pour le troisième rendez-vous.' },
      { id: 'perfect_sunday', answer: 'Grasse matinée (enfin), puis brunch que je n’ai pas préparé moi-même.' },
    ],
    portrait: { skin: 4, hair: 'bun', hairColor: 'black', outfit: '#E8D8C4', scene: 'candlelight', earrings: true, lean: -0.15 },
    moments: [{ kind: 'bread', caption: 'Fournée du vendredi matin.' }, { kind: 'citrus', caption: 'Écorces confites, saison des oranges.' }],
    privacy: careful, preferences: { ageMin: 30, ageMax: 42, maxDistanceKm: 15 },
  },
  {
    key: 'judith', firstName: 'Judith', gender: 'woman', seeks: ['man'], birthDate: '1990-01-30', regionCode: 'fr-paris',
    languages: ['fr', 'en', 'ar'], headline: 'Documentariste, je filme les musiciens qu’on n’entend plus', verified: true,
    jewishLife: {
      practice: s('secular'), partnerImportance: s('not_a_criterion'), shabbat: s('not_currently'), holidays: s('cultural_only'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Maroc']), traditionPlace: s('personal_choice'),
      relationshipIntent: s('see_where_it_goes'), children: s('not_sure'),
    },
    prompts: [
      { id: 'project_excited_about', answer: 'Un documentaire sur les musiciens judéo-marocains de Paris, des années 60 à aujourd’hui.' },
      { id: 'together_we_could', answer: 'Écumer les disquaires du 11e et revenir avec un seul disque, après débat.' },
    ],
    portrait: { skin: 3, hair: 'curly', hairColor: 'darkBrown', outfit: '#7A2E2E', scene: 'night', lean: 0.1 },
    moments: [{ kind: 'vinyl', caption: 'Trouvé aux puces de Saint-Ouen, 1964.' }, { kind: 'rooftops', caption: 'Repérage pour un plan de nuit.' }],
    privacy: open, preferences: { ageMin: 30, ageMax: 44, maxDistanceKm: 20 },
  },
  {
    key: 'noemie', firstName: 'Noémie', gender: 'woman', seeks: ['man'], birthDate: '1987-07-19', regionCode: 'fr-paris',
    languages: ['fr', 'en'], headline: 'Infirmière, maman d’un petit garçon de 6 ans', verified: true,
    jewishLife: {
      practice: s('masorti'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('monthly'), traditionPlace: s('important'),
      relationshipIntent: s('long_term'), children: s('have_and_want_more', 'members', 'Mon fils passe avant tout, et il adore les grandes tablées.'),
    },
    prompts: [
      { id: 'green_flag', answer: 'Quelqu’un qui ne fuit pas quand il entend « garde alternée ».' },
      { id: 'favorite_holiday', answer: 'Hanoukka, pour les beignets et les yeux de mon fils devant les bougies.' },
    ],
    portrait: { skin: 1, hair: 'long', hairColor: 'blond', outfit: '#5F7A61', scene: 'garden', lean: 0.2 },
    moments: [{ kind: 'candles', caption: 'Huitième soir.' }, { kind: 'mountains', caption: 'Randonnée en famille dans les Alpes.' }],
    privacy: careful, preferences: { ageMin: 33, ageMax: 46, maxDistanceKm: 20 },
  },
  {
    key: 'hannah', firstName: 'Hannah', gender: 'woman', seeks: ['man'], birthDate: '1995-05-05', regionCode: 'fr-paris',
    languages: ['fr', 'de', 'en'], headline: 'Data scientist, je fais parler les chiffres de la santé publique', verified: true,
    jewishLife: {
      practice: s('liberal_reform', 'members', 'Juive par choix depuis quelques années, et heureuse de l’être.'),
      partnerImportance: s('essential'), shabbat: s('friday_dinner'), holidays: s('all_major'), kashrutHome: s('no_pork_seafood'),
      community: s('weekly'), culturalBackground: s(['Juive par choix']), relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'currently_learning', answer: 'L’hébreu, avec une application et beaucoup de post-it.' },
      { id: 'favorite_tradition', answer: 'La havdala : une flamme, une odeur, et la semaine qui recommence.' },
    ],
    portrait: { skin: 0, hair: 'ponytail', hairColor: 'blond', outfit: '#264653', scene: 'library', glasses: true, lean: -0.1 },
    moments: [{ kind: 'books', caption: 'Mes cahiers d’hébreu, très colorés.' }, { kind: 'coffee', caption: 'Le café du dimanche avant l’étude.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 37, maxDistanceKm: 20 },
  },
  {
    key: 'deborah', firstName: 'Déborah', gender: 'woman', seeks: ['man'], birthDate: '1999-10-03', regionCode: 'fr-paris',
    languages: ['fr', 'he', 'en'], headline: 'Interne en médecine, entre deux gardes', verified: false,
    jewishLife: {
      practice: s('orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), kashrutOutside: s('strict_home_and_out'), community: s('weekly'), traditionPlace: s('central'),
      relationshipIntent: s('marriage'), children: pnts(),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Chez nous, avec des invités qu’on ne connaissait pas le matin même.' },
      { id: 'makes_me_laugh', answer: 'Mon petit frère quand il imite nos professeurs.' },
    ],
    portrait: { skin: 2, hair: 'long', hairColor: 'black', outfit: '#1D3557', scene: 'candlelight', lean: 0.1 },
    moments: [{ kind: 'candles', caption: 'Vendredi, enfin.' }, { kind: 'flowers', caption: 'Le jardin de mes parents.' }],
    privacy: { crossedEnabled: false, liveEnabled: false, liveCallsFrom: 'nobody', introducible: true },
    preferences: { ageMin: 24, ageMax: 32, maxDistanceKm: 30 },
  },
  {
    key: 'myriam', firstName: 'Myriam', gender: 'woman', seeks: ['man'], birthDate: '1984-08-22', regionCode: 'fr-paris',
    languages: ['fr', 'ar', 'en'], headline: 'Cheffe de projet culturel, je programme des festivals', verified: true,
    jewishLife: {
      practice: s('spiritual'), partnerImportance: s('important'), shabbat: s('sometimes'), holidays: s('some'),
      kashrutHome: priv('no_pork_seafood'), culturalBackground: s(['Mizrahi', 'Irak']), traditionPlace: s('important'),
      relationshipIntent: s('long_term'), children: s('open', 'matches'),
    },
    prompts: [
      { id: 'favorite_tradition', answer: 'Le seder chez ma tante, avec les chants en judéo-arabe que personne d’autre ne connaît.' },
      { id: 'project_excited_about', answer: 'Un festival de musiques du Moyen-Orient dans des cours d’immeubles.' },
    ],
    portrait: { skin: 5, hair: 'wavy', hairColor: 'black', outfit: '#9C6644', scene: 'dusk', earrings: true },
    moments: [{ kind: 'citrus', caption: 'Ce qu’il reste du marché.' }, { kind: 'vinyl', caption: 'La programmation de l’été se fait comme ça.' }],
    privacy: open, preferences: { ageMin: 36, ageMax: 50, maxDistanceKm: 20 },
  },
  {
    key: 'clara', firstName: 'Clara', gender: 'woman', seeks: ['man'], birthDate: '1993-04-14', regionCode: 'fr-paris',
    languages: ['fr', 'it', 'en'], headline: 'Violoncelliste dans un orchestre de chambre', verified: true,
    jewishLife: {
      practice: s('masorti'), partnerImportance: s('important'), shabbat: s('sometimes'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('no_pork_seafood'), community: s('holidays'), culturalBackground: s(['Ashkénaze', 'Italie']),
      relationshipIntent: s('long_term'), children: s('want', 'matches'),
    },
    prompts: [
      { id: 'together_we_could', answer: 'Aller écouter une répétition générale et critiquer le chef à voix basse.' },
      { id: 'perfect_sunday', answer: 'Trois heures de musique, puis une très longue promenade sans téléphone.' },
    ],
    portrait: { skin: 1, hair: 'curly', hairColor: 'auburn', outfit: '#3D405B', scene: 'studio', lean: 0.15 },
    moments: [{ kind: 'vinyl', caption: 'Bach, comme toujours.' }, { kind: 'sea', caption: 'Tournée d’été, Trieste.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 20 },
  },
  {
    key: 'esther', firstName: 'Esther', gender: 'woman', seeks: ['man'], birthDate: '1975-02-11', regionCode: 'fr-paris',
    languages: ['fr', 'en', 'yi'], headline: 'Libraire, deux grands enfants, une curiosité intacte', verified: true,
    jewishLife: {
      practice: s('liberal_reform'), partnerImportance: s('open_to_jewish_life'), shabbat: s('friday_dinner'), holidays: s('some'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Ashkénaze']), relationshipIntent: s('long_term'), children: s('have_no_more'),
    },
    prompts: [
      { id: 'best_advice', answer: 'Mon grand-père disait : « Un livre prêté est un ami en voyage. »' },
      { id: 'teach_me', answer: 'À aimer le football. On peut toujours essayer.' },
    ],
    portrait: { skin: 1, hair: 'bob', hairColor: 'grey', outfit: '#8E2433', scene: 'library', glasses: true, earrings: true },
    moments: [{ kind: 'books', caption: 'La vitrine de la rentrée.' }, { kind: 'flowers', caption: 'Mon balcon, ma fierté.' }],
    privacy: quiet, preferences: { ageMin: 45, ageMax: 62, maxDistanceKm: 25 },
  },
  {
    key: 'noam', firstName: 'Noam', gender: 'man', seeks: ['woman'], birthDate: '1991-08-08', regionCode: 'fr-paris',
    languages: ['fr', 'en', 'he'], headline: 'Ingénieur naval, je restaure un voilier le week-end', verified: true,
    jewishLife: {
      practice: s('masorti'), partnerImportance: s('important'), shabbat: s('sometimes'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), community: s('holidays'), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'project_excited_about', answer: 'Je restaure un vieux voilier avec mon frère. Il flottera, promis.' },
      { id: 'green_flag', answer: 'Quelqu’un qui dit « je ne sais pas » sans gêne.' },
    ],
    portrait: { skin: 2, hair: 'wavy', hairColor: 'brown', outfit: '#E9C46A', scene: 'sea', beard: true, lean: -0.2 },
    moments: [{ kind: 'boat', caption: 'Elle s’appelle Hirondelle. Elle a 52 ans.' }, { kind: 'sea', caption: 'Premier essai en mer.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 36, maxDistanceKm: 20 },
  },
  {
    key: 'david', firstName: 'David', gender: 'man', seeks: ['woman'], birthDate: '1989-05-23', regionCode: 'fr-paris',
    languages: ['fr', 'en'], headline: 'Chargé de production au théâtre', verified: false,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('open_to_jewish_life'), shabbat: s('family_occasions'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Ashkénaze', 'Sépharade']), relationshipIntent: s('see_where_it_goes'), children: s('open'),
    },
    prompts: [
      { id: 'makes_me_laugh', answer: 'Les imitations de ma grand-mère par ma sœur. Imbattables.' },
      { id: 'family_recipe', answer: 'Le gefilte fish d’un côté, la boulette de l’autre. Les fêtes chez nous sont un sommet diplomatique.' },
    ],
    portrait: { skin: 2, hair: 'curly', hairColor: 'darkBrown', outfit: '#2A9D8F', scene: 'night', glasses: true },
    moments: [{ kind: 'rooftops', caption: 'Après la première, sur le toit du théâtre.' }, { kind: 'coffee', caption: 'Le café de la régie.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 40, maxDistanceKm: 20 },
  },
  {
    key: 'raphael', firstName: 'Raphaël', gender: 'man', seeks: ['woman'], birthDate: '1997-12-01', regionCode: 'fr-paris',
    languages: ['fr', 'he'], headline: 'Kinésithérapeute, coureur de semi-marathons', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('essential'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('monthly'), culturalBackground: s(['Sépharade', 'Maroc']),
      relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Couscous de ma tante, puis balade sur les quais.' },
      { id: 'currently_learning', answer: 'La guitare, pour accompagner les chants de Shabbat sans tout massacrer.' },
    ],
    portrait: { skin: 4, hair: 'buzz', hairColor: 'black', outfit: '#E76F51', scene: 'terrace', beard: true },
    moments: [{ kind: 'mountains', caption: 'Trail dans le Vercors.' }, { kind: 'citrus', caption: 'Oranges du marché pour la tante.' }],
    privacy: open, preferences: { ageMin: 23, ageMax: 30, maxDistanceKm: 25 },
  },
  {
    key: 'eli', firstName: 'Eli', gender: 'man', seeks: ['woman'], birthDate: '1993-01-17', regionCode: 'fr-paris',
    languages: ['fr', 'he', 'en'], headline: 'Professeur de mathématiques en lycée', verified: true,
    jewishLife: {
      practice: s('orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), kashrutOutside: s('strict_home_and_out'), community: s('weekly'), traditionPlace: s('central'),
      relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'green_flag', answer: 'Quelqu’un qui rappelle sa mère juste pour lui raconter sa journée.' },
      { id: 'teach_me', answer: 'N’importe quoi, sauf les maths. Là, c’est moi qui explique.' },
    ],
    portrait: { skin: 1, hair: 'short', hairColor: 'brown', outfit: '#1E1A24', scene: 'library', glasses: true, beard: true, lean: 0.1 },
    moments: [{ kind: 'books', caption: 'L’étude du soir.' }, { kind: 'candles', caption: 'Chez mes parents, vendredi.' }],
    privacy: careful, preferences: { ageMin: 24, ageMax: 32, maxDistanceKm: 20 },
  },
  {
    key: 'thomas', firstName: 'Thomas', gender: 'man', seeks: ['man'], birthDate: '1990-10-09', regionCode: 'fr-paris',
    languages: ['fr', 'en'], headline: 'Journaliste culture, amateur de cinéma muet', verified: true,
    jewishLife: {
      practice: s('liberal_reform'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('some'),
      kashrutHome: s('not_kosher'), community: s('monthly'), communityName: s('Une communauté libérale parisienne', 'matches'),
      relationshipIntent: s('long_term'), children: s('open', 'matches'),
    },
    prompts: [
      { id: 'together_we_could', answer: 'Voir un film muet avec orchestre, puis inventer les dialogues au dîner.' },
      { id: 'favorite_holiday', answer: 'Pessah, parce que le seder est le meilleur format de débat jamais inventé.' },
    ],
    portrait: { skin: 0, hair: 'short', hairColor: 'blond', outfit: '#6D597A', scene: 'dusk', lean: -0.15 },
    moments: [{ kind: 'vinyl', caption: 'Bande originale d’un film de 1927.' }, { kind: 'coffee', caption: 'Bouclage.' }],
    privacy: open, preferences: { ageMin: 30, ageMax: 42, maxDistanceKm: 15 },
  },
  {
    key: 'benjamin', firstName: 'Benjamin', gender: 'man', seeks: ['man'], birthDate: '1986-03-30', regionCode: 'fr-paris',
    languages: ['fr', 'en', 'he'], headline: 'Médecin urgentiste, cuisinier du dimanche', verified: true,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('open_to_jewish_life'), shabbat: s('family_occasions'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Sépharade', 'Tunisie']), relationshipIntent: s('long_term'), children: s('not_sure'),
    },
    prompts: [
      { id: 'family_recipe', answer: 'La pkaïla de mon père. Sept heures de cuisson, aucune concession.' },
      { id: 'perfect_sunday', answer: 'Après une garde : dormir, puis cuisiner pour dix.' },
    ],
    portrait: { skin: 3, hair: 'buzz', hairColor: 'grey', outfit: '#457B9D', scene: 'terrace', beard: true },
    moments: [{ kind: 'bread', caption: 'Pain maison, test numéro 14.' }, { kind: 'sea', caption: 'Djerba, l’été dernier.' }],
    privacy: careful, preferences: { ageMin: 32, ageMax: 46, maxDistanceKm: 20 },
  },
  {
    key: 'sacha', firstName: 'Sacha', gender: 'nonbinary', seeks: ['woman', 'man', 'nonbinary'], birthDate: '1996-06-06', regionCode: 'fr-paris',
    languages: ['fr', 'ru', 'en'], headline: 'Illustrateur·rice jeunesse', verified: false,
    jewishLife: {
      practice: s('exploring'), partnerImportance: s('open_to_jewish_life'), shabbat: s('sometimes'), holidays: s('some'),
      culturalBackground: s(['Ashkénaze', 'Russie']), traditionPlace: s('personal_choice'),
      relationshipIntent: s('friendship_first'), children: s('not_sure', 'private'),
    },
    prompts: [
      { id: 'currently_learning', answer: 'Le yiddish de mon arrière-grand-mère, à partir de ses lettres.' },
      { id: 'teach_me', answer: 'Ta chanson préférée, je t’en fais un dessin.' },
    ],
    portrait: { skin: 1, hair: 'short', hairColor: 'auburn', outfit: '#A8DADC', scene: 'studio', earrings: true, lean: 0.2 },
    moments: [{ kind: 'flowers', caption: 'Modèle pour une page d’album.' }, { kind: 'books', caption: 'Mes carnets de croquis.' }],
    privacy: open, preferences: { ageMin: 24, ageMax: 36, maxDistanceKm: 15 },
  },
  {
    key: 'samuel', firstName: 'Samuel', gender: 'man', seeks: ['woman'], birthDate: '1980-09-14', regionCode: 'fr-paris',
    languages: ['fr', 'he', 'am'], headline: 'Paysagiste, père de deux ados', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('monthly'), culturalBackground: s(['Beta Israel', 'Éthiopie']),
      traditionPlace: s('important'), relationshipIntent: s('long_term'), children: s('have_no_more'),
    },
    prompts: [
      { id: 'favorite_holiday', answer: 'Sigd, et Pessah : les deux me ramènent à mes parents.' },
      { id: 'best_advice', answer: 'Planter un arbre pour quelqu’un qu’on ne connaîtra jamais.' },
    ],
    portrait: { skin: 7, hair: 'coils', hairColor: 'black', outfit: '#606C38', scene: 'garden', beard: true, lean: -0.1 },
    moments: [{ kind: 'flowers', caption: 'Un jardin partagé que j’ai dessiné.' }, { kind: 'mountains', caption: 'Avec mes enfants, l’été dernier.' }],
    privacy: open, preferences: { ageMin: 36, ageMax: 50, maxDistanceKm: 30 },
  },
  {
    key: 'ruben', firstName: 'Ruben', gender: 'man', seeks: ['woman'], birthDate: '1994-11-20', regionCode: 'fr-paris',
    languages: ['fr', 'es', 'en'], headline: 'Développeur, guitariste flamenco amateur', verified: false,
    jewishLife: {
      practice: pnts(), partnerImportance: s('open_to_jewish_life'), shabbat: s('sometimes'),
      culturalBackground: s(['Sépharade', 'Argentine']), relationshipIntent: s('not_sure_yet'),
    },
    prompts: [
      { id: 'together_we_could', answer: 'Trouver le meilleur empanada de Paris. J’ai une liste.' },
      { id: 'makes_me_laugh', answer: 'Les messages vocaux de ma mère, toujours trois minutes minimum.' },
    ],
    portrait: { skin: 2, hair: 'long', hairColor: 'darkBrown', outfit: '#BC4749', scene: 'night', beard: true, lean: 0.2 },
    moments: [{ kind: 'vinyl', caption: 'Paco, toujours.' }, { kind: 'coffee', caption: 'Mate ou café, selon l’humeur.' }],
    privacy: open, preferences: { ageMin: 25, ageMax: 35, maxDistanceKm: 15 },
  },

  // ——— International (regions not launched yet: visible in Live only) ———
  {
    key: 'daniel', firstName: 'Daniel', gender: 'man', seeks: ['woman'], birthDate: '1990-07-07', regionCode: 'gb-london',
    languages: ['en', 'he', 'fr'], headline: 'Product designer, Sunday baker', verified: true,
    jewishLife: {
      practice: s('masorti'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('monthly'), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'perfect_sunday', answer: 'Columbia Road flowers, a long walk, and bagels that I definitely did not overproof.' },
      { id: 'together_we_could', answer: 'Host a Friday night dinner for friends who have never been to one.' },
    ],
    portrait: { skin: 1, hair: 'wavy', hairColor: 'brown', outfit: '#2B2D42', scene: 'dusk', glasses: true },
    moments: [{ kind: 'bread', caption: 'Bagels, attempt three.' }, { kind: 'flowers', caption: 'Sunday market haul.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 37, maxDistanceKm: 25 },
  },
  {
    key: 'naomi', firstName: 'Naomi', gender: 'woman', seeks: ['man'], birthDate: '1993-03-18', regionCode: 'gb-london',
    languages: ['en', 'he'], headline: 'Solicitor, choir alto, terrible at chess', verified: true,
    jewishLife: {
      practice: s('modern_orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), community: s('weekly'), relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Long lunch, too many salads, and a walk on the Heath afterwards.' },
      { id: 'teach_me', answer: 'Chess. Please. I keep losing to my nephew.' },
    ],
    portrait: { skin: 5, hair: 'bun', hairColor: 'black', outfit: '#9D4EDD', scene: 'garden', earrings: true },
    moments: [{ kind: 'flowers', caption: 'Hampstead in spring.' }, { kind: 'books', caption: 'Holiday reading list.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 20 },
  },
  {
    key: 'tamar', firstName: 'Tamar', gender: 'woman', seeks: ['man'], birthDate: '1994-04-04', regionCode: 'il-tel-aviv',
    languages: ['he', 'en', 'fr'], headline: 'ביולוגית ימית, צוללת בכל הזדמנות', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), culturalBackground: s(['Mizrahi', 'Yémen']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'ארוחת שישי אצל סבתא, ואחר כך ים.' },
      { id: 'project_excited_about', answer: 'מחקר על שוניות האלמוגים באילת.' },
    ],
    portrait: { skin: 5, hair: 'curly', hairColor: 'black', outfit: '#00838F', scene: 'sea', lean: -0.2 },
    moments: [{ kind: 'sea', caption: 'אילת, שש בבוקר.' }, { kind: 'citrus', caption: 'שוק הכרמל.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 30 },
  },
  {
    key: 'omer', firstName: 'Omer', gender: 'man', seeks: ['woman'], birthDate: '1992-02-02', regionCode: 'il-tel-aviv',
    languages: ['he', 'en'], headline: 'שף במסעדה קטנה ביפו', verified: false,
    jewishLife: {
      practice: s('secular'), partnerImportance: s('not_a_criterion'), shabbat: s('family_occasions'), holidays: s('cultural_only'),
      kashrutHome: s('not_kosher'), relationshipIntent: s('see_where_it_goes'), children: s('open'),
    },
    prompts: [
      { id: 'family_recipe', answer: 'החמין של אבא שלי. סוד משפחתי.' },
      { id: 'perfect_sunday', answer: 'שוק, בישול, ושינה על החוף.' },
    ],
    portrait: { skin: 3, hair: 'short', hairColor: 'darkBrown', outfit: '#F4A261', scene: 'terrace', beard: true },
    moments: [{ kind: 'citrus', caption: 'מנה חדשה בעבודה.' }, { kind: 'sea', caption: 'יפו בשקיעה.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 30 },
  },
  {
    key: 'ari', firstName: 'Ari', gender: 'man', seeks: ['woman'], birthDate: '1988-12-24', regionCode: 'us-new-york',
    languages: ['en', 'es'], headline: 'Architect, rebuilding old Brooklyn brownstones', verified: true,
    jewishLife: {
      practice: s('liberal_reform'), partnerImportance: s('important'), shabbat: s('sometimes'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), community: s('holidays'), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'together_we_could', answer: 'Walk the whole length of Broadway and rate every bagel on the way.' },
      { id: 'best_advice', answer: 'Measure twice, apologise once.' },
    ],
    portrait: { skin: 2, hair: 'short', hairColor: 'black', outfit: '#3A5A40', scene: 'night', glasses: true, beard: true },
    moments: [{ kind: 'rooftops', caption: 'Brooklyn from a job site.' }, { kind: 'coffee', caption: 'Drafting, 7 a.m.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 40, maxDistanceKm: 30 },
  },
  {
    key: 'rebecca', firstName: 'Rebecca', gender: 'woman', seeks: ['man'], birthDate: '1995-08-29', regionCode: 'us-new-york',
    languages: ['en', 'fr'], headline: 'Book editor, amateur potter, loyal to one deli', verified: true,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('some'),
      kashrutHome: priv('not_kosher'), culturalBackground: s(['Ashkénaze', 'Hongrie']), relationshipIntent: s('long_term'), children: s('open'),
    },
    prompts: [
      { id: 'favorite_tradition', answer: 'Reading the Haggadah with everyone adding their own footnotes.' },
      { id: 'currently_learning', answer: 'French, so I can finally read the books I edit in translation.' },
    ],
    portrait: { skin: 0, hair: 'wavy', hairColor: 'blond', outfit: '#C1121F', scene: 'library', earrings: true, lean: 0.1 },
    moments: [{ kind: 'ceramics', caption: 'Wonky but mine.' }, { kind: 'books', caption: 'Galleys, everywhere.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 38, maxDistanceKm: 25 },
  },
  // ——— Monde (démo : MOTEK est pensé pour un lancement mondial) ———
  {
    key: 'avigail', firstName: 'Avigail', gender: 'woman', seeks: ['man'], birthDate: '1995-01-12', regionCode: 'il-jerusalem',
    languages: ['fr', 'he', 'en'], headline: 'Montée de Lyon il y a six ans, guide au musée d’Israël', verified: true,
    jewishLife: {
      practice: s('modern_orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), community: s('weekly'), traditionPlace: s('central'), culturalBackground: s(['Sépharade', 'Tunisie']),
      relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'favorite_holiday', answer: 'Yom Yeroushalayim : la ville entière chante, même les pierres.' },
      { id: 'green_flag', answer: 'Quelqu’un qui appelle sa mère sans qu’on le lui rappelle.' },
    ],
    portrait: { skin: 2, hair: 'long', hairColor: 'darkBrown', outfit: '#E8D8C4', scene: 'dusk' },
    moments: [{ kind: 'rooftops', caption: 'La vieille ville depuis le toit d’une amie.' }, { kind: 'candles', caption: 'Shabbat à Nahlaot.' }],
    privacy: careful, preferences: { ageMin: 27, ageMax: 36, maxDistanceKm: 40 },
  },
  {
    key: 'yehuda', firstName: 'Yehuda', gender: 'man', seeks: ['woman'], birthDate: '1990-06-02', regionCode: 'il-jerusalem',
    languages: ['en', 'he'], headline: 'Startup lawyer by day, Talmud study by night', verified: true,
    jewishLife: {
      practice: s('orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), community: s('weekly'), traditionPlace: s('central'), culturalBackground: s(['Ashkénaze', 'USA']),
      relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Twelve guests, three languages, and someone always bringing a guitar after havdalah.' },
      { id: 'currently_learning', answer: 'Tractate Berakhot, and how to make a decent shakshuka.' },
    ],
    portrait: { skin: 1, hair: 'short', hairColor: 'brown', outfit: '#2F3E46', scene: 'library', beard: true, glasses: true },
    moments: [{ kind: 'books', caption: 'My chavruta table.' }, { kind: 'mountains', caption: 'Hiking in the Judean hills.' }],
    privacy: careful, preferences: { ageMin: 25, ageMax: 34, maxDistanceKm: 60 },
  },
  {
    key: 'shira', firstName: 'Shira', gender: 'woman', seeks: ['man'], birthDate: '1997-08-21', regionCode: 'il-tel-aviv',
    languages: ['he', 'en', 'fr'], headline: 'Product designer, surfs before stand-up', verified: true,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Ashkénaze', 'Russie']), relationshipIntent: s('long_term'), children: s('want', 'matches'),
    },
    prompts: [
      { id: 'perfect_sunday', answer: 'Hilton beach at 6am, coffee at Florentin, a nap I won’t apologise for.' },
      { id: 'together_we_could', answer: 'Find the best hummus in Jaffa. I already have strong opinions.' },
    ],
    portrait: { skin: 2, hair: 'wavy', hairColor: 'brown', outfit: '#F4F1DE', scene: 'sea' },
    moments: [{ kind: 'sea', caption: 'Morning session.' }, { kind: 'coffee', caption: 'Florentin office.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 25 },
  },
  {
    key: 'itay', firstName: 'Itay', gender: 'man', seeks: ['woman'], birthDate: '1991-11-30', regionCode: 'il-tel-aviv',
    languages: ['he', 'en'], headline: 'Cardiologist, jazz pianist on Thursdays', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), culturalBackground: s(['Mizrahi', 'Irak']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'family_recipe', answer: 'My grandmother’s kubbeh soup. Winter is officially open when she makes it.' },
      { id: 'makes_me_laugh', answer: 'Patients who google their symptoms and diagnose me instead.' },
    ],
    portrait: { skin: 3, hair: 'short', hairColor: 'black', outfit: '#1D3557', scene: 'night', beard: true },
    moments: [{ kind: 'vinyl', caption: 'Thursday set list.' }, { kind: 'sea', caption: 'Tel Aviv port at sunset.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 37, maxDistanceKm: 30 },
  },
  {
    key: 'liora', firstName: 'Liora', gender: 'woman', seeks: ['man'], birthDate: '1992-05-09', regionCode: 'gb-london',
    languages: ['en', 'he'], headline: 'Investment analyst, half-marathons, terrible at chess', verified: true,
    jewishLife: {
      practice: s('masorti'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('monthly'), culturalBackground: s(['Ashkénaze', 'Afrique du Sud']),
      relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'green_flag', answer: 'You know the names of your friends’ kids.' },
      { id: 'teach_me', answer: 'Chess. Please. My nephew is eight and destroying me.' },
    ],
    portrait: { skin: 1, hair: 'ponytail', hairColor: 'brown', outfit: '#264653', scene: 'garden' },
    moments: [{ kind: 'rooftops', caption: 'Primrose Hill, Sunday run.' }, { kind: 'bread', caption: 'Friday challah from Golders Green.' }],
    privacy: open, preferences: { ageMin: 29, ageMax: 39, maxDistanceKm: 20 },
  },
  {
    key: 'joshua', firstName: 'Joshua', gender: 'man', seeks: ['woman'], birthDate: '1988-09-17', regionCode: 'gb-london',
    languages: ['en', 'fr'], headline: 'Architect, restoring a Victorian house one weekend at a time', verified: true,
    jewishLife: {
      practice: s('liberal_reform'), partnerImportance: s('open_to_jewish_life'), shabbat: s('sometimes'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Ashkénaze']), relationshipIntent: s('long_term'), children: s('open'),
    },
    prompts: [
      { id: 'project_excited_about', answer: 'A community centre in Hackney with a roof garden for the kids.' },
      { id: 'perfect_sunday', answer: 'Columbia Road flower market, then a very long lunch.' },
    ],
    portrait: { skin: 0, hair: 'wavy', hairColor: 'auburn', outfit: '#6B705C', scene: 'terrace', beard: true },
    moments: [{ kind: 'flowers', caption: 'Columbia Road haul.' }, { kind: 'rooftops', caption: 'Site visit, Hackney.' }],
    privacy: open, preferences: { ageMin: 30, ageMax: 40, maxDistanceKm: 15 },
  },
  {
    key: 'chloe', firstName: 'Chloé', gender: 'woman', seeks: ['man'], birthDate: '1996-03-03', regionCode: 'gb-london',
    languages: ['fr', 'en'], headline: 'Parisienne à Londres, cheffe de projet dans la mode', verified: false,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), culturalBackground: s(['Sépharade', 'Maroc']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Couscous du vendredi, même à Londres. Surtout à Londres.' },
      { id: 'makes_me_laugh', answer: 'Les Anglais qui s’excusent quand je leur marche sur le pied.' },
    ],
    portrait: { skin: 3, hair: 'long', hairColor: 'black', outfit: '#C9A27E', scene: 'dusk', earrings: true },
    moments: [{ kind: 'coffee', caption: 'Notting Hill, samedi matin.' }, { kind: 'flowers', caption: 'Pour la table de vendredi.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 36, maxDistanceKm: 20 },
  },
  {
    key: 'nathan', firstName: 'Nathan', gender: 'man', seeks: ['woman'], birthDate: '1994-02-14', regionCode: 'us-new-york',
    languages: ['en', 'fr'], headline: 'Chef de cuisine dans un bistrot de l’Upper West Side', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), culturalBackground: s(['Sépharade', 'Algérie']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'family_recipe', answer: 'Les makrouts de ma tante, que je n’ai jamais osé mettre à la carte.' },
      { id: 'together_we_could', answer: 'Faire le tour des delis de Manhattan et noter chaque pastrami.' },
    ],
    portrait: { skin: 3, hair: 'curly', hairColor: 'black', outfit: '#FFFFFF', scene: 'night', beard: true },
    moments: [{ kind: 'bread', caption: 'Service du soir.' }, { kind: 'rooftops', caption: 'Brooklyn, mon jour off.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 20 },
  },
  {
    key: 'abby', firstName: 'Abby', gender: 'woman', seeks: ['man'], birthDate: '1991-10-25', regionCode: 'us-new-york',
    languages: ['en', 'he'], headline: 'ER nurse, Sunday crossword loyalist', verified: true,
    jewishLife: {
      practice: s('modern_orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), community: s('weekly'), relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'best_advice', answer: 'Eat when you can, sleep when you can, call your grandmother.' },
      { id: 'favorite_tradition', answer: 'Shabbat afternoon walks in Riverside Park with no phone at all.' },
    ],
    portrait: { skin: 1, hair: 'wavy', hairColor: 'auburn', outfit: '#3E5C76', scene: 'garden' },
    moments: [{ kind: 'books', caption: 'Crossword, in pen.' }, { kind: 'coffee', caption: 'After a night shift.' }],
    privacy: careful, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 25 },
  },
  {
    key: 'jonah', firstName: 'Jonah', gender: 'man', seeks: ['man'], birthDate: '1993-07-11', regionCode: 'us-new-york',
    languages: ['en'], headline: 'Broadway stage manager, bagel purist', verified: true,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('important'), shabbat: s('sometimes'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Ashkénaze']), relationshipIntent: s('long_term'), children: s('open'),
    },
    prompts: [
      { id: 'makes_me_laugh', answer: 'Actors who swear they know their lines.' },
      { id: 'perfect_sunday', answer: 'No show, no phone, the Met and dumplings in Chinatown.' },
    ],
    portrait: { skin: 1, hair: 'short', hairColor: 'darkBrown', outfit: '#1E1A24', scene: 'studio' },
    moments: [{ kind: 'rooftops', caption: 'Times Square from the fly gallery.' }, { kind: 'vinyl', caption: 'Cast recordings only.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 38, maxDistanceKm: 15 },
  },
  {
    key: 'gabriela', firstName: 'Gabriela', gender: 'woman', seeks: ['man'], birthDate: '1994-12-04', regionCode: 'us-miami',
    languages: ['en', 'es', 'he'], headline: 'Real estate lawyer, salsa on Fridays after dinner', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), culturalBackground: s(['Sépharade', 'Venezuela']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Arepas and challah on the same table. My family doesn’t do borders.' },
      { id: 'teach_me', answer: 'How to sail. I’ve lived by the ocean my whole life and never learned.' },
    ],
    portrait: { skin: 4, hair: 'long', hairColor: 'darkBrown', outfit: '#E07A5F', scene: 'sea', earrings: true },
    moments: [{ kind: 'sea', caption: 'Key Biscayne.' }, { kind: 'citrus', caption: 'Abuela’s backyard.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 30 },
  },
  {
    key: 'ethan', firstName: 'Ethan', gender: 'man', seeks: ['woman'], birthDate: '1989-04-19', regionCode: 'us-los-angeles',
    languages: ['en', 'fa'], headline: 'Film editor, Persian-American, makes the best tahdig on the West Coast', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), culturalBackground: s(['Mizrahi', 'Iran']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'family_recipe', answer: 'Tahdig. I will not share the rice-to-oil ratio until the third date.' },
      { id: 'project_excited_about', answer: 'A documentary about my grandfather’s journey from Shiraz to LA.' },
    ],
    portrait: { skin: 3, hair: 'wavy', hairColor: 'black', outfit: '#2B2D42', scene: 'dusk', beard: true },
    moments: [{ kind: 'mountains', caption: 'Griffith at golden hour.' }, { kind: 'citrus', caption: 'Pomegranates from the yard.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 40 },
  },
  {
    key: 'emma', firstName: 'Emma', gender: 'woman', seeks: ['woman'], birthDate: '1995-09-08', regionCode: 'us-los-angeles',
    languages: ['en'], headline: 'Music therapist, hiking every canyon in LA', verified: false,
    jewishLife: {
      practice: s('spiritual'), partnerImportance: s('open_to_jewish_life'), shabbat: s('sometimes'), holidays: s('some'),
      kashrutHome: s('vegetarian_for_kashrut'), relationshipIntent: s('see_where_it_goes'), children: s('not_sure'),
    },
    prompts: [
      { id: 'favorite_tradition', answer: 'Havdalah under the stars, out in Joshua Tree.' },
      { id: 'green_flag', answer: 'You sing in the car and don’t care who sees.' },
    ],
    portrait: { skin: 0, hair: 'long', hairColor: 'blond', outfit: '#A8DADC', scene: 'garden' },
    moments: [{ kind: 'mountains', caption: 'Runyon Canyon, 7am.' }, { kind: 'candles', caption: 'Havdalah, desert edition.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 40 },
  },
  {
    key: 'oceane', firstName: 'Océane', gender: 'woman', seeks: ['man'], birthDate: '1993-06-27', regionCode: 'ca-montreal',
    languages: ['fr', 'en'], headline: 'Pharmacienne, patineuse l’hiver, cycliste l’été', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), culturalBackground: s(['Sépharade', 'Maroc']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'favorite_holiday', answer: 'Hanouka : beignets, neige et toute la famille de Côte-Saint-Luc.' },
      { id: 'perfect_sunday', answer: 'Bagels de Saint-Viateur, puis le mont Royal à pied.' },
    ],
    portrait: { skin: 2, hair: 'bob', hairColor: 'darkBrown', outfit: '#8E2433', scene: 'studio' },
    moments: [{ kind: 'mountains', caption: 'Le mont Royal en octobre.' }, { kind: 'bread', caption: 'Saint-Viateur, toujours.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 25 },
  },
  {
    key: 'mathieu', firstName: 'Mathieu', gender: 'man', seeks: ['woman'], birthDate: '1987-01-21', regionCode: 'ca-montreal',
    languages: ['fr', 'en', 'he'], headline: 'Ingénieur en IA, père d’une fille de six ans', verified: true,
    jewishLife: {
      practice: s('masorti'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('monthly'), relationshipIntent: s('long_term'), children: s('have_and_want_more'),
    },
    prompts: [
      { id: 'best_advice', answer: '« Fais les choses lentement, mais fais-les. » Mon grand-père, ébéniste.' },
      { id: 'together_we_could', answer: 'Construire une cabane à souccot digne de ce nom. Ma fille a déjà les plans.' },
    ],
    portrait: { skin: 1, hair: 'short', hairColor: 'brown', outfit: '#3A5A40', scene: 'garden', glasses: true },
    moments: [{ kind: 'mountains', caption: 'Laurentides en famille.' }, { kind: 'books', caption: 'Lecture du soir, tome 4.' }],
    privacy: careful, preferences: { ageMin: 30, ageMax: 42, maxDistanceKm: 30 },
  },
  {
    key: 'laura', firstName: 'Laura', gender: 'woman', seeks: ['man'], birthDate: '1990-03-15', regionCode: 'ch-geneve',
    languages: ['fr', 'en', 'de'], headline: 'Diplomate à l’ONU, toujours entre deux avions', verified: true,
    jewishLife: {
      practice: s('liberal_reform'), partnerImportance: s('open_to_jewish_life'), shabbat: s('sometimes'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Ashkénaze', 'Suisse']), relationshipIntent: s('long_term'), children: s('open'),
    },
    prompts: [
      { id: 'together_we_could', answer: 'Faire le tour du lac à vélo et s’arrêter dans chaque village pour un café.' },
      { id: 'currently_learning', answer: 'L’hébreu, pour comprendre enfin les chansons de mon père.' },
    ],
    portrait: { skin: 0, hair: 'bun', hairColor: 'blond', outfit: '#1D3557', scene: 'terrace', earrings: true },
    moments: [{ kind: 'boat', caption: 'Le Léman un soir de juin.' }, { kind: 'mountains', caption: 'Chamonix, à une heure de la maison.' }],
    privacy: open, preferences: { ageMin: 32, ageMax: 44, maxDistanceKm: 50 },
  },
  {
    key: 'simon', firstName: 'Simon', gender: 'man', seeks: ['woman'], birthDate: '1986-08-05', regionCode: 'be-anvers',
    languages: ['fr', 'nl', 'en', 'he'], headline: 'Diamantaire, troisième génération, passionné d’horlogerie', verified: true,
    jewishLife: {
      practice: s('orthodox'), partnerImportance: s('essential'), shabbat: s('full_observance'), holidays: s('all_major'),
      kashrutHome: s('strict_home_and_out'), community: s('weekly'), traditionPlace: s('central'), relationshipIntent: s('marriage'), children: s('want'),
    },
    prompts: [
      { id: 'favorite_tradition', answer: 'Le kiddouch du samedi matin avec mon père et mes frères.' },
      { id: 'teach_me', answer: 'La cuisine. Je sais tailler une pierre, pas couper un oignon.' },
    ],
    portrait: { skin: 1, hair: 'short', hairColor: 'black', outfit: '#1E1A24', scene: 'library', beard: true },
    moments: [{ kind: 'books', caption: 'Bibliothèque de mon grand-père.' }, { kind: 'rooftops', caption: 'Anvers, quartier de la gare.' }],
    privacy: careful, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 80 },
  },
  {
    key: 'alessia', firstName: 'Alessia', gender: 'woman', seeks: ['man'], birthDate: '1995-11-11', regionCode: 'it-milan',
    languages: ['it', 'en', 'fr'], headline: 'Designer textile, collectionne les tissus anciens', verified: true,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('important'), shabbat: s('family_occasions'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Italki', 'Rome']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'family_recipe', answer: 'Les carciofi alla giudia de ma nonna. Rome, quartier du Ghetto, depuis toujours.' },
      { id: 'perfect_sunday', answer: 'Marché du Naviglio, un aperitivo qui dure trois heures.' },
    ],
    portrait: { skin: 2, hair: 'wavy', hairColor: 'darkBrown', outfit: '#B5651D', scene: 'terrace', earrings: true },
    moments: [{ kind: 'citrus', caption: 'Été à Rome chez ma grand-mère.' }, { kind: 'flowers', caption: 'Atelier, Porta Venezia.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 37, maxDistanceKm: 40 },
  },
  {
    key: 'dan', firstName: 'Dan', gender: 'man', seeks: ['woman'], birthDate: '1985-05-28', regionCode: 'es-marbella',
    languages: ['fr', 'en', 'es', 'he'], headline: 'Entrepreneur dans l’hôtellerie, golf le dimanche', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), culturalBackground: s(['Sépharade', 'Maroc']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'perfect_sunday', answer: 'Un parcours à Nueva Andalucía, puis un déjeuner face à la mer à Puerto Banús.' },
      { id: 'together_we_could', answer: 'Aller à Tanger en bateau pour un dîner et revenir au lever du soleil.' },
    ],
    portrait: { skin: 3, hair: 'short', hairColor: 'grey', outfit: '#F4F1DE', scene: 'sea' },
    moments: [{ kind: 'boat', caption: 'Puerto Banús, fin de journée.' }, { kind: 'mountains', caption: 'La Concha vue du green.' }],
    privacy: open, preferences: { ageMin: 30, ageMax: 42, maxDistanceKm: 60 },
  },
  {
    key: 'lina', firstName: 'Lina', gender: 'woman', seeks: ['man'], birthDate: '1996-04-30', regionCode: 'ma-casablanca',
    languages: ['fr', 'ar', 'en'], headline: 'Architecte d’intérieur, je restaure les riads de la médina', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('holidays'), culturalBackground: s(['Sépharade', 'Maroc']),
      relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'favorite_holiday', answer: 'La Mimouna : la maison ouverte à tout le quartier jusqu’à l’aube.' },
      { id: 'family_recipe', answer: 'La skhina de ma grand-mère, cuite toute la nuit chez le boulanger.' },
    ],
    portrait: { skin: 4, hair: 'curly', hairColor: 'black', outfit: '#E9C46A', scene: 'candlelight', earrings: true },
    moments: [{ kind: 'ceramics', caption: 'Zelliges d’un riad en chantier.' }, { kind: 'citrus', caption: 'Table de Mimouna.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 37, maxDistanceKm: 50 },
  },
  {
    key: 'tomas', firstName: 'Tomás', gender: 'man', seeks: ['woman'], birthDate: '1992-09-09', regionCode: 'ar-buenos-aires',
    languages: ['es', 'en', 'he'], headline: 'Arquitecto y profesor de tango los miércoles', verified: true,
    jewishLife: {
      practice: s('masorti'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), culturalBackground: s(['Ashkénaze', 'Argentine']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'teach_me', answer: 'Lo que quieras. A cambio, te enseño a bailar tango sin pisarte.' },
      { id: 'ideal_shabbat_meal', answer: 'Asado kasher en la terraza de mis padres en Belgrano.' },
    ],
    portrait: { skin: 2, hair: 'wavy', hairColor: 'darkBrown', outfit: '#1D3557', scene: 'night', beard: true },
    moments: [{ kind: 'vinyl', caption: 'Milonga del miércoles.' }, { kind: 'rooftops', caption: 'Palermo desde mi oficina.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 30 },
  },
  {
    key: 'kayla', firstName: 'Kayla', gender: 'woman', seeks: ['man'], birthDate: '1993-02-17', regionCode: 'za-johannesburg',
    languages: ['en', 'he'], headline: 'Wildlife vet, more comfortable with lions than with small talk', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), community: s('monthly'), culturalBackground: s(['Ashkénaze', 'Lituanie']),
      relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'project_excited_about', answer: 'A rhino rehabilitation programme near the Kruger.' },
      { id: 'green_flag', answer: 'You’re kind to waiters and patient with dogs.' },
    ],
    portrait: { skin: 1, hair: 'ponytail', hairColor: 'blond', outfit: '#606C38', scene: 'garden' },
    moments: [{ kind: 'mountains', caption: 'Magaliesberg weekend.' }, { kind: 'flowers', caption: 'Jacaranda season.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 40 },
  },
  {
    key: 'josh', firstName: 'Josh', gender: 'man', seeks: ['woman'], birthDate: '1990-12-08', regionCode: 'au-sydney',
    languages: ['en'], headline: 'Marine engineer, surf club volunteer at Bondi', verified: false,
    jewishLife: {
      practice: s('cultural'), partnerImportance: s('important'), shabbat: s('family_occasions'), holidays: s('high_holidays_and_pesach'),
      kashrutHome: s('not_kosher'), culturalBackground: s(['Ashkénaze', 'Pologne']), relationshipIntent: s('see_where_it_goes'), children: s('open'),
    },
    prompts: [
      { id: 'makes_me_laugh', answer: 'Celebrating Pesach in autumn and Hanukkah in a heatwave.' },
      { id: 'perfect_sunday', answer: 'Dawn patrol at Bondi, bacon-free brekkie, a nap under a tree.' },
    ],
    portrait: { skin: 1, hair: 'wavy', hairColor: 'blond', outfit: '#00838F', scene: 'sea' },
    moments: [{ kind: 'sea', caption: 'Bondi, 6am.' }, { kind: 'boat', caption: 'Harbour on a Sunday.' }],
    privacy: open, preferences: { ageMin: 27, ageMax: 37, maxDistanceKm: 30 },
  },
  {
    key: 'julie', firstName: 'Julie', gender: 'woman', seeks: ['man'], birthDate: '1992-07-24', regionCode: 'fr-marseille',
    languages: ['fr', 'en'], headline: 'Kiné, plongée dans les calanques dès que possible', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('kosher_home_flexible_out'), culturalBackground: s(['Sépharade', 'Tunisie']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'ideal_shabbat_meal', answer: 'Le poisson à la tunisienne de ma mère, et tout le monde qui parle en même temps.' },
      { id: 'perfect_sunday', answer: 'Sormiou le matin, panisse au Vallon des Auffes le soir.' },
    ],
    portrait: { skin: 3, hair: 'long', hairColor: 'brown', outfit: '#E07A5F', scene: 'sea' },
    moments: [{ kind: 'sea', caption: 'Calanque de Sormiou.' }, { kind: 'boat', caption: 'Le Vieux-Port un soir d’été.' }],
    privacy: open, preferences: { ageMin: 28, ageMax: 38, maxDistanceKm: 30 },
  },
  {
    key: 'kevin', firstName: 'Kevin', gender: 'man', seeks: ['woman'], birthDate: '1991-03-26', regionCode: 'fr-nice',
    languages: ['fr', 'en', 'it'], headline: 'Pilote d’hélicoptère, entre Nice et Monaco', verified: true,
    jewishLife: {
      practice: s('traditional'), partnerImportance: s('important'), shabbat: s('friday_dinner'), holidays: s('all_major'),
      kashrutHome: s('no_pork_seafood'), culturalBackground: s(['Sépharade', 'Algérie']), relationshipIntent: s('long_term'), children: s('want'),
    },
    prompts: [
      { id: 'together_we_could', answer: 'Un déjeuner à San Remo et un dîner à Nice, le même jour.' },
      { id: 'green_flag', answer: 'Quelqu’un qui n’a pas peur de prendre de la hauteur.' },
    ],
    portrait: { skin: 2, hair: 'buzz', hairColor: 'darkBrown', outfit: '#264653', scene: 'sea' },
    moments: [{ kind: 'sea', caption: 'La baie des Anges vue d’en haut.' }, { kind: 'citrus', caption: 'Menton, fête du citron.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 50 },
  },
  {
    key: 'manon', firstName: 'Manon', gender: 'woman', seeks: ['man'], birthDate: '1997-10-02', regionCode: 'fr-lyon',
    languages: ['fr', 'en'], headline: 'Sommelière (vins casher compris), toujours curieuse', verified: true,
    jewishLife: {
      practice: s('exploring'), partnerImportance: s('important'), shabbat: s('sometimes'), holidays: s('some'),
      kashrutHome: s('other', 'members', 'J’apprends, à mon rythme.'), relationshipIntent: s('long_term'), children: s('open'),
    },
    prompts: [
      { id: 'currently_learning', answer: 'Les fêtes juives, une par une, avec un carnet de notes.' },
      { id: 'teach_me', answer: 'Ta recette préférée. Je trouverai le vin qui va avec.' },
    ],
    portrait: { skin: 0, hair: 'bob', hairColor: 'auburn', outfit: '#6D597A', scene: 'candlelight' },
    moments: [{ kind: 'citrus', caption: 'Dégustation du jeudi.' }, { kind: 'rooftops', caption: 'Fourvière au coucher du soleil.' }],
    privacy: open, preferences: { ageMin: 26, ageMax: 36, maxDistanceKm: 25 },
  },
];

/** The member you are in the demo app (and demo1@… in the seed). */
export const DEMO_VIEWER_KEY = 'ilan';

export const personByKey = (key: string): DemoPerson => {
  const p = DEMO_PEOPLE.find((x) => x.key === key);
  if (!p) throw new Error(`Unknown demo person: ${key}`);
  return p;
};

/** Stable demo ids, identical in the offline app and the seeded database. */
export const demoUserId = (key: string) => `demo-${key}`;
export const demoEmail = (key: string) => `demo${DEMO_PEOPLE.findIndex((p) => p.key === key) + 1}@demo.kapara.invalid`;

/** Photo URLs use a private scheme resolved to bundled images (see ./images). */
export const DEMO_IMAGE_SCHEME = 'kapara-demo://';
export const portraitUrl = (key: string) => `${DEMO_IMAGE_SCHEME}portraits/${key}.jpg`;
export const momentUrl = (key: string, i: number) => `${DEMO_IMAGE_SCHEME}moments/${key}-${i}.jpg`;

/** Age at a reference date (defaults to now). */
export function ageOf(birthDate: string, at: Date = new Date()): number {
  const b = new Date(birthDate);
  let age = at.getFullYear() - b.getFullYear();
  if (at.getMonth() < b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() < b.getDate())) age--;
  return age;
}
