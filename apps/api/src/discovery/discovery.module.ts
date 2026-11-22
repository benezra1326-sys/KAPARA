import { Body, Controller, Get, Module, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { RULES } from '@kapara/config';
import { Like, type JewishLife } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { dailyPicks } from './scoring';

const Feedback = z.object({ subjectId: z.string(), signal: z.enum(['more_like_this', 'not_for_me']) });

/** "Pour toi": a finite, explained daily selection. Likes target a photo or a prompt. */
@Controller('for-you')
@UseGuards(AuthGuard)
class DiscoveryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async picks(@CurrentUser() me: AuthUser) {
    const [prefs, feedback, candidates] = await Promise.all([
      this.prisma.preferences.findUnique({ where: { userId: me.id } }),
      this.prisma.recommendationFeedback.findMany({ where: { userId: me.id, signal: 'not_for_me' } }),
      this.prisma.user.findMany({
        where: { id: { not: me.id }, paused: false, deletedAt: null, profile: { isNot: null },
          blocksMade: { none: { blockedId: me.id } }, blocksGot: { none: { blockerId: me.id } } },
        include: { profile: true }, take: 200,
      }),
    ]);
    // TODO(workstream discovery): real distance via PostGIS + mutual dealbreakers + behaviour signals.
    const seeker = {
      ageMin: prefs?.ageMin ?? 18, ageMax: prefs?.ageMax ?? 99, maxDistanceKm: prefs?.maxDistanceKm ?? 50,
      jewishLife: {}, dismissed: new Set(feedback.map((f) => f.subjectId)),
      dealbreakers: (prefs?.dealbreakers ?? {}) as Record<string, string[]>,
      soft: (prefs?.soft ?? {}) as Record<string, { values: string[]; weight: number }>,
    };
    const cs = candidates.map((u) => ({
      id: u.id, distanceKm: 5,
      age: Math.floor((Date.now() - u.profile!.birthDate.getTime()) / 31557600000),
      jewishLife: u.profile!.jewishLife as Partial<JewishLife>,
    }));
    return { date: new Date().toISOString().slice(0, 10), picks: dailyPicks(seeker, cs, RULES.dailyPicks) };
  }

  @Post('feedback')
  async feedback(@CurrentUser() me: AuthUser, @Body(new ZodPipe(Feedback)) b: z.infer<typeof Feedback>) {
    await this.prisma.recommendationFeedback.create({ data: { userId: me.id, ...b } });
    return { ok: true };
  }

  @Post('like')
  async like(@CurrentUser() me: AuthUser, @Body(new ZodPipe(Like)) b: z.infer<typeof Like>) {
    const reciprocal = await this.prisma.like.findUnique({ where: { fromId_toId: { fromId: b.toProfileId, toId: me.id } } });
    const status = reciprocal ? 'matched' : 'pending';
    await this.prisma.like.upsert({
      where: { fromId_toId: { fromId: me.id, toId: b.toProfileId } },
      create: { fromId: me.id, toId: b.toProfileId, targetKind: b.target.kind, targetId: b.target.id, comment: b.comment, status },
      update: { comment: b.comment, status },
    });
    if (reciprocal) await this.prisma.like.update({ where: { id: reciprocal.id }, data: { status: 'matched' } });
    return { matched: Boolean(reciprocal) };
  }
}

@Module({ controllers: [DiscoveryController] })
export class DiscoveryModule {}
