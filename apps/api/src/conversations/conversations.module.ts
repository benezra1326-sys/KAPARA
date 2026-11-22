import { Body, Controller, Get, Module, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const Send = z.object({ body: z.string().trim().min(1).max(2000) });

/** No read receipts and no "seen at" by design. */
@Controller('conversations')
@UseGuards(AuthGuard)
class ConversationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() me: AuthUser) {
    return this.prisma.conversation.findMany({
      where: { members: { some: { userId: me.id } } },
      include: { members: { select: { userId: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  @Get(':id/messages')
  async messages(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    await this.assertMember(me.id, id);
    return this.prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' }, take: 200 });
  }

  @Post(':id/messages')
  async send(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body(new ZodPipe(Send)) b: z.infer<typeof Send>) {
    await this.assertMember(me.id, id);
    // TODO(workstream safety): kindness nudge before sending hurtful messages.
    return this.prisma.message.create({ data: { conversationId: id, senderId: me.id, body: b.body } });
  }

  private async assertMember(userId: string, conversationId: string) {
    const m = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!m) throw new NotFoundException();
  }
}

@Module({ controllers: [ConversationsController] })
export class ConversationsModule {}
