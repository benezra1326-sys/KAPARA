import type { Photo, Prompt } from '@kapara/shared';

/** What a like was about, as stored with it ({ kind, id }). Older likes may carry none. */
export type LikeTarget = { kind: 'photo' | 'prompt'; id: string };

/** The liked element itself, ready to show: one photo, or one question and its answer. */
export type LikedItem =
  | { kind: 'photo'; url: string; caption?: string }
  | { kind: 'prompt'; questionId: string; answer: string };

/**
 * Finds the liked element in the profile it belongs to (the recipient's own
 * profile for a like received, the other person's for a like sent). Returns
 * null when the like named nothing, or when that photo or answer has since
 * been removed: the like is then shown without it, never with a wrong one.
 */
export function likedItem(target: Partial<LikeTarget> | null | undefined, owner: { photos: Photo[]; prompts: Prompt[] } | null | undefined): LikedItem | null {
  if (!target?.id || !owner) return null;
  if (target.kind === 'photo') {
    const ph = owner.photos.find((p) => p.id === target.id);
    return ph ? { kind: 'photo', url: ph.url, caption: ph.caption } : null;
  }
  if (target.kind === 'prompt') {
    const q = owner.prompts.find((p) => p.id === target.id);
    return q ? { kind: 'prompt', questionId: q.id, answer: q.answer } : null;
  }
  return null;
}
