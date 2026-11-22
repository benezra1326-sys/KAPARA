import { BadRequestException, Injectable } from '@nestjs/common';
import { LAUNCH_REGION, REGIONS, SUPPORTED_LOCALES } from '@kapara/config';
import { PrismaService } from '../prisma/prisma.service';
import type { VerifiedIdentity } from './oidc';

/** Finds or creates members from a verified email or external identity. */
@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Region rows are seeded from @kapara/config; make sure the requested one exists. */
  async resolveRegion(code?: string) {
    const r = REGIONS.find((x) => x.code === (code ?? LAUNCH_REGION.code));
    if (!r) throw new BadRequestException('unknown_region');
    await this.prisma.$executeRaw`
      INSERT INTO "Region" (code, country, city, timezone, locale, launched, center)
      VALUES (${r.code}, ${r.country}, ${r.city}, ${r.timezone}, ${r.defaultLocale}, ${r.launched},
              ST_SetSRID(ST_MakePoint(${r.center.lng}, ${r.center.lat}), 4326)::geography)
      ON CONFLICT (code) DO NOTHING`;
    return r;
  }

  private locale(l: string | undefined, fallback: string) {
    const short = l?.slice(0, 2);
    return SUPPORTED_LOCALES.includes(short as never) ? short! : fallback;
  }

  async byEmail(email: string, opts: { regionCode?: string; locale?: string; verified: boolean }) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.deletedAt) throw new BadRequestException('account_deleted');
      return { user: existing, isNewUser: false };
    }
    const region = await this.resolveRegion(opts.regionCode);
    const user = await this.prisma.user.create({
      data: {
        email, regionCode: region.code, locale: this.locale(opts.locale, region.defaultLocale),
        privacy: { create: {} },
      },
    });
    return { user, isNewUser: true };
  }

  /**
   * External identity: linked by (provider, subject). A first sign-in is
   * linked to an existing account only through an email the provider marks
   * as verified; otherwise a new account is created.
   */
  async byIdentity(id: VerifiedIdentity, opts: { regionCode?: string; locale?: string }) {
    const link = await this.prisma.authIdentity.findUnique({ where: { provider_subject: { provider: id.provider, subject: id.subject } }, include: { user: true } });
    if (link) {
      if (link.user.deletedAt) throw new BadRequestException('account_deleted');
      return { user: link.user, isNewUser: false };
    }
    const email = id.email && id.emailVerified ? id.email : `${id.provider}.${id.subject}@users.invalid`;
    const r = await this.byEmail(email, { ...opts, verified: true });
    await this.prisma.authIdentity.create({ data: { provider: id.provider, subject: id.subject, userId: r.user.id } });
    return r;
  }
}
