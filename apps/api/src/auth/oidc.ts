import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { sha256 } from './crypto';

export type SocialProvider = 'apple' | 'google';

export interface ProviderConfig {
  provider: SocialProvider;
  issuers: string[];
  audiences: string[];
  keys: JWTVerifyGetKey;
}

export interface VerifiedIdentity { provider: SocialProvider; subject: string; email?: string; emailVerified: boolean }

export class IdTokenError extends Error {}

const APPLE_JWKS = new URL('https://appleid.apple.com/auth/keys');
const GOOGLE_JWKS = new URL('https://www.googleapis.com/oauth2/v3/certs');
let appleKeys: JWTVerifyGetKey | undefined;
let googleKeys: JWTVerifyGetKey | undefined;

/** Official issuers and key sets. JWKS are fetched lazily and cached by jose. */
export function providerConfig(provider: SocialProvider, audiences: string[]): ProviderConfig {
  if (provider === 'apple') {
    appleKeys ??= createRemoteJWKSet(APPLE_JWKS);
    return { provider, issuers: ['https://appleid.apple.com'], audiences, keys: appleKeys };
  }
  googleKeys ??= createRemoteJWKSet(GOOGLE_JWKS);
  return { provider, issuers: ['https://accounts.google.com', 'accounts.google.com'], audiences, keys: googleKeys };
}

/**
 * Verifies signature, issuer, audience and expiry of an Apple/Google ID token.
 * If the token carries a nonce, the app must send the raw nonce (Apple may
 * carry it hashed with SHA-256, both forms are accepted).
 */
export async function verifyIdToken(cfg: ProviderConfig, idToken: string, rawNonce?: string): Promise<VerifiedIdentity> {
  if (!cfg.audiences.length) throw new IdTokenError('provider_not_configured');
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, cfg.keys, { issuer: cfg.issuers, audience: cfg.audiences, algorithms: ['RS256', 'ES256'], clockTolerance: 30 }));
  } catch {
    throw new IdTokenError('invalid_id_token');
  }
  if (typeof payload.sub !== 'string' || !payload.sub) throw new IdTokenError('invalid_id_token');
  const claimNonce = typeof payload.nonce === 'string' ? payload.nonce : undefined;
  if (claimNonce !== undefined) {
    if (!rawNonce || (claimNonce !== rawNonce && claimNonce !== sha256(rawNonce))) throw new IdTokenError('nonce_mismatch');
  }
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  return { provider: cfg.provider, subject: payload.sub, email, emailVerified };
}
