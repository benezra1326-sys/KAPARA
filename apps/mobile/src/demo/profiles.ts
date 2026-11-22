import type { Recommendation } from '@kapara/shared';

/** Offline demo data. Fictional people, flagged isDemo, placeholder photos. */
const f = (value: string) => ({ value, preferNotToSay: false, visibility: 'members' as const, useForMatching: true });
const mk = (i: number, firstName: string, age: number, headline: string, prompt: [string, string], practice: string, shabbat: string, reasons: string[]): Recommendation => ({
  score: 0.9 - i * 0.05,
  reasons: reasons.map((key) => ({ key })),
  profile: {
    id: `demo-${i}`, firstName, age, city: 'Paris', regionCode: 'fr-paris', headline, languages: ['fr', 'en'],
    photos: [0, 1, 2].map((n) => ({ id: `p${i}-${n}`, url: `https://picsum.photos/seed/kapara-${i}-${n}/900/1200`, isDemo: true })),
    prompts: [{ id: prompt[0], answer: prompt[1] }],
    jewishLife: { practice: f(practice), shabbat: f(shabbat) } as Recommendation['profile']['jewishLife'],
    verified: i % 2 === 0, isDemo: true,
  },
});

export const DEMO_PICKS: Recommendation[] = [
  mk(0, 'Léa', 31, 'Architecte, toujours un carnet dans le sac', ['ideal_shabbat_meal', 'Une grande tablée, des challot encore tièdes et un débat qui dure jusqu’à minuit.'], 'traditional', 'friday_dinner', ['shared.shabbat', 'nearby']),
  mk(1, 'Sarah', 29, 'Pédiatre, chorale le jeudi', ['favorite_holiday', 'Souccot : dîner dehors, guirlandes, et toute la famille entassée.'], 'modern_orthodox', 'full_observance', ['shared.practice']),
  mk(2, 'Rachel', 33, 'Je traduis des romans israéliens', ['favorite_tradition', 'Allumer les bougies, même seule, même en voyage.'], 'liberal_reform', 'friday_dinner', ['shared.shabbat', 'shared.relationshipIntent']),
  mk(3, 'Maya', 27, 'Céramiste, lève-tôt assumée', ['teach_me', 'Apprends-moi le backgammon, je t’apprends la céramique.'], 'exploring', 'sometimes', ['nearby']),
];

export const PROMPT_LABELS: Record<string, string> = {
  ideal_shabbat_meal: 'Mon repas de Shabbat idéal', favorite_holiday: 'Ma fête préférée', favorite_tradition: 'La tradition qui me tient à cœur',
  teach_me: 'Apprends-moi…', makes_me_laugh: 'Ce qui me fait rire', project_excited_about: 'Le projet qui m’enthousiasme',
  perfect_sunday: 'Mon dimanche parfait', green_flag: 'Ce qui me plaît chez quelqu’un',
};
