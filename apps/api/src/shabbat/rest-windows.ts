import { calendar, flags, Location } from '@hebcal/core/dist/esm/index'; // ESM-only package, loaded through Node 22 require(esm)
import type { Region } from '@kapara/config';

export interface RestSettings {
  includeHolidays: boolean;
  candleLightingMins: number;
  /** null = nightfall (8.5° solar depression, Hebcal default). */
  havdalahMins: number | null;
}

export interface RestWindow {
  start: Date;
  end: Date;
  kind: 'shabbat' | 'holiday';
  /** Hebcal holiday name in English (stable key), or "Shabbat". */
  title: string;
}

/**
 * Shabbat and Yom Tov windows (candle lighting → Havdalah) for a region, from
 * NOAA solar equations via @hebcal/core. Consecutive days (Yom Tov running into
 * Shabbat) merge into a single window. Times are approximate: the app says so
 * and lets the member adjust minutes.
 */
export function restWindows(region: Pick<Region, 'center' | 'timezone' | 'city' | 'country'>, s: RestSettings, from: Date, to: Date): RestWindow[] {
  const il = region.country === 'IL';
  const location = new Location(region.center.lat, region.center.lng, il, region.timezone, region.city, region.country);
  // Start a day early so a window already in progress at `from` is found.
  const start = new Date(from.getTime() - 2 * 86_400_000);
  const events = calendar({
    start, end: to, location, il, candlelighting: true,
    candleLightingMins: s.candleLightingMins,
    ...(s.havdalahMins ? { havdalahMins: s.havdalahMins } : {}),
    noMinorFast: true, noModern: true, noRoshChodesh: true, noSpecialShabbat: true,
  });

  const windows: RestWindow[] = [];
  const marks: { at: Date; kind: 'candles' | 'tzeis_candles' | 'havdalah' }[] = [];
  let open: { start: Date; title: string; holiday: boolean } | null = null;
  for (const ev of events) {
    const f = ev.getFlags();
    const desc = ev.getDesc();
    if (f & flags.CHAG && open?.holiday && open.title === 'Yom Tov') open.title = desc;
    const time = (ev as unknown as { eventTime?: Date }).eventTime;
    if (!time) continue;
    if (desc === 'Candle lighting' && !(f & flags.CHANUKAH_CANDLES)) {
      marks.push({ at: time, kind: f & flags.LIGHT_CANDLES_TZEIS ? 'tzeis_candles' : 'candles' });
      if (!open) {
        const holiday = weekday(time, region.timezone) !== 5;
        open = { start: time, title: holiday ? 'Yom Tov' : 'Shabbat', holiday };
      }
    } else if (desc === 'Havdalah') {
      marks.push({ at: time, kind: 'havdalah' });
      if (open) {
        windows.push({ start: open.start, end: time, kind: open.holiday ? 'holiday' : 'shabbat', title: open.title });
        open = null;
      }
    }
  }

  const result = s.includeHolidays ? windows : windows.flatMap((w) => {
    if (w.kind === 'shabbat') return [w];
    // Holidays excluded: keep only the Shabbat part of a merged window, if any.
    const inside = marks.filter((m) => m.at >= w.start && m.at <= w.end);
    const friday = inside.find((m) => m.kind === 'candles' && weekday(m.at, region.timezone) === 5);
    const saturday = inside.find((m) => m.kind !== 'candles' && weekday(m.at, region.timezone) === 6);
    if (friday && saturday) return [{ start: friday.at, end: saturday.at, kind: 'shabbat' as const, title: 'Shabbat' }];
    // Shabbat that is also the first day of Yom Tov (lit on Friday): keep it whole.
    if (weekday(w.start, region.timezone) === 5 && saturday) return [{ start: w.start, end: saturday.at, kind: 'shabbat' as const, title: 'Shabbat' }];
    return [];
  });
  return result.filter((w) => w.end > from && w.start < to);
}

/** Is `at` inside a window? Returns that window, else null. */
export function windowAt(windows: RestWindow[], at: Date): RestWindow | null {
  return windows.find((w) => w.start <= at && at < w.end) ?? null;
}

export function nextWindow(windows: RestWindow[], at: Date): RestWindow | null {
  return windows.filter((w) => w.start > at).sort((a, b) => +a.start - +b.start)[0] ?? null;
}

// ── helpers ────────────────────────────────────────────────────────────────

/** 0 = Sunday … 5 = Friday, in the region's time zone. */
function weekday(d: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}
