import { createHash, createHmac } from 'node:crypto';

/**
 * AWS Signature V4 pre-signed URLs (query-string auth), as documented in
 * "Authenticating Requests: Using Query Parameters (AWS Signature Version 4)".
 * Works with any S3-compatible storage (AWS S3, Cloudflare R2, Scaleway, MinIO).
 * Written by hand to avoid pulling the whole AWS SDK for three calls.
 */
export interface PresignInput {
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  /** Full object URL, e.g. https://bucket.s3.eu-west-3.amazonaws.com/profiles/u/x.jpg */
  url: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresSeconds: number;
  /** Extra headers the client must send exactly (e.g. content-type). `host` is always signed. */
  headers?: Record<string, string>;
  now?: Date;
}

/** RFC 3986 encoding, as SigV4 requires (keeps A-Z a-z 0-9 - _ . ~). */
export const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const hmac = (key: Buffer | string, s: string) => createHmac('sha256', key).update(s, 'utf8').digest();

export function presign(i: PresignInput): string {
  const u = new URL(i.url);
  const now = i.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${i.region}/s3/aws4_request`;

  const headers: Record<string, string> = { host: u.host };
  for (const [k, v] of Object.entries(i.headers ?? {})) headers[k.toLowerCase()] = v.trim();
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(';');

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${i.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(i.expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalQuery = Object.keys(query).sort().map((k) => `${rfc3986(k)}=${rfc3986(query[k]!)}`).join('&');
  // S3 path: each segment encoded once, slashes kept.
  const canonicalPath = decodeURIComponent(u.pathname).split('/').map(rfc3986).join('/');
  const canonicalRequest = [
    i.method, canonicalPath, canonicalQuery,
    names.map((n) => `${n}:${headers[n]}\n`).join(''), signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${i.secretAccessKey}`, day), i.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', key).update(stringToSign, 'utf8').digest('hex');
  return `${u.origin}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
