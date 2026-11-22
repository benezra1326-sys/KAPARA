import 'reflect-metadata';
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_EVENTS_V1 as EV, type LiveMember } from '@kapara/shared';
import type { MemberFacts } from './call-policy';
import { LiveGateway } from './live.gateway';

/** In-memory fakes: no database, no LiveKit (demo mode), no network. */
const card = (id: string): LiveMember => ({ userId: id, firstName: id.toUpperCase(), age: 30, verified: false, isDemo: true });
const facts = (o: Partial<MemberFacts> = {}): MemberFacts => ({
  exists: true, paused: false, liveEnabled: true, liveCallsFrom: 'members',
  gender: null, age: 30, wantsGenders: [], ageMin: null, ageMax: null, ...o,
});

let gw: LiveGateway;
let emitted: { room: string; ev: string; data: any }[];
let db: Record<string, MemberFacts>;
let blocked: Set<string>;
let camera: boolean[];
let reports: string[];

const sock = (userId: string, id = `${userId}-s`) => ({ id, data: { userId } }) as any;
const last = (room: string, ev: string) => [...emitted].reverse().find((e) => e.room === room && e.ev === ev)?.data;

beforeEach(() => {
  emitted = []; camera = []; reports = [];
  db = { a: facts(), b: facts(), c: facts({ liveCallsFrom: 'nobody' }) };
  blocked = new Set();
  const repo = {
    exists: async () => true,
    facts: async (ids: string[]) => new Map(ids.filter((i) => db[i]).map((i) => [i, db[i]!])),
    relationships: async (_me: string, others: string[]) => new Map(others.map((o) => [o, { blockedEitherWay: blocked.has(o), connected: false }])),
    members: async (ids: string[]) => ids.map(card),
    logCall: async () => undefined,
    logState: async () => undefined,
    report: async (_r: string, reported: string) => { reports.push(reported); },
  };
  const livekit = {
    mode: 'demo',
    join: async (room: string) => ({ mode: 'demo', room, notice: 'demo_call_simulated' }),
    setCamera: async (_room: string, _ids: string[], on: boolean) => { camera.push(on); },
    close: async () => undefined,
  };
  gw = new LiveGateway({} as any, livekit as any, repo as any);
  gw.server = {
    to: (room: string) => ({ emit: (ev: string, data: unknown) => emitted.push({ room, ev, data }) }),
    emit: (ev: string, data: unknown) => emitted.push({ room: '*', ev, data }),
    in: () => ({ fetchSockets: async () => [] }),
  } as any;
});
afterEach(() => gw.onModuleDestroy());

async function connectedCall() {
  await gw.setPresence(sock('b'), { available: true });
  const inv = await gw.invite(sock('a'), { to: 'b' });
  assert.ok(inv.ok);
  const callId = (inv as any).call.callId as string;
  assert.deepEqual(await gw.respond(sock('b'), { callId, accept: true }), { ok: true });
  return callId;
}

test('only available members who allow it appear and can be invited', async () => {
  await gw.setPresence(sock('b'), { available: true });
  await gw.setPresence(sock('c'), { available: true });
  const list = await gw.listPresence(sock('a'));
  assert.deepEqual((list as any).members.map((m: LiveMember) => m.userId), ['b']);
  assert.deepEqual(await gw.invite(sock('a'), { to: 'c' }), { ok: false, error: 'not_available' });
  blocked.add('b');
  assert.deepEqual(await gw.invite(sock('a'), { to: 'b' }), { ok: false, error: 'not_available' });
});

test('a member with Live turned off cannot become available', async () => {
  db.a = facts({ liveEnabled: false });
  assert.deepEqual(await gw.setPresence(sock('a'), { available: true }), { ok: false, error: 'live_disabled' });
});

test('invitation → acceptance gives audio-only join info, never the camera', async () => {
  const callId = await connectedCall();
  assert.equal(last('user:b', EV.inviteReceived).peer.userId, 'a');
  assert.equal(last('user:a', EV.join).join.mode, 'demo');
  assert.equal(last('user:a', EV.stateChanged).state, 'connected');
  assert.deepEqual(camera, []);
  assert.ok(callId);
});

test('video needs a request from one and acceptance from the other', async () => {
  const callId = await connectedCall();
  assert.deepEqual(await gw.videoRequest(sock('a'), { callId }), { ok: true });
  assert.equal(last('user:b', EV.stateChanged).videoRequestedBy, 'peer');
  assert.deepEqual(await gw.videoRespond(sock('a'), { callId, accept: true }), { ok: false, error: 'not_allowed' });
  assert.deepEqual(camera, []);
  assert.deepEqual(await gw.videoRespond(sock('b'), { callId, accept: true }), { ok: true });
  assert.equal(last('user:a', EV.stateChanged).state, 'video_on');
  assert.deepEqual(camera, [true]);
  assert.deepEqual(await gw.videoStop(sock('b'), { callId }), { ok: true });
  assert.deepEqual(camera, [true, false]);
});

test('a decline frees both members and starts a cooldown', async () => {
  await gw.setPresence(sock('b'), { available: true });
  const inv = await gw.invite(sock('a'), { to: 'b' });
  const callId = (inv as any).call.callId;
  await gw.respond(sock('b'), { callId, accept: false });
  assert.equal(last('user:a', EV.stateChanged).state, 'declined');
  assert.deepEqual(await gw.invite(sock('a'), { to: 'b' }), { ok: false, error: 'cooldown' });
});

test('outsiders cannot act on a call, and reporting ends it', async () => {
  const callId = await connectedCall();
  assert.deepEqual(await gw.hangup(sock('c'), { callId }), { ok: false, error: 'not_found' });
  assert.deepEqual(await gw.report(sock('b'), { callId, reason: 'inappropriate' }), { ok: true });
  assert.deepEqual(reports, ['a']);
  assert.equal(last('user:a', EV.stateChanged).state, 'ended');
});

test('malformed payloads are refused', async () => {
  assert.deepEqual(await gw.invite(sock('a'), { to: 42 }), { ok: false, error: 'invalid_input' });
  assert.deepEqual(await gw.setPresence(sock('a'), null), { ok: false, error: 'invalid_input' });
});

test('only access tokens open a Live socket', async () => {
  const make = (typ: string | undefined) => {
    const g = new LiveGateway({ verifyAsync: async () => ({ sub: 'a', typ }) } as any, {} as any, { exists: async () => true } as any);
    g.server = gw.server;
    return g;
  };
  for (const [typ, ok] of [['access', true], ['refresh', false], [undefined, false]] as const) {
    const g = make(typ);
    let disconnected = false;
    const s: any = { id: 's', data: {}, handshake: { auth: { token: 't' } }, join: async () => undefined, emit: () => undefined, disconnect: () => { disconnected = true; } };
    await g.handleConnection(s);
    assert.equal(disconnected, !ok, `typ=${typ}`);
    g.onModuleDestroy();
  }
});
