import { sha256Hex } from './sha256';

/**
 * Administrator e-mails, stored as SHA-256 hashes so the addresses never
 * appear in the app bundle. Extra ones can be added at build time with
 * EXPO_PUBLIC_ADMIN_EMAIL_HASHES (comma-separated hex hashes).
 *
 * This only unlocks the demo back-office. In connected mode the API is the
 * sole judge of who is an administrator.
 */
const BUILT_IN = [
  '20bccfa0a6f8d190a33c0d18777c757a28fe498b90f366ae8690d1dc9953528e', // Avishay (personal)
  '9342ebeff4ec056b18a8375a3b0ab8e103ca4c1284cee41b5a726b2207c050e2', // Avishay (work)
];
const EXTRA = (process.env.EXPO_PUBLIC_ADMIN_EMAIL_HASHES ?? '').split(',').map((h: string) => h.trim().toLowerCase()).filter(Boolean);
const ADMIN_HASHES = new Set([...BUILT_IN, ...EXTRA]);

export const isAdminEmail = (email?: string | null) => !!email && ADMIN_HASHES.has(sha256Hex(email.trim().toLowerCase()));
