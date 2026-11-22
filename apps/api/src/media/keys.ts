import { randomBytes } from 'node:crypto';
import type { PhotoContentType } from '@kapara/shared';

const EXT: Record<PhotoContentType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** profiles/<userId>/<128 random bits>.<ext> — unguessable, and tied to its owner. */
export const newPhotoKey = (userId: string, ct: PhotoContentType) =>
  `profiles/${userId}/${randomBytes(16).toString('base64url')}.${EXT[ct]}`;

const KEY = /^profiles\/([A-Za-z0-9_-]{1,64})\/([A-Za-z0-9_-]{22})\.(jpg|png|webp)$/;

/** True only for a key this API could have issued to `userId`. */
export const isOwnPhotoKey = (userId: string, key: string) => KEY.exec(key)?.[1] === userId;
export const parsePhotoKey = (key: string) => {
  const m = KEY.exec(key);
  return m ? { userId: m[1]!, file: `${m[2]}.${m[3]}` } : null;
};
