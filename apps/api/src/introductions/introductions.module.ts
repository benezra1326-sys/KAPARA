import { Body, Controller, ForbiddenException, Get, Module, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { IntroductionRequest } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Double opt-in introductions. Each person only sees "someone you know wants
 * to introduce you" plus the note; neither identity is revealed to the other
 * until both accepted. Members can opt out of being introducible.
 */
@Controller('introductions')
@UseGuards(AuthGuard)
class IntroductionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async propose(@CurrentUser() me: AuthUser, @Body(new ZodPipe(IntroductionRequest)) b: z.infer<typeof IntroductionRequest>) {
    if (b.personAId === b.personBId || [b.personAId, b.personBId].includes(me.id)) throw new ForbiddenException('invalid_pair');
    const settings = await this.prisma.privacySettings.findMany({ where: { userId: { in: [b.personAId, b.personBId] } } });
    if (settings.some((s) => !s.introducible)) throw new ForbiddenException('not_introducible');
    return this.prisma.introduction.create({ data: { introducerId: me.id, ...b } });
  }

  @Get('inbox')
  inbox(@CurrentUser() me: AuthUser) {
    return this.prisma.introduction.findMany({
      where: { OR: [{ personAId: me.id }, { personBId: me.id }], status: { in: ['proposed', 'accepted_by_a', 'accepted_by_b'] } },
      select: { id: true, note: true, status: true, createdAt: true, introducerId: true },
    });
  }

  @Post(':id/respond')
  async respond(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body() b: { accept: boolean }) {
    const intro = await this.prisma.introduction.findUnique({ where: { id } });
    if (!intro || ![intro.personAId, intro.personBId].includes(me.id)) throw new NotFoundException();
    if (!b?.accept) return this.prisma.introduction.update({ where: { id }, data: { status: 'declined', decidedAt: new Date() } });
    const isA = intro.personAId === me.id;
    const other = isA ? 'accepted_by_b' : 'accepted_by_a';
    const status = intro.status === other ? 'connected' : isA ? 'accepted_by_a' : 'accepted_by_b';
    // TODO(workstream intros): on "connected", open a conversation for both.
    return this.prisma.introduction.update({ where: { id }, data: { status, decidedAt: status === 'connected' ? new Date() : null } });
  }
}

@Module({ controllers: [IntroductionsController] })
export class IntroductionsModule {}
