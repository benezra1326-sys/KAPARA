/**
 * Age rule shared by the app, the API and the tests (Supabase applies the
 * same rule in SQL). Ages are counted in calendar years on the member's
 * local date: someone born on 12 March is a year older from 00:00 on
 * 12 March where they are, never earlier. A 29 February birthday is reached
 * on 1 March in non-leap years (the common legal reading in France and the UK).
 */
export const MIN_AGE = 18;
/** Anything above is treated as a typing mistake. */
export const MAX_AGE = 110;

export interface YMD { y: number; m: number; d: number }

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (y: number, m: number) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;

/** Strict `YYYY-MM-DD` (real calendar day, 29 February only in leap years). */
export function parseYmd(s: string): YMD | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!r) return null;
  const y = +r[1]!, m = +r[2]!, d = +r[3]!;
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > daysIn(y, m)) return null;
  return { y, m, d };
}

/** Today's date (`YYYY-MM-DD`) in an IANA time zone; UTC if the zone is unknown. */
export function localDate(timeZone: string | undefined, at: Date = new Date()): string {
  const fmt = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  try { return fmt(timeZone || 'UTC'); } catch { return fmt('UTC'); }
}

/** True if the zone is a valid IANA name for this runtime. */
export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

/** Full years between two calendar dates. */
export function yearsBetween(birth: YMD, today: YMD): number {
  let age = today.y - birth.y;
  if (today.m < birth.m || (today.m === birth.m && today.d < birth.d)) age--;
  return age;
}

export type AgeCheck =
  | { ok: true; age: number }
  | { ok: false; reason: 'invalid_birth_date' | 'adults_only' };

/**
 * The single age rule. `today` is the member's local date (see `localDate`).
 * Exactly 18 today is accepted; 18 tomorrow is not.
 */
export function checkAge(birthDate: string, today: string, minAge = MIN_AGE): AgeCheck {
  const b = parseYmd(birthDate);
  const t = parseYmd(today);
  if (!b || !t) return { ok: false, reason: 'invalid_birth_date' };
  const age = yearsBetween(b, t);
  if (age < 0 || age > MAX_AGE) return { ok: false, reason: 'invalid_birth_date' };
  if (age < minAge) return { ok: false, reason: 'adults_only' };
  return { ok: true, age };
}

/** Age shown to other members (never the date). */
export function ageNow(birthDate: string, timeZone?: string, at: Date = new Date()): number | null {
  const b = parseYmd(birthDate);
  const t = parseYmd(localDate(timeZone, at));
  return b && t ? yearsBetween(b, t) : null;
}
