import { z } from 'zod';

/** Profile photos: limits shared by the app and the API. */
export const PHOTO_LIMITS = {
  maxCount: 6,
  /** Upload size cap. The app re-encodes photos (max 1600 px, JPEG) well below it. */
  maxBytes: 10 * 1024 * 1024,
  /** Long side, in pixels, after re-encoding on the phone. */
  maxSide: 1600,
  /** Upload tickets expire quickly: one ticket = one file. */
  ticketSeconds: 300,
} as const;

export const PhotoContentType = z.enum(['image/jpeg', 'image/png', 'image/webp']);
export type PhotoContentType = z.infer<typeof PhotoContentType>;

/** Ask the API for an upload ticket before sending the file. */
export const PhotoUploadRequest = z.object({
  contentType: PhotoContentType,
  size: z.number().int().min(1).max(PHOTO_LIMITS.maxBytes),
});
export type PhotoUploadRequest = z.infer<typeof PhotoUploadRequest>;

/**
 * Where to send the file. `s3`: a pre-signed URL of the object storage
 * (the app never holds a storage key). `local`: development fallback, the
 * API stores the file on its own disk; refused in production.
 */
export const PhotoUploadTicket = z.object({
  mode: z.enum(['s3', 'local']),
  /** Storage key to reference in PUT /profiles/me/photos once uploaded. */
  key: z.string(),
  uploadUrl: z.string().url(),
  method: z.literal('PUT'),
  /** Headers to send exactly as given (they are part of the signature). */
  headers: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});
export type PhotoUploadTicket = z.infer<typeof PhotoUploadTicket>;

/** One entry of the ordered photo list: an existing photo (`id`) or a fresh upload (`key`). */
export const PhotoRef = z.union([
  z.object({ id: z.string().min(1).max(64), caption: z.string().trim().max(120).optional() }).strict(),
  z.object({ key: z.string().min(1).max(200), caption: z.string().trim().max(120).optional() }).strict(),
]);
export type PhotoRef = z.infer<typeof PhotoRef>;
