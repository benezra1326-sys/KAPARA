/**
 * Demo data. Every account is fictional and flagged isDemo=true; the app shows
 * a "Profil de démonstration" badge. Photos are placeholders (picsum.photos,
 * Unsplash licence) until the demo-data workstream ships generated portraits.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { REGIONS } from '@kapara/config';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const f = (value: unknown, visibility = 'members', useForMatching = true) => ({ value, preferNotToSay: false, visibility, useForMatching });

const PEOPLE = [
  { name: 'Léa', g: 'woman', y: 1994, practice: 'traditional', shabbat: 'friday_dinner', kashrut: 'kosher_home_flexible_out', p: ['ideal_shabbat_meal', 'Une grande tablée, des challot encore tièdes et un débat qui dure jusqu’à minuit.'] },
  { name: 'Noam', g: 'man', y: 1991, practice: 'masorti', shabbat: 'sometimes', kashrut: 'no_pork_seafood', p: ['project_excited_about', 'Je restaure un vieux voilier avec mon frère. Il flottera, promis.'] },
  { name: 'Sarah', g: 'woman', y: 1996, practice: 'modern_orthodox', shabbat: 'full_observance', kashrut: 'strict_home_and_out', p: ['favorite_holiday', 'Souccot : dîner dehors, guirlandes, et toute la famille entassée.'] },
  { name: 'David', g: 'man', y: 1989, practice: 'cultural', shabbat: 'family_occasions', kashrut: 'not_kosher', p: ['makes_me_laugh', 'Les imitations de ma grand-mère par ma sœur. Imbattable.'] },
  { name: 'Rachel', g: 'woman', y: 1992, practice: 'liberal_reform', shabbat: 'friday_dinner', kashrut: 'vegetarian_for_kashrut', p: ['favorite_tradition', 'Allumer les bougies, même seule, même en voyage.'] },
  { name: 'Yonathan', g: 'man', y: 1995, practice: 'traditional', shabbat: 'friday_dinner', kashrut: 'kosher_home_flexible_out', p: ['perfect_sunday', 'Marché d’Aligre, café trop fort, puis vélo jusqu’à la Marne.'] },
  { name: 'Maya', g: 'woman', y: 1998, practice: 'exploring', shabbat: 'sometimes', kashrut: 'other', p: ['teach_me', 'Apprends-moi le backgammon, je t’apprends la céramique.'] },
  { name: 'Eli', g: 'man', y: 1993, practice: 'orthodox', shabbat: 'full_observance', kashrut: 'strict_home_and_out', p: ['green_flag', 'Quelqu’un qui rappelle sa mère juste pour lui raconter sa journée.'] },
  { name: 'Judith', g: 'woman', y: 1990, practice: 'secular', shabbat: 'not_currently', kashrut: 'not_kosher', p: ['project_excited_about', 'Un documentaire sur les musiciens judéo-marocains de Paris.'] },
  { name: 'Raphaël', g: 'man', y: 1997, practice: 'traditional', shabbat: 'friday_dinner', kashrut: 'no_pork_seafood', p: ['ideal_shabbat_meal', 'Couscous de ma tante, puis balade sur les quais.'] },
] as const;

async function main() {
  for (const r of REGIONS) {
    await prisma.$executeRaw`
      INSERT INTO "Region" (code, country, city, timezone, locale, launched, center)
      VALUES (${r.code}, ${r.country}, ${r.city}, ${r.timezone}, ${r.defaultLocale}, ${r.launched},
              ST_SetSRID(ST_MakePoint(${r.center.lng}, ${r.center.lat}), 4326)::geography)
      ON CONFLICT (code) DO NOTHING`;
  }
  for (const [i, x] of PEOPLE.entries()) {
    const email = `demo${i + 1}@demo.kapara.invalid`;
    const jewishLife = {
      practice: f(x.practice), shabbat: f(x.shabbat), kashrutHome: f(x.kashrut, 'matches'),
      relationshipIntent: f('long_term', 'members'),
    };
    const user = await prisma.user.upsert({
      where: { email }, update: {},
      create: {
        email, regionCode: 'fr-paris', isDemo: true, verifiedAt: i % 3 === 0 ? new Date() : null,
        profile: { create: {
          firstName: x.name, birthDate: new Date(`${x.y}-06-15`), gender: x.g, languages: ['fr', 'en'],
          headline: 'Profil de démonstration', jewishLife, prompts: [{ id: x.p[0], answer: x.p[1] }],
          photos: { create: [0, 1, 2].map((n) => ({ url: `https://picsum.photos/seed/kapara-${i}-${n}/900/1200`, position: n, isDemo: true })) },
        } },
        preferences: { create: { genders: [x.g === 'woman' ? 'man' : 'woman'], ageMin: 25, ageMax: 40 } },
        privacy: { create: { crossedEnabled: true, liveEnabled: true } },
        consents: { create: Object.keys(jewishLife).map((field) => ({ field })) },
      },
    });
    console.log(`seeded ${user.email}`);
  }
}

main().finally(() => prisma.$disconnect());
