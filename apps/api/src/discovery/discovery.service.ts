import { ConflictException, Injectable } from '@nestjs/common';
import { LAUNCH_REGION, REGIONS, RULES } from '@kapara/config';
import type { JewishLife, Recommendation } from '@kapara/shared';
import { ageOn } from '../common/age';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { localDay, nextDay } from './day';
import { matchableAnswers, rank, type Answers, type Candidate, type Criteria, type Seeker } from './scoring';

const DEFAULT_CRITERIA: Criteria = { ageMin: 18, ageMax: 99, maxDistanceKm: 25, dealbreakers: {}, soft: {} };

type PrefsRow = { ageMin: number; ageMax: number; maxDistanceKm: number; dealbreakers: unknown; soft: unknown } | null;
const toCriteria = (p: PrefsRow): Criteria | null => p && ({
  ageMin: p.ageMin, ageMax: p.ageMax, maxDistanceKm: p.maxDistanceKm,
  dealbreakers: (p.dealbreakers ?? {}) as Criteria['dealbreakers'], soft: (p.soft ?? {}) as Criteria['soft'],
});

interface Row {
  id: string; birthDate: Date; km: number; languages: string[]; jewishLife: unknown;
  ageMin: number | null; ageMax: number | null; maxDistanceKm: number | null; dealbreakers: unknown; soft: unknown;
}

/**
 * "Pour toi": a finite daily selection (RULES.dailyPicks), persisted so it
 * stays the same all day, renewed at local midnight. Hard filters run in SQL
 * (PostGIS distance, mutual gender and age, blocks, already seen); mutual
 * dealbreakers and the explained score run in `scoring.ts`.
 */
@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService, private readonly profiles: ProfilesService) {}

  async today(userId: string) {
    const me = await this.loadMe(userId);
    if (!me?.profile) throw new ConflictException('profile_incomplete');
    const tz = (REGIONS.find((r) => r.code === me.regionCode) ?? LAUNCH_REGION).timezone;
    const day = localDay(tz);

    let picks = await this.prisma.dailyPick.findMany({ where: { userId, day }, orderBy: { position: 'asc' } });
    if (picks.length < RULES.dailyPicks) {
      await this.fill(me, day, picks.map((p) => p.subjectId), RULES.dailyPicks - picks.length, picks.length);
      picks = await this.prisma.dailyPick.findMany({ where: { userId, day }, orderBy: { position: 'asc' } });
    }
    const visible = picks.filter((p) => p.state !== 'dismissed');
    const views = await this.profiles.views(userId, visible.map((p) => p.subjectId), { withDistance: true });
    const byId = new Map(views.map((v) => [v.id, v]));
    const out: Recommendation[] = [];
    for (const p of visible) {
      const profile = byId.get(p.subjectId);
      if (profile) out.push({ profile, score: p.score, reasons: p.reasons as Recommendation['reasons'], state: p.state as Recommendation['state'] });
    }
    return { date: day, timezone: tz, nextRefreshDay: nextDay(day), dailyLimit: RULES.dailyPicks, picks: out };
  }

  private async fill(
    me: NonNullable<Awaited<ReturnType<DiscoveryService['loadMe']>>>, day: string, already: string[], slots: number, offset: number,
  ) {
    const criteria = toCriteria(me.preferences) ?? DEFAULT_CRITERIA;
    const genders = me.preferences?.genders ?? [];
    const signals = await this.signals(me.id);

    const query = (cooldown: boolean) => this.prisma.$queryRaw<Row[]>`
      WITH me AS (
        SELECT u.id, p.gender, p."birthDate", COALESCE(u."homeArea", r.center) AS geo
        FROM "User" u JOIN "Profile" p ON p."userId" = u.id JOIN "Region" r ON r.code = u."regionCode"
        WHERE u.id = ${me.id}
      )
      SELECT c.id, cp."birthDate", cp.languages, cp."jewishLife",
             ST_Distance(me.geo, COALESCE(c."homeArea", cr.center)) / 1000 AS km,
             pr."ageMin", pr."ageMax", pr."maxDistanceKm", pr.dealbreakers, pr.soft
      FROM me, "User" c
      JOIN "Profile" cp ON cp."userId" = c.id
      JOIN "Region" cr ON cr.code = c."regionCode"
      LEFT JOIN "Preferences" pr ON pr."userId" = c.id
      WHERE c.id <> me.id AND c."deletedAt" IS NULL AND NOT c.paused AND c."hiddenAt" IS NULL AND c."suspendedAt" IS NULL
        AND EXISTS (SELECT 1 FROM "Photo" ph WHERE ph."profileId" = c.id)
        AND (cardinality(${genders}::"Gender"[]) = 0 OR cp.gender = ANY(${genders}::"Gender"[]))
        AND (pr.genders IS NULL OR cardinality(pr.genders) = 0 OR me.gender = ANY(pr.genders))
        AND cp."birthDate" <= (current_date - make_interval(years => ${criteria.ageMin}))
        AND cp."birthDate" >  (current_date - make_interval(years => ${criteria.ageMax + 1}))
        AND ST_DWithin(me.geo, COALESCE(c."homeArea", cr.center), ${criteria.maxDistanceKm * 1000})
        AND c.id <> ALL(${already}::text[])
        AND NOT EXISTS (SELECT 1 FROM "Block" b WHERE (b."blockerId" = me.id AND b."blockedId" = c.id) OR (b."blockerId" = c.id AND b."blockedId" = me.id))
        AND NOT EXISTS (SELECT 1 FROM "Like" l WHERE l."fromId" = me.id AND l."toId" = c.id)
        AND NOT EXISTS (SELECT 1 FROM "Like" l WHERE l.status = 'matched' AND l."fromId" = c.id AND l."toId" = me.id)
        AND NOT EXISTS (SELECT 1 FROM "RecommendationFeedback" f WHERE f."userId" = me.id AND f."subjectId" = c.id AND f.signal = 'not_for_me')
        AND (NOT ${cooldown} OR NOT EXISTS (
          SELECT 1 FROM "DailyPick" d WHERE d."userId" = me.id AND d."subjectId" = c.id
            AND d."createdAt" > now() - make_interval(days => ${RULES.picksCooldownDays})))
      ORDER BY km
      LIMIT 500`;
    let rows = await query(true);
    if (!rows.length) rows = await query(false); // small community: allow profiles seen more than two weeks… or earlier
    if (!rows.length) return;

    const consents = await this.prisma.sensitiveConsent.findMany({
      where: { userId: { in: rows.map((r) => r.id) }, revokedAt: null }, select: { userId: true, field: true },
    });
    const consentBy = new Map<string, Set<string>>();
    for (const c of consents) (consentBy.get(c.userId) ?? consentBy.set(c.userId, new Set()).get(c.userId)!).add(c.field);

    const seeker: Seeker = {
      id: me.id, age: ageOn(me.profile!.birthDate), languages: me.profile!.languages,
      answers: matchableAnswers(me.profile!.jewishLife as Partial<JewishLife>, new Set(me.consents.map((c) => c.field))),
      criteria, ...signals,
    };
    const candidates: Candidate[] = rows.map((r) => ({
      id: r.id, age: ageOn(r.birthDate), distanceKm: Number(r.km), languages: r.languages ?? [],
      answers: matchableAnswers(r.jewishLife as Partial<JewishLife>, consentBy.get(r.id) ?? new Set()),
      criteria: r.ageMin == null ? null : toCriteria(r as PrefsRow),
    }));
    const ranked = rank(seeker, candidates, slots, `${me.id}:${day}`);
    await this.prisma.dailyPick.createMany({
      data: ranked.map((r, i) => ({ userId: me.id, day, subjectId: r.id, position: offset + i, score: r.score, reasons: r.reasons as object[] })),
      skipDuplicates: true,
    });
  }

  private loadMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId }, include: { profile: true, preferences: true, consents: { where: { revokedAt: null } } },
    });
  }

  /** Behaviour signals: "not for me", "more like this", likes sent. Only voluntarily shared answers are read. */
  private async signals(userId: string): Promise<Pick<Seeker, 'dismissed' | 'liked' | 'tooFarSignals'>> {
    const since = new Date(Date.now() - 90 * 86400_000);
    const [feedback, likes] = await Promise.all([
      this.prisma.recommendationFeedback.findMany({ where: { userId, createdAt: { gt: since } }, select: { subjectId: true, signal: true, reason: true, createdAt: true } }),
      this.prisma.like.findMany({ where: { fromId: userId, createdAt: { gt: since } }, select: { toId: true }, take: 100 }),
    ]);
    const positiveIds = [...new Set([...feedback.filter((f) => f.signal === 'more_like_this').map((f) => f.subjectId), ...likes.map((l) => l.toId)])];
    const positives = positiveIds.length ? await this.prisma.user.findMany({
      where: { id: { in: positiveIds } },
      select: { profile: { select: { jewishLife: true } }, consents: { where: { revokedAt: null }, select: { field: true } } },
    }) : [];
    const monthAgo = Date.now() - 30 * 86400_000;
    return {
      dismissed: new Set(feedback.filter((f) => f.signal === 'not_for_me').map((f) => f.subjectId)),
      liked: positives.map((p): Answers => matchableAnswers(p.profile?.jewishLife as Partial<JewishLife>, new Set(p.consents.map((c) => c.field)))),
      tooFarSignals: feedback.filter((f) => f.reason === 'too_far' && f.createdAt.getTime() > monthAgo).length,
    };
  }
}
