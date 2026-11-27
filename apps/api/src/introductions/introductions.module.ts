import {
  Body, Controller, ForbiddenException, Get, Injectable, Logger, Module, NotFoundException, OnModuleDestroy, OnModuleInit,
  Param, Post, UseGuards,
} from '@nestjs/common';
import { IntroductionRequest, IntroductionResponse, type IntroductionReceived, type IntroductionSent } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { ConversationsModule, ConversationsService } from '../conversations/conversations.module';
import { PrismaService } from '../prisma/prisma.service';
import { BlockService } from '../safety/safety.module';
import { ShabbatService } from '../shabbat/shabbat.module';
import { INTRO_TTL_DAYS, IntroError, MAX_OPEN_PER_INTRODUCER, OPEN_STATUSES, myAnswer, outcome, respond, type IntroStatus } from './intro-machine';

import { ageOn as ageOf } from '../common/age';
const mini = { id: true, isDemo: true, profile: { select: { firstName: true, birthDate: true, photos: { orderBy: { position: 'asc' as const }, take: 1 } } } };

/**
 * Double opt-in introductions. Each person receives the proposal privately
 * and can see the other's profile to decide, but nobody learns the other's
 * answer until both said yes. Members can opt out (PrivacySettings.introducible).
 */
@Controller('introductions')
@UseGuards(AuthGuard)
class IntroductionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlockService,
    private readonly conversations: ConversationsService,
  ) {}

  @Post()
  async propose(@CurrentUser() me: AuthUser, @Body(new ZodPipe(IntroductionRequest)) b: IntroductionRequest) {
    const { personAId: a, personBId: bId } = b;
    if (a === bId || a === me.id || bId === me.id) throw new ForbiddenException('invalid_pair');

    const people = await this.prisma.user.findMany({
      where: { id: { in: [a, bId] }, deletedAt: null, paused: false },
      select: { id: true, privacy: { select: { introducible: true } } },
    });
    // Same answer for "does not exist", "paused" and "opted out": nothing leaks.
    if (people.length !== 2 || people.some((p) => p.privacy && !p.privacy.introducible)) throw new ForbiddenException('not_introducible');
    if ((await this.blocks.eitherBlocked(me.id, a)) || (await this.blocks.eitherBlocked(me.id, bId)) || (await this.blocks.eitherBlocked(a, bId))) {
      throw new ForbiddenException('not_introducible');
    }

    const open = await this.prisma.introduction.count({ where: { introducerId: me.id, status: { in: OPEN_STATUSES } } });
    if (open >= MAX_OPEN_PER_INTRODUCER) throw new ForbiddenException('too_many_open_introductions');
    const dup = await this.prisma.introduction.findFirst({
      where: { status: { in: OPEN_STATUSES }, OR: [{ personAId: a, personBId: bId }, { personAId: bId, personBId: a }] },
    });
    if (dup) throw new ForbiddenException('already_proposed');

    const intro = await this.prisma.introduction.create({
      data: { introducerId: me.id, personAId: a, personBId: bId, note: b.note, expiresAt: new Date(Date.now() + INTRO_TTL_DAYS * 86_400_000) },
    });
    return { id: intro.id };
  }

  /** Proposals I received. */
  @Get('inbox')
  async inbox(@CurrentUser() me: AuthUser): Promise<IntroductionReceived[]> {
    const rows = await this.prisma.introduction.findMany({
      where: { OR: [{ personAId: me.id }, { personBId: me.id }], status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    const ids = [...new Set(rows.flatMap((r) => [r.introducerId, r.personAId, r.personBId]))];
    const users = new Map((await this.prisma.user.findMany({ where: { id: { in: ids } }, select: mini })).map((u) => [u.id, u]));
    return rows.flatMap((r) => {
      const side = r.personAId === me.id ? 'a' : 'b';
      const other = users.get(side === 'a' ? r.personBId : r.personAId);
      const introducer = users.get(r.introducerId);
      if (!other?.profile || !introducer?.profile) return [];
      return [{
        id: r.id,
        introducer: { id: introducer.id, firstName: introducer.profile.firstName },
        other: {
          id: other.id, firstName: other.profile.firstName, age: ageOf(other.profile.birthDate),
          photoUrl: other.profile.photos[0]?.url ?? null, isDemo: other.isDemo,
        },
        note: r.note,
        myAnswer: myAnswer(r.status as IntroStatus, side),
        createdAt: r.createdAt.toISOString(),
      }];
    });
  }

  /** Proposals I made: outcome only. */
  @Get('sent')
  async sent(@CurrentUser() me: AuthUser): Promise<IntroductionSent[]> {
    const rows = await this.prisma.introduction.findMany({ where: { introducerId: me.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    const ids = [...new Set(rows.flatMap((r) => [r.personAId, r.personBId]))];
    const names = new Map((await this.prisma.profile.findMany({ where: { userId: { in: ids } }, select: { userId: true, firstName: true } }))
      .map((p) => [p.userId, p.firstName]));
    return rows.map((r) => ({
      id: r.id,
      personA: { id: r.personAId, firstName: names.get(r.personAId) ?? '' },
      personB: { id: r.personBId, firstName: names.get(r.personBId) ?? '' },
      outcome: outcome(r.status as IntroStatus),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Post(':id/respond')
  async answer(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body(new ZodPipe(IntroductionResponse)) b: IntroductionResponse) {
    const intro = await this.prisma.introduction.findUnique({ where: { id } });
    if (!intro || (intro.personAId !== me.id && intro.personBId !== me.id)) throw new NotFoundException();
    const side = intro.personAId === me.id ? 'a' : 'b';
    let status: IntroStatus;
    try {
      status = respond(intro.status as IntroStatus, side, b.accept);
    } catch (e) {
      if (e instanceof IntroError) throw new ForbiddenException(e.message);
      throw e;
    }
    // Optimistic concurrency: only apply if nobody answered in between.
    const updated = await this.prisma.introduction.updateMany({
      where: { id, status: intro.status },
      data: { status, decidedAt: OPEN_STATUSES.includes(status) ? null : new Date() },
    });
    if (updated.count === 0) throw new ForbiddenException('intro_changed_retry');
    if (status !== 'connected') return { status: b.accept ? 'waiting' : 'declined' };
    const conv = await this.conversations.open(intro.personAId, intro.personBId, 'introduction', intro.id);
    return { status: 'connected', conversationId: conv.id };
  }
}

/** Quiet expiry. A proposal never lapses while one of the two is in Shabbat mode. */
@Injectable()
class IntroductionsExpiry implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly log = new Logger('Introductions');
  constructor(private readonly prisma: PrismaService, private readonly shabbat: ShabbatService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.sweep().catch((e) => this.log.error(e)), 3_600_000);
    this.timer.unref();
  }
  onModuleDestroy() { clearInterval(this.timer); }

  async sweep(now = new Date()) {
    const due = await this.prisma.introduction.findMany({
      where: { status: { in: OPEN_STATUSES }, expiresAt: { lt: now } },
      select: { id: true, personAId: true, personBId: true },
      take: 500,
    });
    for (const i of due) {
      const resting = (await this.shabbat.isResting(i.personAId, now)) || (await this.shabbat.isResting(i.personBId, now));
      await this.prisma.introduction.update({
        where: { id: i.id },
        data: resting ? { expiresAt: new Date(now.getTime() + 26 * 3_600_000) } : { status: 'expired', decidedAt: now },
      });
    }
  }
}

@Module({ imports: [ConversationsModule], controllers: [IntroductionsController], providers: [IntroductionsExpiry] })
export class IntroductionsModule {}
