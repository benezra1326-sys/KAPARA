import {
  Body, CanActivate, Controller, Delete, ExecutionContext, ForbiddenException, Get, HttpCode, Injectable, Logger, Module,
  NotFoundException, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { AuthModule } from '../auth/auth.module';
import { SessionsService } from '../auth/sessions.service';
import { ageOn } from '../common/age';
import { env } from '../common/env';
import { ZodPipe } from '../common/zod.pipe';
import { MediaModule } from '../media/media.module';
import { PhotoStorage } from '../media/storage';
import { PrismaService } from '../prisma/prisma.service';
import { accountTransition, isModeratorEmail, normalizeStatus, REPORT_STATUSES } from './moderation-rules';

/** Only the people listed in MODERATOR_EMAILS. Checked on every request, against the database e-mail. */
@Injectable()
class ModeratorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) return false;
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true, deletedAt: true, suspendedAt: true } });
    if (!u || u.deletedAt || u.suspendedAt || !isModeratorEmail(u.email, env().MODERATOR_EMAILS)) throw new ForbiddenException('not_a_moderator');
    return true;
  }
}

const Note = z.object({ note: z.string().trim().max(1000).optional(), reportId: z.string().max(40).optional() });
const Decision = z.object({ decision: z.enum(['dismissed', 'actioned']), note: z.string().trim().max(1000).optional() });
const Status = z.enum(REPORT_STATUSES).optional();

/**
 * Moderation: reports are persisted with a status and an update date; each
 * decision writes an audit entry (who, what, when, why). Actions: hide a
 * profile, suspend (sign-in refused, sessions revoked, conversations closed),
 * restore after review, remove a reported photo (file deleted). Nothing is
 * confirmed to the moderator before it is saved.
 */
@Controller('moderation')
@UseGuards(AuthGuard)
class ModerationController {
  private readonly log = new Logger('Moderation');
  constructor(private readonly prisma: PrismaService, private readonly sessions: SessionsService, private readonly storage: PhotoStorage) {}

  /** For the app: show the moderation screen or not. Never an error. */
  @Get('me')
  async me(@CurrentUser() me: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id: me.id }, select: { email: true } });
    return { moderator: isModeratorEmail(u?.email, env().MODERATOR_EMAILS) };
  }

  @Get('reports')
  @UseGuards(ModeratorGuard)
  async reports(@Query('status', new ZodPipe(Status)) status?: z.infer<typeof Status>) {
    const statuses = status === 'dismissed' ? ['dismissed', 'reviewed'] : status ? [status] : undefined;
    const rows = await this.prisma.report.findMany({
      where: statuses ? { status: { in: statuses } } : {}, orderBy: { createdAt: 'desc' }, take: 200,
    });
    const ids = [...new Set(rows.flatMap((r) => [r.reportedId, r.reporterId]))];
    const people = await this.people(ids);
    const counts = await this.prisma.report.groupBy({ by: ['status'], _count: { _all: true } });
    return {
      counts: Object.fromEntries(REPORT_STATUSES.map((s) => [s, counts.filter((c) => normalizeStatus(c.status) === s).reduce((n, c) => n + c._count._all, 0)])),
      reports: rows.map((r) => ({
        id: r.id, reason: r.reason, details: r.details, context: r.context, status: normalizeStatus(r.status), photoId: r.photoId,
        createdAt: r.createdAt, updatedAt: r.updatedAt, decisionNote: r.decisionNote,
        reported: people.get(r.reportedId) ?? { id: r.reportedId, deleted: true }, reporter: people.get(r.reporterId) ?? { id: r.reporterId, deleted: true },
      })),
    };
  }

  @Get('users/:id')
  @UseGuards(ModeratorGuard)
  async user(@Param('id') id: string) {
    const p = (await this.people([id])).get(id);
    if (!p) throw new NotFoundException();
    const [reports, actions, photos] = await Promise.all([
      this.prisma.report.findMany({ where: { reportedId: id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.moderationAction.findMany({ where: { targetUserId: id }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.photo.findMany({ where: { profileId: id }, orderBy: { position: 'asc' }, select: { id: true, url: true, position: true } }),
    ]);
    return { member: p, photos, reports: reports.map((r) => ({ ...r, status: normalizeStatus(r.status) })), history: actions };
  }

  @Post('reports/:id/decision')
  @UseGuards(ModeratorGuard)
  @HttpCode(200)
  async decide(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body(new ZodPipe(Decision)) b: z.infer<typeof Decision>) {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    const [updated] = await this.prisma.$transaction([
      this.prisma.report.update({ where: { id }, data: { status: b.decision, reviewedById: me.id, decisionNote: b.note ?? null } }),
      this.prisma.moderationAction.create({ data: { actorId: me.id, action: b.decision === 'actioned' ? 'report_actioned' : 'report_dismissed', targetUserId: r.reportedId, reportId: id, note: b.note } }),
    ]);
    this.log.log({ reportId: id, decision: b.decision }, 'report decided');
    return { id, status: updated.status, updatedAt: updated.updatedAt };
  }

  @Post('users/:id/:action')
  @UseGuards(ModeratorGuard)
  @HttpCode(200)
  async account(@CurrentUser() me: AuthUser, @Param('id') id: string, @Param('action', new ZodPipe(z.enum(['hide', 'show', 'suspend', 'restore']))) action: 'hide' | 'show' | 'suspend' | 'restore', @Body(new ZodPipe(Note)) b: z.infer<typeof Note>) {
    if (id === me.id) throw new ForbiddenException('cannot_moderate_self');
    const u = await this.prisma.user.findUnique({ where: { id }, select: { hiddenAt: true, suspendedAt: true, deletedAt: true } });
    if (!u || u.deletedAt) throw new NotFoundException();
    const t = accountTransition(action, u);
    const ops = [
      this.prisma.user.update({ where: { id }, data: t.data }),
      this.prisma.moderationAction.create({ data: { actorId: me.id, action: t.kind, targetUserId: id, reportId: b.reportId, note: b.note } }),
    ];
    if (action === 'suspend') {
      // Closes their conversations and pending introductions; the other people see them end, as after a block.
      ops.push(
        this.prisma.conversation.updateMany({ where: { closedAt: null, members: { some: { userId: id } } }, data: { closedAt: new Date() } }) as never,
        this.prisma.introduction.updateMany({ where: { status: { in: ['proposed', 'accepted_by_a', 'accepted_by_b'] }, OR: [{ personAId: id }, { personBId: id }, { introducerId: id }] }, data: { status: 'declined', decidedAt: new Date() } }) as never,
      );
    }
    await this.prisma.$transaction(ops);
    if (action === 'suspend') await this.sessions.revokeAll(id);
    this.log.log({ target: id, action }, 'account moderated');
    const after = await this.prisma.user.findUnique({ where: { id }, select: { hiddenAt: true, suspendedAt: true } });
    return { id, hidden: !!after?.hiddenAt, suspended: !!after?.suspendedAt, changed: t.changed };
  }

  /** Reported photo: removed from the profile and the stored file deleted. */
  @Delete('photos/:photoId')
  @UseGuards(ModeratorGuard)
  async removePhoto(@CurrentUser() me: AuthUser, @Param('photoId') photoId: string, @Body(new ZodPipe(Note)) b: z.infer<typeof Note>) {
    const ph = await this.prisma.photo.findUnique({ where: { id: photoId }, select: { id: true, profileId: true, storageKey: true } });
    if (!ph) throw new NotFoundException();
    await this.prisma.$transaction([
      this.prisma.photo.delete({ where: { id: photoId } }),
      this.prisma.moderationAction.create({ data: { actorId: me.id, action: 'photo_removed', targetUserId: ph.profileId, photoId, reportId: b.reportId, note: b.note } }),
    ]);
    if (ph.storageKey) await this.storage.remove([ph.storageKey]);
    return { ok: true };
  }

  /** What a moderator needs to decide, never the Jewish-life answers or e-mail beyond the account itself. */
  private async people(ids: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, email: true, isDemo: true, regionCode: true, createdAt: true, deletedAt: true, hiddenAt: true, suspendedAt: true, paused: true,
        profile: { select: { firstName: true, birthDate: true, gender: true, photos: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } } },
        _count: { select: { blocksGot: true } },
      },
    });
    const reported = await this.prisma.report.groupBy({ by: ['reportedId'], where: { reportedId: { in: ids } }, _count: { _all: true } });
    const nReports = new Map(reported.map((r) => [r.reportedId, r._count._all]));
    return new Map(users.map((u) => [u.id, {
      id: u.id, email: u.email, isDemo: u.isDemo, regionCode: u.regionCode, createdAt: u.createdAt,
      firstName: u.profile?.firstName ?? '', age: u.profile ? ageOn(u.profile.birthDate) : null, gender: u.profile?.gender ?? null,
      photoUrl: u.profile?.photos[0]?.url ?? null, deleted: !!u.deletedAt, hidden: !!u.hiddenAt, suspended: !!u.suspendedAt, paused: u.paused,
      reports: nReports.get(u.id) ?? 0, blockedBy: u._count.blocksGot,
    }]));
  }
}

@Module({ imports: [AuthModule, MediaModule], controllers: [ModerationController], providers: [ModeratorGuard] })
export class ModerationModule {}
