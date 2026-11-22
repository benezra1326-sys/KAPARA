import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session, type SessionStorage, type StoredSession } from './session';

const memory = (initial: StoredSession | null = null) => {
  let v = initial;
  return { load: async () => v, save: async (s: StoredSession | null) => { v = s; }, peek: () => v } satisfies SessionStorage & { peek(): unknown };
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('fresh access token is used as is, no refresh', async () => {
  let now = 1_000_000;
  const calls: string[] = [];
  const s = new Session('http://api', memory({ accessToken: 'a1', refreshToken: 'r1', userId: 'u', accessExpiresAt: now + 10 * 60_000 }),
    async (u) => { calls.push(u); return json(200, {}); }, () => now);
  assert.equal(await s.accessToken(), 'a1');
  assert.equal(s.status, 'signedIn');
  assert.deepEqual(calls, []);
  now += 0;
});

test('token close to expiry is refreshed once for concurrent callers (rotation is single-flight)', async () => {
  const now = 1_000_000;
  const store = memory({ accessToken: 'a1', refreshToken: 'r1', userId: 'u', accessExpiresAt: now + 30_000 });
  let refreshes = 0;
  const s = new Session('http://api', store, async (u, init) => {
    assert.equal(u, 'http://api/v1/auth/refresh');
    assert.deepEqual(JSON.parse(String(init.body)), { refreshToken: 'r1' });
    refreshes++;
    await new Promise((r) => setTimeout(r, 10));
    return json(200, { accessToken: 'a2', refreshToken: 'r2', expiresIn: 900, userId: 'u', isNewUser: false });
  }, () => now);
  const tokens = await Promise.all([s.accessToken(), s.accessToken(), s.accessToken()]);
  assert.deepEqual(tokens, ['a2', 'a2', 'a2']);
  assert.equal(refreshes, 1);
  assert.equal((store.peek() as StoredSession).refreshToken, 'r2');
});

test('401 after a token was already replaced does not rotate again', async () => {
  const now = 1_000_000;
  let refreshes = 0;
  const s = new Session('http://api', memory({ accessToken: 'a1', refreshToken: 'r1', userId: 'u', accessExpiresAt: now + 600_000 }), async () => {
    refreshes++;
    return json(200, { accessToken: `a${refreshes + 1}`, refreshToken: `r${refreshes + 1}`, expiresIn: 900, userId: 'u' });
  }, () => now);
  assert.equal(await s.afterUnauthorized('a1'), 'a2');
  assert.equal(await s.afterUnauthorized('a1'), 'a2');
  assert.equal(refreshes, 1);
});

test('rejected refresh token signs out and clears storage', async () => {
  const store = memory({ accessToken: 'a1', refreshToken: 'r1', userId: 'u', accessExpiresAt: 0 });
  const s = new Session('http://api', store, async () => json(401, { message: 'invalid_refresh_token' }), () => 1_000_000);
  let notified = 0;
  s.subscribe(() => notified++);
  await s.init();
  assert.equal(await s.accessToken(), null);
  assert.equal(s.status, 'signedOut');
  assert.equal(store.peek(), null);
  assert.ok(notified >= 1);
});

test('network failure during refresh keeps the session (offline is not signed out)', async () => {
  const store = memory({ accessToken: 'a1', refreshToken: 'r1', userId: 'u', accessExpiresAt: 0 });
  const s = new Session('http://api', store, async () => { throw new TypeError('Network request failed'); }, () => 1_000_000);
  await assert.rejects(s.accessToken());
  assert.equal(s.status, 'signedIn');
  assert.notEqual(store.peek(), null);
});

test('sign in stores tokens; sign out revokes server-side and forgets locally', async () => {
  const store = memory();
  const calls: { u: string; body: unknown }[] = [];
  const s = new Session('http://api', store, async (u, init) => { calls.push({ u, body: JSON.parse(String(init.body)) }); return json(200, { ok: true }); }, () => 0);
  await s.init();
  assert.equal(s.status, 'signedOut');
  await s.signIn({ accessToken: 'a', refreshToken: 'r', expiresIn: 900, userId: 'u1' });
  assert.equal(s.status, 'signedIn');
  assert.equal(s.userId, 'u1');
  assert.equal(await s.accessToken(), 'a');
  await s.signOut();
  assert.equal(s.status, 'signedOut');
  assert.equal(store.peek(), null);
  assert.deepEqual(calls, [{ u: 'http://api/v1/auth/logout', body: { refreshToken: 'r' } }]);
});
