import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PHOTO_LIMITS, type PhotoContentType, type PhotoUploadTicket } from '@kapara/shared';
import { env, s3Configured } from '../common/env';
import { newPhotoKey, parsePhotoKey } from './keys';
import { presign } from './sigv4';
import { sniffImage } from './sniff';

/** Signed photo links live two hours (see signedRead). */
export const PHOTO_READ_SECONDS = 2 * 3600;

/** What the API checked about an uploaded file before attaching it to a profile. */
export type Inspected = { size: number; type: PhotoContentType | null };

/**
 * Photo storage. With S3_* variables: pre-signed URLs, the phone sends the
 * file straight to the bucket and never sees a storage key. Without them, in
 * development only: files go to the API's disk (UPLOAD_DIR), announced as
 * `local` in the upload ticket. Production without storage refuses uploads.
 */
@Injectable()
export class PhotoStorage {
  private readonly log = new Logger(PhotoStorage.name);

  get mode(): 's3' | 'local' | 'unavailable' {
    if (s3Configured()) return 's3';
    return env().NODE_ENV === 'production' ? 'unavailable' : 'local';
  }

  createUpload(userId: string, contentType: PhotoContentType, requestBase: string, now = new Date()): PhotoUploadTicket {
    const key = newPhotoKey(userId, contentType);
    const expiresAt = new Date(now.getTime() + PHOTO_LIMITS.ticketSeconds * 1000).toISOString();
    const headers = { 'content-type': contentType };
    if (this.mode === 's3') {
      const uploadUrl = presign({ ...this.s3(), method: 'PUT', url: this.objectUrl(key), expiresSeconds: PHOTO_LIMITS.ticketSeconds, headers, now });
      return { mode: 's3', key, uploadUrl, method: 'PUT', headers, expiresAt };
    }
    this.assertLocal();
    const token = signLocalToken({ k: key, ct: contentType, exp: Math.floor(Date.parse(expiresAt) / 1000) });
    return { mode: 'local', key, uploadUrl: `${this.apiBase(requestBase)}/v1/media/local/${token}`, method: 'PUT', headers, expiresAt };
  }

  /** Size and real type of an uploaded object, or null when it does not exist. */
  async inspect(key: string): Promise<Inspected | null> {
    if (this.mode === 's3') {
      const res = await fetch(presign({ ...this.s3(), method: 'GET', url: this.objectUrl(key), expiresSeconds: 60 }), { headers: { range: 'bytes=0-15' } });
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) throw new ServiceUnavailableException('photo_storage_error');
      const head = new Uint8Array(await res.arrayBuffer());
      const total = Number(res.headers.get('content-range')?.split('/')[1] ?? res.headers.get('content-length') ?? NaN);
      return { size: Number.isFinite(total) ? total : Infinity, type: sniffImage(head) };
    }
    this.assertLocal();
    const path = this.localPath(key);
    const st = await stat(path).catch(() => null);
    if (!st) return null;
    const fh = await open(path, 'r');
    try {
      const buf = new Uint8Array(16);
      await fh.read(buf, 0, 16, 0);
      return { size: st.size, type: sniffImage(buf) };
    } finally { await fh.close(); }
  }

  publicUrl(key: string, requestBase: string): string {
    if (this.mode === 's3') {
      const base = env().S3_PUBLIC_URL.replace(/\/+$/, '');
      return base ? `${base}/${key}` : this.objectUrl(key);
    }
    return `${this.apiBase(requestBase)}/v1/media/local/${key.split('/').slice(1).join('/')}`;
  }

  /** Private bucket (no S3_PUBLIC_URL): photos are only reachable through signed links. */
  get privateReads(): boolean { return this.mode === 's3' && !env().S3_PUBLIC_URL; }

  /** Prefix of every stored photo URL in the private bucket. */
  get privatePrefix(): string { return this.objectUrl('profiles/'); }

  /**
   * Signed GET link for a stored photo URL. Signed at the start of the hour and
   * valid two hours, so the link stays the same within the hour (image caches)
   * and always works at least an hour after it is handed out.
   */
  signedRead(url: string, now = new Date()): string {
    if (!this.privateReads || !url.startsWith(this.privatePrefix)) return url;
    const hour = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
    return presign({ ...this.s3(), method: 'GET', url, expiresSeconds: PHOTO_READ_SECONDS, now: hour });
  }

  /** Best effort: a file that cannot be removed now is logged, never blocks the member. */
  async remove(keys: string[]): Promise<void> {
    await Promise.all(keys.map(async (key) => {
      try {
        if (this.mode === 's3') {
          const res = await fetch(presign({ ...this.s3(), method: 'DELETE', url: this.objectUrl(key), expiresSeconds: 60 }), { method: 'DELETE' });
          if (!res.ok && res.status !== 404) throw new Error(`status ${res.status}`);
        } else if (this.mode === 'local') {
          await rm(this.localPath(key), { force: true });
        }
      } catch (err) {
        this.log.warn(`photo removal failed (${(err as Error).message}); left for cleanup`);
      }
    }));
  }

  // ---- local (development) ----

  /** Writes an upload sent to PUT /v1/media/local/:token. */
  async writeLocal(token: string, contentType: string | undefined, body: AsyncIterable<Buffer>): Promise<void> {
    this.assertLocal();
    const t = verifyLocalToken(token);
    if (!t) throw new LocalUploadError(403, 'upload_ticket_invalid');
    if (contentType?.split(';')[0]?.trim() !== t.ct) throw new LocalUploadError(400, 'content_type_mismatch');
    const path = this.localPath(t.k);
    if (await stat(path).catch(() => null)) throw new LocalUploadError(409, 'upload_ticket_used');
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.part`;
    const fh = await open(tmp, 'wx').catch(() => { throw new LocalUploadError(409, 'upload_ticket_used'); });
    let size = 0;
    let head = Buffer.alloc(0);
    try {
      for await (const chunk of body) {
        size += chunk.length;
        if (size > PHOTO_LIMITS.maxBytes) throw new LocalUploadError(413, 'photo_too_large');
        if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16 - head.length)]);
        await fh.write(chunk);
      }
    } catch (err) {
      await fh.close();
      await rm(tmp, { force: true });
      throw err;
    }
    await fh.close();
    if (!size || sniffImage(head) !== t.ct) { await rm(tmp, { force: true }); throw new LocalUploadError(415, 'not_an_image'); }
    await rename(tmp, path);
  }

  localFile(userId: string, file: string): { path: string; type: string } | null {
    const parsed = parsePhotoKey(`profiles/${userId}/${file}`);
    if (!parsed || this.mode !== 'local') return null;
    const ext = file.split('.').pop();
    return { path: this.localPath(`profiles/${userId}/${file}`), type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' };
  }

  // ---- helpers ----

  private assertLocal() {
    if (this.mode !== 'local') throw new ServiceUnavailableException('photo_storage_not_configured');
  }

  private localPath(key: string) {
    if (!parsePhotoKey(key)) throw new LocalUploadError(400, 'invalid_key');
    return join(resolve(env().UPLOAD_DIR), key);
  }

  private apiBase(requestBase: string) {
    return (env().PUBLIC_API_URL || requestBase).replace(/\/+$/, '');
  }

  private s3() {
    const e = env();
    return { region: e.S3_REGION, accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY };
  }

  /** Path-style with a custom endpoint (R2, MinIO, Scaleway), virtual-hosted on AWS. */
  private objectUrl(key: string) {
    const e = env();
    const path = key.split('/').map(encodeURIComponent).join('/');
    if (e.S3_ENDPOINT) return `${e.S3_ENDPOINT.replace(/\/+$/, '')}/${e.S3_BUCKET}/${path}`;
    return `https://${e.S3_BUCKET}.s3.${e.S3_REGION}.amazonaws.com/${path}`;
  }
}

export class LocalUploadError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

// One-file upload tickets for local storage, signed with the API secret.
type LocalToken = { k: string; ct: PhotoContentType; exp: number };
const mac = (payload: string) => createHmac('sha256', `photo-upload:${env().JWT_SECRET}`).update(payload).digest('base64url');

export function signLocalToken(t: LocalToken): string {
  const payload = Buffer.from(JSON.stringify(t)).toString('base64url');
  return `${payload}.${mac(payload)}`;
}

export function verifyLocalToken(token: string, nowSeconds = Math.floor(Date.now() / 1000)): LocalToken | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(mac(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const t = JSON.parse(Buffer.from(payload, 'base64url').toString()) as LocalToken;
    return t.exp >= nowSeconds && parsePhotoKey(t.k) ? t : null;
  } catch { return null; }
}
