/**
 * Demo data seed. Every account is fictional and flagged isDemo=true (the app
 * shows a "Profil de démonstration" badge). Portraits are generated
 * illustrations bundled with the app (kapara-demo:// URLs), never photos of
 * real people.
 *
 * The cast and the scenarios come from apps/mobile/src/demo so the offline
 * app and the database tell the same story, with the same ids (demo-<key>).
 * Re-running the seed replaces demo data only; real accounts are untouched.
 *
 *   npm run db:seed            # demo1@demo.kapara.invalid is the demo viewer (Ilan)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Gender, type IntroStatus } from '../src/generated/prisma/client';
import { REGIONS, RULES } from '@kapara/config';
import { DEMO_PEOPLE, DEMO_VIEWER_KEY, demoEmail, demoUserId as id, momentUrl, portraitUrl } from '../../mobile/src/demo/people';
import { DEMO_CONVERSATIONS, DEMO_CROSSED, DEMO_INTRODUCTIONS, DEMO_LIKES_RECEIVED, minutesAgo } from '../../mobile/src/demo/scenarios';

if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== '1') {
  console.error('Refusing to seed demo data in production (set SEED_DEMO=1 to force).');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const now = new Date();
const viewer = id(DEMO_VIEWER_KEY);

/** Generic, public spots in Paris used for "Croisés" samples (snapped to the grid like real data). */
const PARIS_SPOTS = [
  { lat: 48.8712, lng: 2.3654 }, // canal
  { lat: 48.8462, lng: 2.3371 }, // jardin
  { lat: 48.8566, lng: 2.3522 }, // centre
];

async function wipeDemo() {
  const demoUsers = (await prisma.user.findMany({ where: { isDemo: true }, select: { id: true } })).map((u) => u.id);
  await prisma.$transaction([
    prisma.introduction.deleteMany({ where: { OR: [{ id: { startsWith: 'demo-' } }, { introducerId: { in: demoUsers } }] } }),
    prisma.conversation.deleteMany({ where: { id: { startsWith: 'demo-' } } }),
    prisma.callLog.deleteMany({ where: { OR: [{ callerId: { in: demoUsers } }, { calleeId: { in: demoUsers } }] } }),
    prisma.report.deleteMany({ where: { OR: [{ reporterId: { in: demoUsers } }, { reportedId: { in: demoUsers } }] } }),
    prisma.user.deleteMany({ where: { isDemo: true } }), // cascades to profile, photos, likes, sightings…
  ]);
}

async function seedRegions() {
  for (const r of REGIONS) {
    await prisma.$executeRaw`
      INSERT INTO "Region" (code, country, city, timezone, locale, launched, center)
      VALUES (${r.code}, ${r.country}, ${r.city}, ${r.timezone}, ${r.defaultLocale}, ${r.launched},
              ST_SetSRID(ST_MakePoint(${r.center.lng}, ${r.center.lat}), 4326)::geography)
      ON CONFLICT (code) DO NOTHING`;
  }
}

async function seedPeople() {
  for (const p of DEMO_PEOPLE) {
    const answers = Object.entries(p.jewishLife);
    // Consent is recorded only for answers the member chose to share or use for matching.
    const consented = answers.filter(([, f]) => f && (f.visibility !== 'private' || f.useForMatching)).map(([field]) => field);
    const region = REGIONS.find((r) => r.code === p.regionCode)!;
    await prisma.user.create({
      data: {
        id: id(p.key), email: demoEmail(p.key), regionCode: p.regionCode, locale: region.defaultLocale, isDemo: true,
        verifiedAt: p.verified ? minutesAgo(60 * 24 * 20, now) : null,
        profile: { create: {
          firstName: p.firstName, birthDate: new Date(p.birthDate), gender: p.gender as Gender, headline: p.headline,
          languages: p.languages, jewishLife: p.jewishLife as object, prompts: p.prompts,
          photos: { create: [
            { url: portraitUrl(p.key), position: 0, isDemo: true },
            ...p.moments.map((m, i) => ({ url: momentUrl(p.key, i), caption: m.caption, position: i + 1, isDemo: true })),
          ] },
        } },
        preferences: { create: {
          genders: p.seeks as Gender[], ageMin: p.preferences.ageMin, ageMax: p.preferences.ageMax, maxDistanceKm: p.preferences.maxDistanceKm,
          // A few soft preferences so "Pour toi" has something to explain. Never dealbreakers on unanswered fields.
          soft: p.key === DEMO_VIEWER_KEY
            ? { shabbat: { values: ['friday_dinner', 'full_observance'], weight: 2 }, relationshipIntent: { values: ['long_term', 'marriage'], weight: 3 } }
            : {},
        } },
        privacy: { create: p.privacy },
        consents: { create: consented.map((field) => ({ field })) },
      },
    });
  }
}

async function seedInteractions() {
  // Likes behind conversations (matched) and reactions still waiting for an answer (pending).
  for (const c of DEMO_CONVERSATIONS) {
    if (c.origin.kind !== 'like') continue;
    const other = id(c.withKey);
    const from = id(c.origin.fromKey);
    await prisma.like.create({ data: {
      fromId: from, toId: from === viewer ? other : viewer, targetKind: c.origin.target, targetId: c.origin.targetId,
      comment: c.origin.comment, status: 'matched', createdAt: minutesAgo(c.startedMinutesAgo + 30, now),
    } });
  }
  for (const l of DEMO_LIKES_RECEIVED) {
    await prisma.like.create({ data: {
      fromId: id(l.fromKey), toId: viewer, targetKind: l.target, targetId: l.targetId, comment: l.comment, createdAt: minutesAgo(l.minutesAgo, now),
    } });
  }

  for (const c of DEMO_CONVERSATIONS) {
    await prisma.conversation.create({ data: {
      id: c.id, createdAt: minutesAgo(c.startedMinutesAgo, now),
      members: { create: [{ userId: viewer }, { userId: id(c.withKey) }] },
      messages: { create: c.messages.map((m) => ({ senderId: id(m.from), body: m.body, createdAt: minutesAgo(m.minutesAgo, now) })) },
    } });
    if (c.origin.kind === 'live') {
      await prisma.callLog.create({ data: {
        callerId: id(c.withKey), calleeId: viewer, state: 'ended', demo: true,
        createdAt: minutesAgo(c.startedMinutesAgo + c.origin.callMinutes, now), endedAt: minutesAgo(c.startedMinutesAgo, now),
      } });
    }
  }

  for (const i of DEMO_INTRODUCTIONS) {
    await prisma.introduction.create({ data: {
      id: i.id, introducerId: id(i.introducerKey), personAId: id(i.aKey), personBId: id(i.bKey), note: i.note,
      status: i.status as IntroStatus, createdAt: minutesAgo(i.minutesAgo, now),
      decidedAt: ['connected', 'declined', 'expired'].includes(i.status) ? minutesAgo(i.minutesAgo - 60, now) : null,
    } });
  }

  await prisma.recommendationFeedback.create({ data: { userId: viewer, subjectId: id('clara'), signal: 'more_like_this' } });

  // "Croisés": coarse samples for both people in the same grid cell, inside the window.
  // Snapped exactly like production data (src/crossed); never shown to anyone.
  for (const [n, c] of DEMO_CROSSED.entries()) {
    const spot = PARIS_SPOTS[n % PARIS_SPOTS.length]!;
    for (let t = 0; t < c.times; t++) {
      const at = minutesAgo(60 * (4 + 18 * t + n), now);
      for (const who of [viewer, id(c.key)]) {
        await prisma.$executeRaw`
          INSERT INTO "Sighting" (id, "userId", at, cell)
          VALUES (${`demo-s-${c.key}-${t}-${who === viewer ? 'v' : 'o'}`}, ${who}, ${at},
                  ST_Transform(ST_SnapToGrid(ST_Transform(ST_SetSRID(ST_MakePoint(${spot.lng}, ${spot.lat}), 4326), 3857), ${RULES.locationPrecisionMeters}), 4326)::geography)`;
      }
    }
  }
}

async function main() {
  await wipeDemo();
  await seedRegions();
  await seedPeople();
  await seedInteractions();
  console.log(`Seeded ${DEMO_PEOPLE.length} demo members, ${DEMO_CONVERSATIONS.length} conversations, ${DEMO_INTRODUCTIONS.length} introductions.`);
  console.log(`Demo viewer: ${demoEmail(DEMO_VIEWER_KEY)} (${DEMO_VIEWER_KEY}).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
