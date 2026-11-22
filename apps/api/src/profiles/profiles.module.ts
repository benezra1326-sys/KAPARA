import {
  BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Module, NotFoundException, Param, Put, Post, Req, UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { RULES } from '@kapara/config';
import {
  AccountSettings, ConsentGrant, JewishLife, JewishLifeField, LocationUpdate, PhotosUpdate, PreferencesInput, ProfileUpdate,
  PHOTO_LIMITS, SENSITIVE_POLICY_VERSION,
} from '@kapara/shared';
import { AccountsService } from '../auth/accounts.service';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { SessionsService } from '../auth/sessions.service';
import { ageOn } from '../common/age';
import { ZodPipe } from '../common/zod.pipe';
import { requestBase, type HttpRequest } from '../media/http';
import { MediaModule } from '../media/media.module';
import { planPhotos } from '../media/photo-plan';
import { PhotoStorage } from '../media/storage';
import { PrismaService } from '../prisma/prisma.service';
import { applyJewishLifeUpdate, eraseField } from './jewish-life-update';
import { ProfilesService } from './profiles.service';

/** Same fields as JewishLife; `null` erases an answer. Unknown keys are refused. */
const JewishLifePatch = z.object(
  Object.fromEntries(Object.entries(JewishLife.shape).map(([k, v]) => [k, v.nullable().optional()])) as {
    [K in keyof typeof JewishLife.shape]: z.ZodOptional<z.ZodNullable<(typeof JewishLife.shape)[K]>>
  },
).strict();

const DEFAULT_PREFERENCES = { ageMin: 25, ageMax: 40, maxDistanceKm: 25, genders: [] as string[], dealbreakers: {}, soft: {} };

@Controller('profiles')
@UseGuards(AuthGuard)
class ProfilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly accounts: AccountsService,
    private readonly sessions: SessionsService,
    private readonly storage: PhotoStorage,
  ) {}

  /** Everything about me, plus what onboarding still needs. */
  @Get('me')
  async me(@CurrentUser() me: AuthUser) {
    const u = await this.prisma.user.findUnique({
      where: { id: me.id },
      include: { profile: { include: { photos: true } }, preferences: true, consents: { where: { revokedAt: null } } },
    });
    if (!u || u.deletedAt) throw new NotFoundException();
    const [loc] = await this.prisma.$queryRaw<{ has: boolean }[]>`SELECT "homeArea" IS NOT NULL AS has FROM "User" WHERE id = ${me.id}`;
    const missing: string[] = [];
    if (!u.profile) missing.push('profile');
    if (!u.profile?.photos.length) missing.push('photos');
    if (!u.preferences?.genders.length) missing.push('preferences');
    return {
      id: u.id, email: u.email, locale: u.locale, regionCode: u.regionCode,
      paused: u.paused, shabbatMode: u.shabbatMode, isDemo: u.isDemo, verified: Boolean(u.verifiedAt),
      hasApproximateLocation: Boolean(loc?.has),
      // Self only: birth date and gender so the app can edit the basics without asking again.
      profile: u.profile ? await this.selfView(me.id, u.profile) : null,
      consents: u.consents.map((c) => ({ field: c.field, grantedAt: c.grantedAt, policyVersion: c.policyVersion })),
      consentPolicyVersion: SENSITIVE_POLICY_VERSION,
      onboarding: { complete: missing.length === 0, missing },
    };
  }

  private async selfView(id: string, p: { birthDate: Date; gender: string }) {
    const v = await this.profiles.view(id, id);
    return v ? { ...v, birthDate: p.birthDate.toISOString().slice(0, 10), gender: p.gender } : null;
  }

  /** Creates (end of onboarding) or edits the basic profile. */
  @Put('me')
  async upsert(@CurrentUser() me: AuthUser, @Body(new ZodPipe(ProfileUpdate)) b: ProfileUpdate) {
    const birth = new Date(`${b.birthDate}T00:00:00Z`);
    if (Number.isNaN(birth.getTime())) throw new BadRequestException('invalid_birth_date');
    const age = ageOn(birth);
    if (age < RULES.minAge || age > 120) throw new BadRequestException('adults_only');
    if (b.regionCode) await this.accounts.resolveRegion(b.regionCode);
    const data = { firstName: b.firstName, birthDate: birth, gender: b.gender, headline: b.headline ?? null, languages: b.languages, prompts: b.prompts };
    await this.prisma.$transaction([
      this.prisma.profile.upsert({ where: { userId: me.id }, create: { userId: me.id, ...data }, update: data }),
      ...(b.regionCode ? [this.prisma.user.update({ where: { id: me.id }, data: { regionCode: b.regionCode } })] : []),
    ]);
    return this.profiles.view(me.id, me.id);
  }

  /**
   * Sets the ordered photo list (first = main photo). Entries are existing
   * photos (`id`) or files just uploaded with a ticket (`key`), checked here:
   * they must exist, be a real JPEG/PNG/WebP and stay under the size limit.
   * Photos left out are deleted, stored file included.
   */
  @Put('me/photos')
  async photos(@CurrentUser() me: AuthUser, @Body(new ZodPipe(PhotosUpdate)) b: PhotosUpdate, @Req() req: HttpRequest) {
    await this.requireProfile(me.id);
    const existing = await this.prisma.photo.findMany({ where: { profileId: me.id }, select: { id: true, storageKey: true } });
    const plan = planPhotos(me.id, existing, b.photos);
    if (!plan.ok) throw new BadRequestException(plan.error);
    const created = plan.photos.flatMap((p) => (p.kind === 'create' ? [p] : []));
    const invalid: string[] = [];
    for (const p of created) {
      const f = await this.storage.inspect(p.key);
      if (!f || !f.type || f.size > PHOTO_LIMITS.maxBytes) invalid.push(p.key);
    }
    if (invalid.length) {
      await this.storage.remove(invalid);
      throw new BadRequestException({ code: 'photo_upload_invalid', keys: invalid });
    }
    const base = requestBase(req);
    await this.prisma.$transaction([
      this.prisma.photo.deleteMany({ where: { profileId: me.id, id: { in: plan.removeIds } } }),
      ...plan.photos.map((p) => (p.kind === 'keep'
        ? this.prisma.photo.update({ where: { id: p.id }, data: { position: p.position, ...(p.caption !== undefined ? { caption: p.caption } : {}) } })
        : this.prisma.photo.create({ data: { profileId: me.id, url: this.storage.publicUrl(p.key, base), storageKey: p.key, caption: p.caption, position: p.position } }))),
    ]);
    await this.storage.remove(plan.removeKeys);
    return this.profiles.view(me.id, me.id);
  }

  /** Approximate home area, snapped to a ~1 km grid before storage, never returned. */
  @Put('me/location')
  async location(@CurrentUser() me: AuthUser, @Body(new ZodPipe(LocationUpdate)) p: LocationUpdate) {
    const g = RULES.homeAreaPrecisionMeters;
    await this.prisma.$executeRaw`
      UPDATE "User" SET "homeArea" =
        ST_Transform(ST_SnapToGrid(ST_Transform(ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326), 3857), ${g}), 4326)::geography
      WHERE id = ${me.id}`;
    return { ok: true, precisionMeters: g };
  }

  /** Forget my approximate location: distances fall back to my region's centre. */
  @Delete('me/location')
  async forgetLocation(@CurrentUser() me: AuthUser) {
    await this.prisma.$executeRaw`UPDATE "User" SET "homeArea" = NULL WHERE id = ${me.id}`;
    return { ok: true };
  }

  @Put('me/settings')
  async settings(@CurrentUser() me: AuthUser, @Body(new ZodPipe(AccountSettings)) b: AccountSettings) {
    const u = await this.prisma.user.update({ where: { id: me.id }, data: b, select: { paused: true, shabbatMode: true, locale: true } });
    return u;
  }

  /**
   * Explicit consent for sensitive fields, given on the explanation screen.
   * Required before any answer (value or note) to that field is stored.
   */
  @Post('me/consents')
  @HttpCode(200)
  async consent(@CurrentUser() me: AuthUser, @Body(new ZodPipe(ConsentGrant)) b: ConsentGrant) {
    await this.prisma.$transaction(b.fields.map((field) => this.prisma.sensitiveConsent.upsert({
      where: { userId_field: { userId: me.id, field } },
      create: { userId: me.id, field, policyVersion: b.policyVersion },
      update: { revokedAt: null, grantedAt: new Date(), policyVersion: b.policyVersion },
    })));
    return { ok: true, fields: b.fields };
  }

  /** Withdrawing consent erases the stored answer for that field. */
  @Delete('me/consents/:field')
  async revoke(@CurrentUser() me: AuthUser, @Param('field', new ZodPipe(JewishLifeField)) field: JewishLifeField) {
    const p = await this.requireProfile(me.id);
    await this.prisma.$transaction([
      this.prisma.sensitiveConsent.updateMany({ where: { userId: me.id, field, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.profile.update({ where: { userId: me.id }, data: { jewishLife: eraseField(p.jewishLife as Partial<JewishLife>, field) as object } }),
    ]);
    return { ok: true, erased: field };
  }

  /** Partial update of Jewish-life answers (merged). `null` erases a field. */
  @Put('me/jewish-life')
  async updateJewishLife(@CurrentUser() me: AuthUser, @Body(new ZodPipe(JewishLifePatch)) body: z.infer<typeof JewishLifePatch>) {
    const p = await this.requireProfile(me.id);
    const consents = await this.prisma.sensitiveConsent.findMany({ where: { userId: me.id, revokedAt: null }, select: { field: true } });
    const { next, missingConsent } = applyJewishLifeUpdate(p.jewishLife as Partial<JewishLife>, body, new Set(consents.map((c) => c.field)));
    if (missingConsent.length) throw new ConflictException({ code: 'consent_required', fields: missingConsent, policyVersion: SENSITIVE_POLICY_VERSION });
    await this.prisma.profile.update({ where: { userId: me.id }, data: { jewishLife: next as object } });
    return this.profiles.view(me.id, me.id);
  }

  /** Deletes the account and everything attached to it. Safety reports are kept. */
  @Delete('me')
  async deleteAccount(@CurrentUser() me: AuthUser) {
    await this.sessions.revokeAll(me.id);
    const files = await this.prisma.photo.findMany({ where: { profileId: me.id, storageKey: { not: null } }, select: { storageKey: true } });
    await this.prisma.user.delete({ where: { id: me.id } });
    await this.storage.remove(files.map((f) => f.storageKey!));
    return { ok: true };
  }

  @Get(':id')
  async get(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    const v = await this.profiles.view(me.id, id, { withDistance: id !== me.id });
    if (!v) throw new NotFoundException();
    return v;
  }

  private async requireProfile(userId: string) {
    const p = await this.prisma.profile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException('profile_missing');
    return p;
  }
}

/** Dealbreakers are mutual and only ever compared with answers shared for matching. */
@Controller('preferences')
@UseGuards(AuthGuard)
class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser() me: AuthUser) {
    const p = await this.prisma.preferences.findUnique({ where: { userId: me.id } });
    if (!p) return { ...DEFAULT_PREFERENCES, isDefault: true };
    const { userId: _u, ...rest } = p;
    return { ...rest, isDefault: false };
  }

  @Put()
  async put(@CurrentUser() me: AuthUser, @Body(new ZodPipe(PreferencesInput)) b: PreferencesInput) {
    const data = { ...b, dealbreakers: b.dealbreakers as object, soft: b.soft as object };
    const p = await this.prisma.preferences.upsert({ where: { userId: me.id }, create: { userId: me.id, ...data }, update: data });
    // Today's selection was computed with the old criteria.
    await this.prisma.dailyPick.deleteMany({ where: { userId: me.id, state: 'new' } });
    const { userId: _u, ...rest } = p;
    return { ...rest, isDefault: false };
  }
}

@Module({
  imports: [MediaModule],
  controllers: [ProfilesController, PreferencesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
