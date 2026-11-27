import { Body, Controller, Delete, ForbiddenException, Get, Global, HttpCode, HttpException, HttpStatus, Injectable, Logger, Module, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ReportCreate } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

/**
 * One block applies everywhere: Pour toi, Croisés, Live, introductions and
 * conversations. Other modules ask this service instead of querying Block.
 */
@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  /** Everyone hidden from `userId`, in both directions. */
  async hiddenFrom(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
  }

  async eitherBlocked(a: string, b: string): Promise<boolean> {
    const n = await this.prisma.block.count({
      where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    });
    return n > 0;
  }

  /** Blocking closes shared conversations and pending introductions silently. */
  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new ForbiddenException('cannot_block_self');
    const shared = await this.prisma.conversation.findMany({
      where: { closedAt: null, AND: [{ members: { some: { userId: blockerId } } }, { members: { some: { userId: blockedId } } }] },
      select: { id: true },
    });
    await this.prisma.$transaction([
      this.prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      }),
      this.prisma.conversation.updateMany({ where: { id: { in: shared.map((c) => c.id) } }, data: { closedAt: new Date() } }),
      this.prisma.introduction.updateMany({
        where: {
          status: { in: ['proposed', 'accepted_by_a', 'accepted_by_b'] },
          OR: [
            { personAId: blockerId, personBId: blockedId }, { personAId: blockedId, personBId: blockerId },
            { introducerId: blockedId, OR: [{ personAId: blockerId }, { personBId: blockerId }] },
          ],
        },
        data: { status: 'declined', decidedAt: new Date() },
      }),
    ]);
  }
}

@Controller('safety')
@UseGuards(AuthGuard)
class SafetyController {
  private readonly log = new Logger('Safety');
  constructor(private readonly prisma: PrismaService, private readonly blocks: BlockService) {}

  @Get('blocks')
  async list(@CurrentUser() me: AuthUser) {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: me.id },
      orderBy: { createdAt: 'desc' },
      include: { blocked: { select: { id: true, profile: { select: { firstName: true } } } } },
    });
    return rows.map((r) => ({ userId: r.blocked.id, firstName: r.blocked.profile?.firstName ?? '', blockedAt: r.createdAt.toISOString() }));
  }

  @Post('blocks/:userId')
  @HttpCode(204)
  async block(@CurrentUser() me: AuthUser, @Param('userId') userId: string) {
    await this.blocks.block(me.id, userId);
  }

  /** Unblocking does not reopen anything: conversations stay closed. */
  @Delete('blocks/:userId')
  @HttpCode(204)
  async unblock(@CurrentUser() me: AuthUser, @Param('userId') userId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId: me.id, blockedId: userId } });
  }

  @Post('reports')
  @HttpCode(201)
  async report(@CurrentUser() me: AuthUser, @Body(new ZodPipe(ReportCreate)) b: ReportCreate) {
    if (b.userId === me.id) throw new ForbiddenException('cannot_report_self');
    // Anti-abuse: a member cannot flood the queue (blocking stays unlimited).
    const recent = await this.prisma.report.count({ where: { reporterId: me.id, createdAt: { gt: new Date(Date.now() - 86_400_000) } } });
    if (recent >= 20) throw new HttpException({ code: 'too_many_reports' }, HttpStatus.TOO_MANY_REQUESTS);
    const target = await this.prisma.user.findUnique({ where: { id: b.userId }, select: { id: true } });
    if (!target) throw new NotFoundException('member_not_found');
    const photoId = b.photoId && (await this.prisma.photo.count({ where: { id: b.photoId, profileId: b.userId } })) ? b.photoId : null;
    const r = await this.prisma.report.create({
      data: { reporterId: me.id, reportedId: b.userId, reason: b.reason, details: b.details, context: b.context, photoId },
    });
    if (b.alsoBlock) await this.blocks.block(me.id, b.userId);
    // Ids and reason only: details may contain sensitive information.
    this.log.warn({ reportId: r.id, reason: b.reason, context: b.context }, 'report received');
    // Persisted before answering: the app's "sent" is a real one.
    return { id: r.id, status: r.status, createdAt: r.createdAt, blocked: b.alsoBlock };
  }
}

@Global()
@Module({ controllers: [SafetyController], providers: [BlockService], exports: [BlockService] })
export class SafetyModule {}
