import { Injectable } from '@nestjs/common';
import { REGIONS } from '@kapara/config';
import type { JewishLife, ProfilePublic } from '@kapara/shared';
import { ageOn } from '../common/age';
import { distanceBucket } from '../common/distance';
import { filterJewishLife, type ViewerRelation } from '../common/visibility';
import { PrismaService } from '../prisma/prisma.service';

const cityOf = (code: string) => REGIONS.find((r) => r.code === code)?.city ?? '';

/**
 * Builds profiles as a given viewer is allowed to see them. Sensitive answers
 * go through `filterJewishLife` (consent + visibility); nothing else about
 * Jewish life is ever derived.
 */
@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Members the viewer must never see: blocked either way. */
  async blockedIds(viewerId: string): Promise<Set<string>> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true },
    });
    return new Set(rows.map((b) => (b.blockerId === viewerId ? b.blockedId : b.blockerId)));
  }

  async matchedIds(viewerId: string, ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await this.prisma.like.findMany({
      where: { status: 'matched', OR: [{ fromId: viewerId, toId: { in: ids } }, { toId: viewerId, fromId: { in: ids } }] },
      select: { fromId: true, toId: true },
    });
    return new Set(rows.map((l) => (l.fromId === viewerId ? l.toId : l.fromId)));
  }

  /** Rounded distances between the viewer and others (home area, or region centre as fallback). */
  async distances(viewerId: string, ids: string[]): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.$queryRaw<{ id: string; km: number | null }[]>`
      SELECT o.id, ST_Distance(COALESCE(me."homeArea", mr.center), COALESCE(o."homeArea", orr.center)) / 1000 AS km
      FROM "User" me JOIN "Region" mr ON mr.code = me."regionCode",
           "User" o JOIN "Region" orr ON orr.code = o."regionCode"
      WHERE me.id = ${viewerId} AND o.id = ANY(${ids})`;
    return new Map(rows.filter((r) => r.km != null).map((r) => [r.id, distanceBucket(Number(r.km))]));
  }

  /**
   * Public views for several members at once, in the order of `ids`. Members
   * deleted, without profile or photo, or blocked are left out. Paused members
   * stay visible only to their matches.
   */
  async views(viewerId: string, ids: string[], opts: { withDistance?: boolean } = {}): Promise<ProfilePublic[]> {
    const [users, blocked, matched, dist] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids }, deletedAt: null, profile: { isNot: null } },
        include: { profile: { include: { photos: { orderBy: { position: 'asc' } } } }, consents: { where: { revokedAt: null }, select: { field: true } } },
      }),
      this.blockedIds(viewerId),
      this.matchedIds(viewerId, ids),
      opts.withDistance ? this.distances(viewerId, ids.filter((i) => i !== viewerId)) : Promise.resolve(new Map<string, number>()),
    ]);
    const byId = new Map(users.map((u) => [u.id, u]));
    const out: ProfilePublic[] = [];
    for (const id of ids) {
      const u = byId.get(id);
      if (!u?.profile || blocked.has(id)) continue;
      const relation: ViewerRelation = id === viewerId ? 'self' : matched.has(id) ? 'match' : 'member';
      if (u.paused && relation === 'member') continue;
      // Moderation: a hidden or suspended profile is visible to nobody but its owner.
      if ((u.hiddenAt || u.suspendedAt) && relation !== 'self') continue;
      if (relation !== 'self' && !u.profile.photos.length) continue;
      const p = u.profile;
      out.push({
        id: u.id, firstName: p.firstName, age: ageOn(p.birthDate), city: cityOf(u.regionCode), regionCode: u.regionCode,
        headline: p.headline ?? undefined, languages: p.languages,
        photos: p.photos.map((x) => ({ id: x.id, url: x.url, caption: x.caption ?? undefined, isDemo: x.isDemo })),
        prompts: p.prompts as ProfilePublic['prompts'],
        jewishLife: filterJewishLife(p.jewishLife as Partial<JewishLife>, relation, new Set(u.consents.map((c) => c.field))),
        verified: Boolean(u.verifiedAt), isDemo: u.isDemo,
        ...(dist.has(id) ? { distanceKm: dist.get(id) } : {}),
      });
    }
    return out;
  }

  async view(viewerId: string, id: string, opts: { withDistance?: boolean } = {}) {
    return (await this.views(viewerId, [id], opts))[0];
  }
}
