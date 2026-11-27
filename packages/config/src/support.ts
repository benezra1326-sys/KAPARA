import brand from './brand.json';

/**
 * ZIV support contacts, in one place. The values live in brand.json; the
 * placeholder domain `.invalid` means "not set yet": the app then says so
 * instead of showing a fake address. Replace before any public release.
 */
export const SUPPORT = {
  /** General help, account questions, deletion requests. */
  email: brand.supportEmail,
  /** Safety reports that cannot wait (harassment, threats). Same inbox until a dedicated one exists. */
  safetyEmail: (brand as { safetyEmail?: string }).safetyEmail ?? brand.supportEmail,
  /** Personal data requests (GDPR). */
  privacyEmail: (brand as { privacyEmail?: string }).privacyEmail ?? brand.supportEmail,
} as const;

export const supportConfigured = (email: string = SUPPORT.email) => !!email && !/\.invalid$/i.test(email);
