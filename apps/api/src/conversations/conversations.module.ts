import {
  Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Post, Query,
  UnprocessableEntityException, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { SendMessage, type ChatMessage, type ConversationSummary } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { BlockService } from '../safety/safety.module';
import { mayHurt } from './kindness';

type Origin = ConversationSummary['origin'];
const PAGE = 50;

const toMessage = (m: { id: string; senderId: string; body: string; createdAt: Date }, me: string): ChatMessage =>
  ({ id: m.id, senderId: m.senderId, mine: m.senderId === me, body: m.body, createdAt: m.createdAt.toISOString() });

/**
 * Conversations open after a mutual reaction, an accepted introduction or a
 * Live call. Exported so those modules can open one.
 */
@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Opens (or returns the already open) conversation between two members. */
  async open(a: string, b: string, origin: Origin, introductionId?: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { closedAt: null, AND: [{ members: { some: { userId: a } } }, { members: { some: { userId: b } } }] },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: { origin, introductionId, members: { create: [{ userId: a }, { userId: b }] } },
    });
  }
}

/** No read receipts, no "seen at", no typing indicator: by design. */
@Controller('conversations')
@UseGuards(AuthGuard)
class ConversationsController {
  constructor(private readonly prisma: PrismaService, private readonly blocks: BlockService) {}

  @Get()
  async list(@CurrentUser() me: AuthUser): Promise<ConversationSummary[]> {
    const hidden = await this.blocks.hiddenFrom(me.id);
    const rows = await this.prisma.conversation.findMany({
      where: { closedAt: null, members: { some: { userId: me.id } } },
      include: {
        members: { include: { user: { select: { id: true, isDemo: true, deletedAt: true, profile: { select: { firstName: true, photos: { orderBy: { position: 'asc' }, take: 1 } } } } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return rows
      .map((c) => ({ c, other: c.members.find((m) => m.userId !== me.id)?.user }))
      .filter(({ other }) => other && !other.deletedAt && !hidden.has(other.id))
      .map(({ c, other }) => ({
        id: c.id,
        other: { id: other!.id, firstName: other!.profile?.firstName ?? '', photoUrl: other!.profile?.photos[0]?.url ?? null, isDemo: other!.isDemo },
        origin: (['like', 'introduction', 'live'].includes(c.origin) ? c.origin : 'other') as Origin,
        lastMessage: c.messages[0] ? toMessage(c.messages[0], me.id) : null,
        createdAt: c.createdAt.toISOString(),
      }))
      .sort((x, y) => (y.lastMessage?.createdAt ?? y.createdAt).localeCompare(x.lastMessage?.createdAt ?? x.createdAt));
  }

  /** Oldest first, paginated backwards with `?before=<ISO date>`. */
  @Get(':id/messages')
  async messages(@CurrentUser() me: AuthUser, @Param('id') id: string, @Query('before') before?: string): Promise<ChatMessage[]> {
    await this.assertMember(me.id, id);
    const date = before ? new Date(before) : undefined;
    const rows = await this.prisma.message.findMany({
      where: { conversationId: id, ...(date && !Number.isNaN(+date) ? { createdAt: { lt: date } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
    });
    return rows.reverse().map((m) => toMessage(m, me.id));
  }

  @Post(':id/messages')
  async send(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body(new ZodPipe(SendMessage)) b: SendMessage): Promise<ChatMessage> {
    const conv = await this.assertMember(me.id, id);
    if (conv.closedAt) throw new ForbiddenException('conversation_closed');
    const other = conv.members.find((m) => m.userId !== me.id)?.userId;
    if (other && (await this.blocks.eitherBlocked(me.id, other))) throw new ForbiddenException('conversation_closed');
    // The member sees "Send anyway?" and decides. Nothing is stored or logged.
    if (!b.confirmed && mayHurt(b.body)) throw new UnprocessableEntityException('kindness_check');
    const m = await this.prisma.message.create({ data: { conversationId: id, senderId: me.id, body: b.body } });
    // TODO(notifications): push to `other` unless ShabbatService.isResting(other); then hold until the window ends.
    return toMessage(m, me.id);
  }

  /** Closing ends the conversation for both, without notifying the other. */
  @Delete(':id')
  @HttpCode(204)
  async close(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    await this.assertMember(me.id, id);
    await this.prisma.conversation.update({ where: { id }, data: { closedAt: new Date() } });
  }

  private async assertMember(userId: string, conversationId: string) {
    const c = await this.prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId } } },
      include: { members: { select: { userId: true } } },
    });
    if (!c) throw new NotFoundException();
    return c;
  }
}

@Module({ controllers: [ConversationsController], providers: [ConversationsService], exports: [ConversationsService] })
export class ConversationsModule {}
