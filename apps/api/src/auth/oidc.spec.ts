import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { sha256 } from './crypto';
import { verifyIdToken, type ProviderConfig } from './oidc';

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  const cfg: ProviderConfig = { provider: 'apple', issuers: ['https://appleid.apple.com'], audiences: ['app.kapara.ios'], keys: createLocalJWKSet({ keys: [jwk] }) };
  const sign = (claims: Record<string, unknown>, o: { iss?: string; aud?: string; exp?: string } = {}) =>
    new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setSubject('apple-sub-1')
      .setIssuer(o.iss ?? 'https://appleid.apple.com').setAudience(o.aud ?? 'app.kapara.ios')
      .setIssuedAt().setExpirationTime(o.exp ?? '5m').sign(privateKey);
  return { cfg, sign };
}

test('valid token gives subject and verified email', async () => {
  const { cfg, sign } = await setup();
  const id = await verifyIdToken(cfg, await sign({ email: 'X@Privaterelay.appleid.com', email_verified: 'true' }));
  assert.deepEqual(id, { provider: 'apple', subject: 'apple-sub-1', email: 'x@privaterelay.appleid.com', emailVerified: true });
});
test('wrong audience or issuer is rejected', async () => {
  const { cfg, sign } = await setup();
  await assert.rejects(verifyIdToken(cfg, await sign({}, { aud: 'someone.else' })), /invalid_id_token/);
  await assert.rejects(verifyIdToken(cfg, await sign({}, { iss: 'https://evil.example' })), /invalid_id_token/);
});
test('expired token is rejected', async () => {
  const { cfg, sign } = await setup();
  await assert.rejects(verifyIdToken(cfg, await sign({}, { exp: '-5m' })), /invalid_id_token/);
});
test('nonce must match raw or sha256 form', async () => {
  const { cfg, sign } = await setup();
  await assert.rejects(verifyIdToken(cfg, await sign({ nonce: 'abc' })), /nonce_mismatch/);
  await assert.rejects(verifyIdToken(cfg, await sign({ nonce: 'abc' }), 'xyz'), /nonce_mismatch/);
  assert.ok(await verifyIdToken(cfg, await sign({ nonce: 'abc' }), 'abc'));
  assert.ok(await verifyIdToken(cfg, await sign({ nonce: sha256('raw') }), 'raw'));
});
test('unconfigured provider refuses', async () => {
  const { cfg, sign } = await setup();
  await assert.rejects(verifyIdToken({ ...cfg, audiences: [] }, await sign({})), /provider_not_configured/);
});
