import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { isOwnPhotoKey, newPhotoKey } from './keys';
import { planPhotos } from './photo-plan';
import { presign } from './sigv4';
import { sniffImage } from './sniff';
import { LocalUploadError, PhotoStorage, signLocalToken, verifyLocalToken } from './storage';

// env() is read lazily: local storage settings only need to be set before the first call.
process.env.DATABASE_URL ??= 'postgresql://kapara:kapara@localhost:5432/kapara';
process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'kapara-photos-'));
for (const k of ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) delete process.env[k];


const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1]);

test('SigV4 pre-signed URL matches the AWS documentation example', () => {
  // docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
  const url = presign({
    method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt', region: 'us-east-1',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    expiresSeconds: 86400, now: new Date('2013-05-24T00:00:00Z'),
  });
  assert.match(url, /X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
  assert.match(url, /X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request/);
});

test('signed upload headers are part of the signature', () => {
  const base = { method: 'PUT' as const, url: 'https://b.s3.eu-west-3.amazonaws.com/profiles/u/x.jpg', region: 'eu-west-3', accessKeyId: 'A', secretAccessKey: 'S', expiresSeconds: 300, now: new Date('2026-11-22T00:00:00Z') };
  const jpeg = presign({ ...base, headers: { 'content-type': 'image/jpeg' } });
  assert.match(jpeg, /X-Amz-SignedHeaders=content-type%3Bhost/);
  assert.notEqual(jpeg, presign({ ...base, headers: { 'content-type': 'image/png' } }));
});

test('images are recognised by their bytes, not their name', () => {
  assert.equal(sniffImage(JPEG), 'image/jpeg');
  assert.equal(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(sniffImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(sniffImage(Buffer.from('GIF89a')), null);
});

test('photo keys are unguessable and tied to their owner', () => {
  const k = newPhotoKey('user_1', 'image/jpeg');
  assert.match(k, /^profiles\/user_1\/[A-Za-z0-9_-]{22}\.jpg$/);
  assert.notEqual(k, newPhotoKey('user_1', 'image/jpeg'));
  assert.ok(isOwnPhotoKey('user_1', k));
  assert.ok(!isOwnPhotoKey('user_2', k));
  assert.ok(!isOwnPhotoKey('user_1', 'profiles/user_1/../user_2/aaaaaaaaaaaaaaaaaaaaaa.jpg'));
});

test('photo list: keep, reorder, add and delete in one call', () => {
  const key = newPhotoKey('me', 'image/jpeg');
  const r = planPhotos('me', [{ id: 'a', storageKey: 'profiles/me/old' }, { id: 'b', storageKey: null }], [{ key }, { id: 'b' }]);
  assert.ok(r.ok);
  assert.deepEqual(r.photos.map((p) => [p.kind, p.position]), [['create', 0], ['keep', 1]]);
  assert.deepEqual(r.removeIds, ['a']);
  assert.deepEqual(r.removeKeys, ['profiles/me/old']);
});

test('photo list refuses other members\' photos and keys, and duplicates', () => {
  assert.deepEqual(planPhotos('me', [], [{ id: 'not-mine' }]), { ok: false, error: 'unknown_photo' });
  assert.deepEqual(planPhotos('me', [], [{ key: newPhotoKey('other', 'image/jpeg') }]), { ok: false, error: 'foreign_key' });
  assert.deepEqual(planPhotos('me', [{ id: 'a', storageKey: null }], [{ id: 'a' }, { id: 'a' }]), { ok: false, error: 'duplicate' });
  const r = planPhotos('me', [{ id: 'a', storageKey: 'k' }], []);
  assert.ok(r.ok && r.removeKeys[0] === 'k', 'an empty list removes every photo');
});

test('local upload tickets: signed, single file, expiring', () => {
  const key = newPhotoKey('me', 'image/jpeg');
  const token = signLocalToken({ k: key, ct: 'image/jpeg', exp: 2_000 });
  assert.equal(verifyLocalToken(token, 1_000)?.k, key);
  assert.equal(verifyLocalToken(token, 3_000), null, 'expired');
  const [payload, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ k: newPhotoKey('victim', 'image/jpeg'), ct: 'image/jpeg', exp: 2_000 })).toString('base64url');
  assert.equal(verifyLocalToken(`${forged}.${sig}`, 1_000), null, 'tampered');
  assert.ok(payload);
});

test('local storage (development): upload, inspect, refuse non-images, remove', async () => {
  const s = new PhotoStorage();
  assert.equal(s.mode, 'local');
  const t = s.createUpload('me', 'image/jpeg', 'http://10.0.2.2:3000');
  assert.equal(t.mode, 'local');
  assert.match(t.uploadUrl, /^http:\/\/10\.0\.2\.2:3000\/v1\/media\/local\//);
  const token = t.uploadUrl.split('/').pop()!;

  await assert.rejects(s.writeLocal(token, 'image/png', Readable.from([JPEG])), (e) => e instanceof LocalUploadError && e.code === 'content_type_mismatch');
  await s.writeLocal(token, 'image/jpeg', Readable.from([JPEG]));
  await assert.rejects(s.writeLocal(token, 'image/jpeg', Readable.from([JPEG])), (e) => e instanceof LocalUploadError && e.status === 409);
  assert.deepEqual(await s.inspect(t.key), { size: JPEG.length, type: 'image/jpeg' });
  assert.match(s.publicUrl(t.key, 'http://10.0.2.2:3000'), /^http:\/\/10\.0\.2\.2:3000\/v1\/media\/local\/me\/[A-Za-z0-9_-]{22}\.jpg$/);

  const bad = s.createUpload('me', 'image/jpeg', 'http://x');
  await assert.rejects(s.writeLocal(bad.uploadUrl.split('/').pop()!, 'image/jpeg', Readable.from([Buffer.from('<html>')])), (e) => e instanceof LocalUploadError && e.status === 415);
  assert.equal(await s.inspect(bad.key), null);

  await s.remove([t.key]);
  assert.equal(await s.inspect(t.key), null);
});
