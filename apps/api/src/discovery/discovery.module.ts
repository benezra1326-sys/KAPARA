import { Body, Controller, Get, HttpCode, Module, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { Like, RecommendationFeedbackInput } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesModule } from '../profiles/profiles.module';
import { ProfilesService } from '../profiles/profiles.service';
import { DiscoveryService } from './discovery.service';

/** "Pour toi": a finite, explained daily selection. Likes target a photo or a prompt. */
@Controller('for-you')
@UseGuards(AuthGuard)
class DiscoveryController {
  constructor(private readonly prisma: PrismaService, private readonly discovery: DiscoveryService, private readonly profiles: ProfilesService) {}

  @Get()
  picks(@CurrentUser() me: AuthUser) {
    return this.discovery.today(me.id);
  }

  /** Voluntary feedback. "Not for me" removes the profile from today's picks and future ones. */
  @Post('feedback')
  @HttpCode(200)
  async feedback(@CurrentUser() me: AuthUser, @Body(new ZodPipe(RecommendationFeedbackInput)) b: RecommendationFeedbackInput) {
    if (b.subjectId === me.id) throw new NotFoundException();
    await this.prisma.recommendationFeedback.create({ data: { userId: me.id, subjectId: b.subjectId, signal: b.signal, reason: b.reason } });
    if (b.signal === 'not_for_me') {
      await this.prisma.dailyPick.updateMany({ where: { userId: me.id, subjectId: b.subjectId, state: 'new' }, data: { state: 'dismissed' } });
    }
    return { ok: true };
  }

  /**
   * A like points at a specific photo or prompt of a profile the member can
   * see. Mutual likes become a match and open a conversation.
   */
  @Post('like')
  @HttpCode(200)
  async like(@CurrentUser() me: AuthUser, @Body(new ZodPipe(Like)) b: Like) {
    const target = b.toProfileId === me.id ? undefined : await this.profiles.view(me.id, b.toProfileId);
    if (!target) throw new NotFoundException('profile_not_found');
    const ok = b.target.kind === 'photo' ? target.photos.some((p) => p.id === b.target.id) : target.prompts.some((p) => p.id === b.target.id);
    if (!ok) throw new NotFoundException('target_not_found');

    const reciprocal = await this.prisma.like.findUnique({ where: { fromId_toId: { fromId: b.toProfileId, toId: me.id } } });
    const status = reciprocal ? 'matched' : 'pending';
    await this.prisma.$transaction([
      this.prisma.like.upsert({
        where: { fromId_toId: { fromId: me.id, toId: b.toProfileId } },
        create: { fromId: me.id, toId: b.toProfileId, targetKind: b.target.kind, targetId: b.target.id, comment: b.comment, status },
        update: { targetKind: b.target.kind, targetId: b.target.id, comment: b.comment, status },
      }),
      ...(reciprocal ? [this.prisma.like.update({ where: { id: reciprocal.id }, data: { status: 'matched' } })] : []),
      this.prisma.dailyPick.updateMany({ where: { userId: me.id, subjectId: b.toProfileId }, data: { state: 'liked' } }),
    ]);
    let conversationId: string | undefined;
    if (reciprocal) conversationId = await this.ensureConversation(me.id, b.toProfileId);
    return { matched: Boolean(reciprocal), conversationId };
  }

  /** Likes I received and haven't answered, with the photo or prompt they reacted to. */
  @Get('likes-received')
  async received(@CurrentUser() me: AuthUser) {
    const likes = await this.prisma.like.findMany({ where: { toId: me.id, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 50 });
    const views = await this.profiles.views(me.id, likes.map((l) => l.fromId), { withDistance: true });
    const byId = new Map(views.map((v) => [v.id, v]));
    return likes.filter((l) => byId.has(l.fromId)).map((l) => ({
      profile: byId.get(l.fromId)!, target: { kind: l.targetKind, id: l.targetId }, comment: l.comment ?? undefined, at: l.createdAt,
    }));
  }

  private async ensureConversation(a: string, b: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { AND: [{ members: { some: { userId: a } } }, { members: { some: { userId: b } } }] }, select: { id: true },
    });
    if (existing) return existing.id;
    const c = await this.prisma.conversation.create({ data: { members: { create: [{ userId: a }, { userId: b }] } } });
    return c.id;
  }
}

@Module({ imports: [ProfilesModule], controllers: [DiscoveryController], providers: [DiscoveryService] })
export class DiscoveryModule {}
