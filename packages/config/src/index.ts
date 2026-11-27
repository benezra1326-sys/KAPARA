/**
 * Single source of truth for the product name and launch configuration.
 * ZIV is a working name: change `brand.json` and every surface follows
 * (app.config.ts, API, emails, UI copy via `APP.name`).
 */
import brand from './brand.json';

export const APP = brand;
export * from './age';
export * from './support';
export * from './backend';

export type LocaleCode = 'fr' | 'en' | 'he';
export const SUPPORTED_LOCALES: LocaleCode[] = ['fr', 'en', 'he'];
export const DEFAULT_LOCALE: LocaleCode = 'fr';
/** Locales rendered right-to-left. */
export const RTL_LOCALES: LocaleCode[] = ['he'];

export interface Region {
  code: string; // stable id, e.g. "fr-paris"
  country: string; // ISO 3166-1 alpha-2
  city: string;
  timezone: string; // IANA
  defaultLocale: LocaleCode;
  currency: string; // ISO 4217
  center: { lat: number; lng: number };
  launched: boolean;
}

/** Regions are data, not code. Paris is the first launch market. */
export const REGIONS: Region[] = [
  { code: 'fr-paris', country: 'FR', city: 'Paris', timezone: 'Europe/Paris', defaultLocale: 'fr', currency: 'EUR', center: { lat: 48.8566, lng: 2.3522 }, launched: true },
  { code: 'gb-london', country: 'GB', city: 'London', timezone: 'Europe/London', defaultLocale: 'en', currency: 'GBP', center: { lat: 51.5072, lng: -0.1276 }, launched: false },
  { code: 'il-tel-aviv', country: 'IL', city: 'Tel Aviv', timezone: 'Asia/Jerusalem', defaultLocale: 'he', currency: 'ILS', center: { lat: 32.0853, lng: 34.7818 }, launched: false },
  { code: 'us-new-york', country: 'US', city: 'New York', timezone: 'America/New_York', defaultLocale: 'en', currency: 'USD', center: { lat: 40.7128, lng: -74.006 }, launched: false },
  // Demo / upcoming markets (not launched): ZIV is built to be worldwide.
  { code: 'il-jerusalem', country: 'IL', city: 'Jerusalem', timezone: 'Asia/Jerusalem', defaultLocale: 'he', currency: 'ILS', center: { lat: 31.7683, lng: 35.2137 }, launched: false },
  { code: 'fr-marseille', country: 'FR', city: 'Marseille', timezone: 'Europe/Paris', defaultLocale: 'fr', currency: 'EUR', center: { lat: 43.2965, lng: 5.3698 }, launched: false },
  { code: 'fr-nice', country: 'FR', city: 'Nice', timezone: 'Europe/Paris', defaultLocale: 'fr', currency: 'EUR', center: { lat: 43.7102, lng: 7.262 }, launched: false },
  { code: 'fr-lyon', country: 'FR', city: 'Lyon', timezone: 'Europe/Paris', defaultLocale: 'fr', currency: 'EUR', center: { lat: 45.764, lng: 4.8357 }, launched: false },
  { code: 'ch-geneve', country: 'CH', city: 'Genève', timezone: 'Europe/Zurich', defaultLocale: 'fr', currency: 'CHF', center: { lat: 46.2044, lng: 6.1432 }, launched: false },
  { code: 'be-anvers', country: 'BE', city: 'Anvers', timezone: 'Europe/Brussels', defaultLocale: 'fr', currency: 'EUR', center: { lat: 51.2194, lng: 4.4025 }, launched: false },
  { code: 'it-milan', country: 'IT', city: 'Milan', timezone: 'Europe/Rome', defaultLocale: 'en', currency: 'EUR', center: { lat: 45.4642, lng: 9.19 }, launched: false },
  { code: 'es-marbella', country: 'ES', city: 'Marbella', timezone: 'Europe/Madrid', defaultLocale: 'en', currency: 'EUR', center: { lat: 36.5101, lng: -4.8825 }, launched: false },
  { code: 'ma-casablanca', country: 'MA', city: 'Casablanca', timezone: 'Africa/Casablanca', defaultLocale: 'fr', currency: 'MAD', center: { lat: 33.5731, lng: -7.5898 }, launched: false },
  { code: 'us-miami', country: 'US', city: 'Miami', timezone: 'America/New_York', defaultLocale: 'en', currency: 'USD', center: { lat: 25.7617, lng: -80.1918 }, launched: false },
  { code: 'us-los-angeles', country: 'US', city: 'Los Angeles', timezone: 'America/Los_Angeles', defaultLocale: 'en', currency: 'USD', center: { lat: 34.0522, lng: -118.2437 }, launched: false },
  { code: 'ca-montreal', country: 'CA', city: 'Montréal', timezone: 'America/Toronto', defaultLocale: 'fr', currency: 'CAD', center: { lat: 45.5019, lng: -73.5674 }, launched: false },
  { code: 'ar-buenos-aires', country: 'AR', city: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', defaultLocale: 'en', currency: 'ARS', center: { lat: -34.6037, lng: -58.3816 }, launched: false },
  { code: 'za-johannesburg', country: 'ZA', city: 'Johannesburg', timezone: 'Africa/Johannesburg', defaultLocale: 'en', currency: 'ZAR', center: { lat: -26.2041, lng: 28.0473 }, launched: false },
  { code: 'au-sydney', country: 'AU', city: 'Sydney', timezone: 'Australia/Sydney', defaultLocale: 'en', currency: 'AUD', center: { lat: -33.8688, lng: 151.2093 }, launched: false },
];

export const LAUNCH_REGION = REGIONS[0]!;

/** Product rules shared by app and API. */
export const RULES = {
  /** Members must be adults. Same value as MIN_AGE (age.ts). */
  minAge: 18,
  /** "Croisés": two members are considered crossed under this distance… */
  crossedRadiusMeters: 250,
  /** …and only if both were there within this window. */
  crossedWindowHours: 72,
  /** Locations are snapped to a grid before storage, never shown precisely. */
  locationPrecisionMeters: 150,
  /** Crossings appear only after this delay, so nobody can tell when or where. */
  crossedDisplayDelayHours: 2,
  /** Two samples count as a crossing only if this close in time. */
  crossedTimeToleranceMinutes: 60,
  /** Nothing is recorded within this distance of a member's sensitive zones. */
  crossedSensitiveZoneMeters: 400,
  /** Foreground sampling interval on the device (no background location). */
  crossedPingMinutes: 10,
  /** "Pour toi" home area is snapped to this grid; distances are shown as rounded buckets. */
  homeAreaPrecisionMeters: 1000,
  /** A profile shown in "Pour toi" is not shown again for this many days (unless nothing else is left). */
  picksCooldownDays: 14,
  /** "Pour toi": curated daily selection instead of infinite swipe. */
  dailyPicks: 8,
  /** Live presence expires without heartbeat. */
  livePresenceTtlSeconds: 90,
  liveInviteTtlSeconds: 60,
  /** "Je suis disponible" lasts this long, then the member is invisible again. */
  liveAvailabilityMinutes: 15,
  /** After a declined invitation, the same caller cannot re-invite for this long. */
  liveDeclineCooldownHours: 24,
  /** After an unanswered invitation, a shorter pause before trying again. */
  liveExpiredCooldownMinutes: 10,
  /** Anti-spam: invitations a member can send per 10 minutes. */
  liveMaxInvitesPer10Min: 5,
} as const;
