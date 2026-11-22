import type { PhotoRef } from '@kapara/shared';
import { isOwnPhotoKey } from './keys';

export type PlannedPhoto =
  | { kind: 'keep'; id: string; position: number; caption?: string }
  | { kind: 'create'; key: string; position: number; caption?: string };

export type PhotoPlan =
  | { ok: true; photos: PlannedPhoto[]; removeIds: string[]; removeKeys: string[] }
  | { ok: false; error: 'unknown_photo' | 'foreign_key' | 'duplicate' };

/**
 * Turns the ordered list sent by the app into what to keep, create and
 * delete. Only the member's own photos and keys issued for them are accepted.
 */
export function planPhotos(userId: string, existing: { id: string; storageKey: string | null }[], wanted: PhotoRef[]): PhotoPlan {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const knownKeys = new Set(existing.map((p) => p.storageKey).filter(Boolean));
  const seen = new Set<string>();
  const photos: PlannedPhoto[] = [];
  for (const [position, ref] of wanted.entries()) {
    const tag = 'id' in ref ? `id:${ref.id}` : `key:${ref.key}`;
    if (seen.has(tag)) return { ok: false, error: 'duplicate' };
    seen.add(tag);
    if ('id' in ref) {
      if (!byId.has(ref.id)) return { ok: false, error: 'unknown_photo' };
      photos.push({ kind: 'keep', id: ref.id, position, caption: ref.caption });
    } else {
      if (!isOwnPhotoKey(userId, ref.key)) return { ok: false, error: 'foreign_key' };
      if (knownKeys.has(ref.key)) return { ok: false, error: 'duplicate' };
      photos.push({ kind: 'create', key: ref.key, position, caption: ref.caption });
    }
  }
  const kept = new Set(photos.flatMap((p) => (p.kind === 'keep' ? [p.id] : [])));
  const removed = existing.filter((p) => !kept.has(p.id));
  return { ok: true, photos, removeIds: removed.map((p) => p.id), removeKeys: removed.flatMap((p) => (p.storageKey ? [p.storageKey] : [])) };
}
