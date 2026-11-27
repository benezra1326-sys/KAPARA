import { Injectable, Logger } from '@nestjs/common';
import type { CallState, LiveCallsFrom, LiveMember, LiveSettings, CallReportReason } from '@kapara/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { MemberFacts, Relationship } from './call-policy';

import { ageOn as ageOf } from '../common/age';
const asCallsFrom = (v: string | undefined): LiveCallsFrom => (v === 'nobody' || v === 'members' ? v : 'matches');

/** Every database access of the Live domain. Nothing here logs personal data. */
@Injectable()
export class LiveRepository {
  private readonly log = new Logger(LiveRepository.name);
  constructor(private readonly prisma: PrismaService) {}

  async settings(userId: string): Promise<LiveSettings> {
    const s = await this.prisma.privacySettings.findUnique({ where: { userId } });
    return { liveEnabled: s?.liveEnabled ?? false, liveCallsFrom: asCallsFrom(s?.liveCallsFrom) };
  }

  async saveSettings(userId: string, s: LiveSettings): Promise<LiveSettings> {
    const row = await this.prisma.privacySettings.upsert({
      where: { userId },
      create: { userId, liveEnabled: s.liveEnabled, liveCallsFrom: s.liveCallsFrom },
      update: { liveEnabled: s.liveEnabled, liveCallsFrom: s.liveCallsFrom },
    });
    return { liveEnabled: row.liveEnabled, liveCallsFrom: asCallsFrom(row.liveCallsFrom) };
  }

  async exists(userId: string) {
    return Boolean(await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } }));
  }

  /** Facts used by the call policy, for several members at once. */
  async facts(ids: string[]): Promise<Map<string, MemberFacts>> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: {
        id: true, paused: true, hiddenAt: true, suspendedAt: true,
        privacy: { select: { liveEnabled: true, liveCallsFrom: true } },
        profile: { select: { gender: true, birthDate: true } },
        preferences: { select: { genders: true, ageMin: true, ageMax: true } },
      },
    });
    return new Map(users.map((u) => [u.id, {
      exists: true,
      // Hidden or suspended by moderation: unreachable, like a paused profile.
      paused: u.paused || !!u.hiddenAt || !!u.suspendedAt,
      liveEnabled: u.privacy?.liveEnabled ?? false,
      liveCallsFrom: asCallsFrom(u.privacy?.liveCallsFrom),
      gender: u.profile?.gender ?? null,
      age: u.profile ? ageOf(u.profile.birthDate) : null,
      wantsGenders: u.preferences?.genders ?? [],
      ageMin: u.preferences?.ageMin ?? null,
      ageMax: u.preferences?.ageMax ?? null,
    } satisfies MemberFacts]));
  }

  /** Blocks and existing connections between `me` and each of `others`. */
  async relationships(me: string, others: string[]): Promise<Map<string, Relationship>> {
    const [blocks, likes, convs, intros] = await Promise.all([
      this.prisma.block.findMany({ where: { OR: [{ blockerId: me, blockedId: { in: others } }, { blockedId: me, blockerId: { in: others } }] } }),
      this.prisma.like.findMany({ where: { status: 'matched', OR: [{ fromId: me, toId: { in: others } }, { toId: me, fromId: { in: others } }] } }),
      this.prisma.conversationMember.findMany({
        where: { userId: { in: others }, conversation: { members: { some: { userId: me } } } },
        select: { userId: true },
      }),
      this.prisma.introduction.findMany({
        where: { status: 'connected', OR: [{ personAId: me, personBId: { in: others } }, { personBId: me, personAId: { in: others } }] },
        select: { personAId: true, personBId: true },
      }),
    ]);
    const blocked = new Set(blocks.map((b) => (b.blockerId === me ? b.blockedId : b.blockerId)));
    const connected = new Set<string>([
      ...likes.map((l) => (l.fromId === me ? l.toId : l.fromId)),
      ...convs.map((c) => c.userId),
      ...intros.map((i) => (i.personAId === me ? i.personBId : i.personAId)),
    ]);
    return new Map(others.map((id) => [id, { blockedEitherWay: blocked.has(id), connected: connected.has(id) }]));
  }

  /** Public card data only: first name, age, headline, first photo. Never Jewish-life answers. */
  async members(ids: string[]): Promise<LiveMember[]> {
    if (!ids.length) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, deletedAt: null, profile: { isNot: null } },
      select: {
        id: true, isDemo: true, verifiedAt: true,
        profile: { select: { firstName: true, birthDate: true, headline: true, photos: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } } },
      },
    });
    return users.map((u) => ({
      userId: u.id,
      firstName: u.profile!.firstName,
      age: ageOf(u.profile!.birthDate),
      headline: u.profile!.headline ?? undefined,
      photoUrl: u.profile!.photos[0]?.url,
      verified: Boolean(u.verifiedAt),
      isDemo: u.isDemo,
    }));
  }

  /** Call metadata only (who, when, outcome). Never audio, video or content. */
  async logCall(id: string, callerId: string, calleeId: string, demo: boolean) {
    await this.prisma.callLog.create({ data: { id, callerId, calleeId, state: 'invited', demo } })
      .catch((e: Error) => this.log.warn(`call log create failed: ${e.message}`));
  }

  async logState(id: string, state: CallState, ended: boolean) {
    await this.prisma.callLog.update({ where: { id }, data: { state, ...(ended ? { endedAt: new Date() } : {}) } })
      .catch((e: Error) => this.log.warn(`call log update failed: ${e.message}`));
  }

  async report(reporterId: string, reportedId: string, reason: CallReportReason, callId: string, block: boolean) {
    await this.prisma.report.create({ data: { reporterId, reportedId, reason, details: `live_call:${callId}` } });
    if (block) {
      await this.prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: reporterId, blockedId: reportedId } },
        create: { blockerId: reporterId, blockedId: reportedId },
        update: {},
      });
    }
  }
}
