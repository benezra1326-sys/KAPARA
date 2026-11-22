import { Body, Controller, Get, Global, Injectable, Module, Put, UseGuards } from '@nestjs/common';
import { LAUNCH_REGION, REGIONS, type Region } from '@kapara/config';
import { ShabbatSettings, type ShabbatStatus, type ShabbatWindow } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { nextWindow, restWindows, windowAt, type RestSettings, type RestWindow } from './rest-windows';

const DEFAULTS: RestSettings = { includeHolidays: true, candleLightingMins: 18, havdalahMins: null };
const HORIZON_MS = 21 * 86_400_000;

/**
 * Shabbat mode is private and optional. Other modules call `isResting` to
 * pause features (Live presence, Croisés recording, notifications,
 * introduction deadlines). It is never exposed to other members.
 */
@Injectable()
export class ShabbatService {
  private readonly cache = new Map<string, { at: number; windows: RestWindow[] }>();
  constructor(private readonly prisma: PrismaService) {}

  async isResting(userId: string, at = new Date()): Promise<boolean> {
    const u = await this.load(userId);
    if (!u?.enabled) return false;
    return windowAt(this.windows(u.region, u.settings, at), at) !== null;
  }

  async status(userId: string, at = new Date()): Promise<ShabbatStatus> {
    const u = await this.load(userId);
    const region = u?.region ?? LAUNCH_REGION;
    const settings = u?.settings ?? DEFAULTS;
    const w = this.windows(region, settings, at);
    const current = windowAt(w, at);
    return {
      enabled: Boolean(u?.enabled), ...settings,
      resting: Boolean(u?.enabled && current),
      current: current ? toDto(current) : null,
      next: toDtoOrNull(nextWindow(w, at)),
      timezone: region.timezone, city: region.city,
    };
  }

  private windows(region: Region, s: RestSettings, at: Date): RestWindow[] {
    const key = `${region.code}|${s.includeHolidays}|${s.candleLightingMins}|${s.havdalahMins}`;
    const hit = this.cache.get(key);
    if (hit && at.getTime() - hit.at < 6 * 3_600_000 && at.getTime() >= hit.at) return hit.windows;
    const windows = restWindows(region, s, at, new Date(at.getTime() + HORIZON_MS));
    this.cache.set(key, { at: at.getTime(), windows });
    return windows;
  }

  private async load(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { shabbatMode: true, regionCode: true, shabbat: true } });
    if (!u) return null;
    const region = REGIONS.find((r) => r.code === u.regionCode) ?? LAUNCH_REGION;
    const settings: RestSettings = u.shabbat
      ? { includeHolidays: u.shabbat.includeHolidays, candleLightingMins: u.shabbat.candleLightingMins, havdalahMins: u.shabbat.havdalahMins }
      : DEFAULTS;
    return { enabled: u.shabbatMode, region, settings };
  }
}

const toDto = (w: RestWindow): ShabbatWindow => ({ start: w.start.toISOString(), end: w.end.toISOString(), kind: w.kind, title: w.title });
const toDtoOrNull = (w: RestWindow | null) => (w ? toDto(w) : null);

@Controller('shabbat')
@UseGuards(AuthGuard)
class ShabbatController {
  constructor(private readonly prisma: PrismaService, private readonly shabbat: ShabbatService) {}

  @Get()
  get(@CurrentUser() me: AuthUser) {
    return this.shabbat.status(me.id);
  }

  @Put()
  async put(@CurrentUser() me: AuthUser, @Body(new ZodPipe(ShabbatSettings)) b: ShabbatSettings) {
    const s = { includeHolidays: b.includeHolidays, candleLightingMins: b.candleLightingMins, havdalahMins: b.havdalahMins };
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: me.id }, data: { shabbatMode: b.enabled } }),
      this.prisma.shabbatSettings.upsert({ where: { userId: me.id }, create: { userId: me.id, ...s }, update: s }),
    ]);
    return this.shabbat.status(me.id);
  }
}

@Global()
@Module({ controllers: [ShabbatController], providers: [ShabbatService], exports: [ShabbatService] })
export class ShabbatModule {}
