import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { PhotoStorage } from './storage';

/** Replaces, anywhere in a JSON value, private photo URLs with signed links. */
export function signPhotoUrls<T>(value: T, sign: (url: string) => string, prefix: string, depth = 0): T {
  if (depth > 12 || value == null) return value;
  if (typeof value === 'string') return (value.startsWith(prefix) ? sign(value) : value) as T;
  if (Array.isArray(value)) return value.map((v) => signPhotoUrls(v, sign, prefix, depth + 1)) as T;
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = signPhotoUrls(v, sign, prefix, depth + 1);
    return out as T;
  }
  return value;
}

/**
 * Photos stay in a private bucket. Every API answer that carries a photo
 * (Pour toi, Croisés, Live, profiles, conversations…) gets links that expire,
 * in one place, so no endpoint can leak a permanent URL by forgetting it.
 */
@Injectable()
export class SignedPhotoUrls implements NestInterceptor {
  constructor(private readonly storage: PhotoStorage) {}
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.storage.privateReads) return next.handle();
    const prefix = this.storage.privatePrefix;
    const now = new Date();
    return next.handle().pipe(map((body) => signPhotoUrls(body, (u) => this.storage.signedRead(u, now), prefix)));
  }
}
