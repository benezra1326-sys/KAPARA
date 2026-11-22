import { Body, Controller, Get, NotFoundException, Param, Put, Module, UseGuards } from '@nestjs/common';
import { JewishLife } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { filterJewishLife, type ViewerRelation } from '../common/visibility';
import { PrismaService } from '../prisma/prisma.service';

const ageOf = (d: Date) => Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));

@Controller('profiles')
@UseGuards(AuthGuard)
class ProfilesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  me(@CurrentUser() me: AuthUser) {
    return this.view(me.id, me.id);
  }

  /**
   * Updating Jewish-life answers. Any field with visibility other than private
   * or useForMatching=true requires an active consent row, created here only
   * because the client sends it after the explicit consent screen.
   */
  @Put('me/jewish-life')
  async updateJewishLife(@CurrentUser() me: AuthUser, @Body(new ZodPipe(JewishLife.partial())) body: Partial<JewishLife>) {
    const needsConsent = Object.entries(body)
      .filter(([, f]) => f && (f.visibility !== 'private' || f.useForMatching))
      .map(([k]) => k);
    await this.prisma.$transaction([
      this.prisma.profile.update({ where: { userId: me.id }, data: { jewishLife: body as object } }),
      ...needsConsent.map((field) => this.prisma.sensitiveConsent.upsert({
        where: { userId_field: { userId: me.id, field } },
        create: { userId: me.id, field },
        update: { revokedAt: null, grantedAt: new Date() },
      })),
    ]);
    return this.view(me.id, me.id);
  }

  @Get(':id')
  get(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.view(me.id, id);
  }

  private async view(viewerId: string, id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: { include: { photos: { orderBy: { position: 'asc' } } } }, consents: { where: { revokedAt: null } } },
    });
    if (!u?.profile || u.deletedAt) throw new NotFoundException();
    const relation: ViewerRelation = viewerId === id ? 'self'
      : (await this.prisma.like.findFirst({ where: { status: 'matched', OR: [{ fromId: viewerId, toId: id }, { fromId: id, toId: viewerId }] } })) ? 'match' : 'member';
    const p = u.profile;
    return {
      id: u.id, firstName: p.firstName, age: ageOf(p.birthDate), regionCode: u.regionCode,
      headline: p.headline, languages: p.languages, prompts: p.prompts,
      photos: p.photos.map((x) => ({ id: x.id, url: x.url, caption: x.caption, isDemo: x.isDemo })),
      jewishLife: filterJewishLife(p.jewishLife as Partial<JewishLife>, relation, new Set(u.consents.map((c) => c.field))),
      verified: Boolean(u.verifiedAt), isDemo: u.isDemo,
    };
  }
}

@Module({ controllers: [ProfilesController] })
export class ProfilesModule {}
