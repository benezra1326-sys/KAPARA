import { Body, Controller, ForbiddenException, Get, Module, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { RULES } from '@kapara/config';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const Ping = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

/**
 * "Croisés". Requires both members to opt in. Positions are snapped to a
 * grid (ST_SnapToGrid in a metric projection) before storage and never
 * returned; results show only "croisé récemment", never time or place.
 */
@Controller('crossed')
@UseGuards(AuthGuard)
class CrossedController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('ping')
  async ping(@CurrentUser() me: AuthUser, @Body(new ZodPipe(Ping)) p: z.infer<typeof Ping>) {
    const privacy = await this.prisma.privacySettings.findUnique({ where: { userId: me.id } });
    if (!privacy?.crossedEnabled) throw new ForbiddenException('crossed_disabled');
    const g = RULES.locationPrecisionMeters;
    await this.prisma.$executeRaw`
      INSERT INTO "Sighting" (id, "userId", at, cell)
      VALUES (gen_random_uuid()::text, ${me.id}, now(),
        ST_Transform(ST_SnapToGrid(ST_Transform(ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326), 3857), ${g}), 4326)::geography)`;
    return { ok: true };
  }

  @Get()
  async list(@CurrentUser() me: AuthUser) {
    const rows = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT DISTINCT other."userId"
      FROM "Sighting" mine
      JOIN "Sighting" other ON other."userId" <> mine."userId"
        AND abs(extract(epoch FROM other.at - mine.at)) < 3600
        AND ST_DWithin(mine.cell, other.cell, ${RULES.crossedRadiusMeters})
      JOIN "PrivacySettings" ps ON ps."userId" = other."userId" AND ps."crossedEnabled"
      WHERE mine."userId" = ${me.id}
        AND mine.at > now() - make_interval(hours => ${RULES.crossedWindowHours})
        AND NOT EXISTS (SELECT 1 FROM "Block" b WHERE (b."blockerId" = ${me.id} AND b."blockedId" = other."userId")
                                               OR (b."blockerId" = other."userId" AND b."blockedId" = ${me.id}))
      LIMIT 30`;
    return rows.map((r) => ({ userId: r.userId, label: 'crossed_recently' }));
  }
}

@Module({ controllers: [CrossedController] })
export class CrossedModule {}
