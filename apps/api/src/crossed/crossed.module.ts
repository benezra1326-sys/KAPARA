import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { RULES } from '@kapara/config';
import {
  CrossedPing, CrossedSettings, SensitiveZoneCreate, crossedTimes,
  type CrossedItem, type SensitiveZone,
} from '@kapara/shared';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { BlockService } from '../safety/safety.module';
import { ShabbatService } from '../shabbat/shabbat.module';

import { ageOn as ageOf } from '../common/age';
const MIN_PING_GAP_SECONDS = 5 * 60;

/**
 * Snap to the metric grid, as SQL. Arguments are positional parameter
 * numbers (never values). The raw point never reaches a table.
 */
const snapped = (lngParam: number, latParam: number) =>
  `ST_Transform(ST_SnapToGrid(ST_Transform(ST_SetSRID(ST_MakePoint($${lngParam}::float8, $${latParam}::float8), 4326), 3857), ${RULES.locationPrecisionMeters}), 4326)::geography`;

/**
 * "Croisés" — stricter than the market (see docs/benchmark.md):
 * - both members opt in; switching off erases history immediately;
 * - the device rounds to ~110 m, the server snaps to a 150 m grid;
 * - nothing is recorded near sensitive zones (home, work…) or during Shabbat mode;
 * - crossings show after a delay, never with a time, place or exact count;
 * - samples are purged after the window (72 h).
 */
@Controller('crossed')
@UseGuards(AuthGuard)
class CrossedController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlockService,
    private readonly shabbat: ShabbatService,
  ) {}

  @Get('settings')
  async settings(@CurrentUser() me: AuthUser) {
    const p = await this.prisma.privacySettings.findUnique({ where: { userId: me.id } });
    return { enabled: Boolean(p?.crossedEnabled) };
  }

  @Put('settings')
  async setSettings(@CurrentUser() me: AuthUser, @Body(new ZodPipe(CrossedSettings)) b: z.infer<typeof CrossedSettings>) {
    await this.prisma.$transaction([
      this.prisma.privacySettings.upsert({
        where: { userId: me.id },
        create: { userId: me.id, crossedEnabled: b.enabled },
        update: { crossedEnabled: b.enabled },
      }),
      ...(b.enabled ? [] : [this.prisma.sighting.deleteMany({ where: { userId: me.id } })]),
    ]);
    return { enabled: b.enabled };
  }

  /** Foreground sample. Silently not recorded when it should not be. */
  @Post('ping')
  async ping(@CurrentUser() me: AuthUser, @Body(new ZodPipe(CrossedPing)) p: z.infer<typeof CrossedPing>) {
    const u = await this.prisma.user.findUnique({ where: { id: me.id }, select: { paused: true, privacy: { select: { crossedEnabled: true } } } });
    if (!u?.privacy?.crossedEnabled) throw new ForbiddenException('crossed_disabled');
    if (u.paused) return { recorded: false };
    if (await this.shabbat.isResting(me.id)) return { recorded: false };
    const cell = snapped(4, 5);
    // One statement: rate limit + sensitive-zone exclusion + insert.
    const inserted = await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Sighting" (id, "userId", at, cell)
       SELECT gen_random_uuid()::text, $1, now(), ${cell}
       WHERE NOT EXISTS (SELECT 1 FROM "SensitiveZone" z WHERE z."userId" = $1 AND ST_DWithin(z.cell, ${cell}, $2))
         AND NOT EXISTS (SELECT 1 FROM "Sighting" s WHERE s."userId" = $1 AND s.at > now() - make_interval(secs => $3))`,
      me.id, RULES.crossedSensitiveZoneMeters, MIN_PING_GAP_SECONDS, p.lng, p.lat,
    );
    // Same answer whatever the reason, so the response reveals nothing.
    return { recorded: inserted > 0 };
  }

  @Get()
  async list(@CurrentUser() me: AuthUser): Promise<CrossedItem[]> {
    const mine = await this.prisma.privacySettings.findUnique({ where: { userId: me.id } });
    if (!mine?.crossedEnabled) return [];
    const rows = await this.prisma.$queryRaw<{ userId: string; days: bigint; last: Date }[]>`
      SELECT other."userId", count(DISTINCT date_trunc('day', mine.at)) AS days, max(mine.at) AS last
      FROM "Sighting" mine
      JOIN "Sighting" other ON other."userId" <> mine."userId"
        AND abs(extract(epoch FROM other.at - mine.at)) < ${RULES.crossedTimeToleranceMinutes * 60}
        AND ST_DWithin(mine.cell, other.cell, ${RULES.crossedRadiusMeters})
      JOIN "PrivacySettings" ps ON ps."userId" = other."userId" AND ps."crossedEnabled"
      JOIN "User" u ON u.id = other."userId" AND u."deletedAt" IS NULL AND NOT u.paused AND u."hiddenAt" IS NULL AND u."suspendedAt" IS NULL
      WHERE mine."userId" = ${me.id}
        AND mine.at > now() - make_interval(hours => ${RULES.crossedWindowHours})
        AND mine.at < now() - make_interval(hours => ${RULES.crossedDisplayDelayHours})
        AND other.at < now() - make_interval(hours => ${RULES.crossedDisplayDelayHours})
      GROUP BY other."userId"
      ORDER BY max(mine.at) DESC
      LIMIT 30`;
    const hidden = await this.blocks.hiddenFrom(me.id);
    const ids = rows.map((r) => r.userId).filter((id) => !hidden.has(id));
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, isDemo: true, verifiedAt: true, profile: { select: { firstName: true, birthDate: true, photos: { orderBy: { position: 'asc' }, take: 1 } } } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.flatMap((r) => {
      const u = byId.get(r.userId);
      if (!u?.profile) return [];
      return [{
        userId: u.id, firstName: u.profile.firstName, age: ageOf(u.profile.birthDate),
        photoUrl: u.profile.photos[0]?.url ?? null, isDemo: u.isDemo, verified: Boolean(u.verifiedAt),
        times: crossedTimes(Number(r.days)),
      }];
    });
  }

  /** Erase my samples now (the feature stays on). */
  @Delete('history')
  @HttpCode(204)
  async clear(@CurrentUser() me: AuthUser) {
    await this.prisma.sighting.deleteMany({ where: { userId: me.id } });
  }

  // ── Sensitive zones ──────────────────────────────────────────────────────

  @Get('zones')
  async zones(@CurrentUser() me: AuthUser): Promise<SensitiveZone[]> {
    const rows = await this.prisma.sensitiveZone.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'asc' } });
    return rows.map((z) => ({ id: z.id, kind: z.kind as SensitiveZone['kind'], createdAt: z.createdAt.toISOString() }));
  }

  /** Adding a zone also erases samples already recorded around it. */
  @Post('zones')
  async addZone(@CurrentUser() me: AuthUser, @Body(new ZodPipe(SensitiveZoneCreate)) b: z.infer<typeof SensitiveZoneCreate>) {
    const count = await this.prisma.sensitiveZone.count({ where: { userId: me.id } });
    if (count >= 5) throw new ForbiddenException('too_many_zones');
    const [row] = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "SensitiveZone" (id, "userId", kind, cell) VALUES (gen_random_uuid()::text, $1, $2, ${snapped(3, 4)}) RETURNING id`,
      me.id, b.kind, b.lng, b.lat,
    );
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "Sighting" WHERE "userId" = $1 AND ST_DWithin(cell, ${snapped(3, 4)}, $2)`,
      me.id, RULES.crossedSensitiveZoneMeters, b.lng, b.lat,
    );
    return { id: row!.id, kind: b.kind };
  }

  @Delete('zones/:id')
  @HttpCode(204)
  async removeZone(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    await this.prisma.sensitiveZone.deleteMany({ where: { id, userId: me.id } });
  }
}

/** Samples never outlive the window. */
@Injectable()
class SightingPurge implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly log = new Logger('Crossed');
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.purge().catch((e) => this.log.error(e)), 15 * 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { clearInterval(this.timer); }
  purge() {
    return this.prisma.sighting.deleteMany({ where: { at: { lt: new Date(Date.now() - RULES.crossedWindowHours * 3_600_000) } } });
  }
}

@Module({ controllers: [CrossedController], providers: [SightingPurge] })
export class CrossedModule {}
