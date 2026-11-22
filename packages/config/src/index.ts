/**
 * Single source of truth for the product name and launch configuration.
 * MOTEK (formerly KAPARA) is a working name: change `brand.json` and every surface follows
 * (app.config.ts, API, emails, UI copy via `APP.name`).
 */
import brand from './brand.json';

export const APP = brand;

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
];

export const LAUNCH_REGION = REGIONS[0]!;

/** Product rules shared by app and API. */
export const RULES = {
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
