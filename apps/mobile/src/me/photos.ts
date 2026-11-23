import { useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PHOTO_LIMITS, type Photo, type PhotoRef, type PhotoUploadTicket, type ProfilePublic } from '@kapara/shared';
import { api, ApiError, DEMO_MODE } from '../api/client';
import { meStore } from './store';
import { CLOUD, sb } from '../cloud/client';

/**
 * A photo of the member's own profile, as the app holds it:
 * - committed: `id` is the server id, no `key`;
 * - uploaded but not yet attached to the profile (onboarding): `key` set;
 * - in progress or failed: `status`.
 * `url` stays the local file once picked, so the photo shows instantly everywhere.
 */
export type MyPhoto = Photo & { key?: string; status?: 'uploading' | 'error'; localUri?: string };

export type PickResult =
  | { kind: 'picked'; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'denied'; canAskAgain: boolean };

/**
 * Opens the system photo picker or the camera. The library picker needs no
 * permission on current iOS and Android (system picker); the camera does.
 */
export async function pickPhoto(source: 'library' | 'camera'): Promise<PickResult> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 1, exif: false };
  if (source === 'camera' && Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { kind: 'denied', canAskAgain: perm.canAskAgain };
  }
  try {
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = r.canceled ? undefined : r.assets[0];
    if (!asset) return { kind: 'cancelled' };
    return { kind: 'picked', uri: await reencode(asset.uri, asset.width, asset.height) };
  } catch {
    // Older Android/iOS without the system picker: access refused.
    return { kind: 'denied', canAskAgain: false };
  }
}

export const openSettings = () => { if (Platform.OS !== 'web') void Linking.openSettings(); };

/**
 * Re-encodes to JPEG, longest side ≤ 1600 px. This also drops every
 * metadata block (EXIF, GPS position, device), which never leaves the phone.
 */
async function reencode(uri: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  const max = PHOTO_LIMITS.maxSide;
  if (Math.max(width, height) > max) ctx.resize(width >= height ? { width: max } : { height: max });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return saved.uri;
}

/** Ticket from the API, then the file goes straight to storage. Returns the storage key. */
async function upload(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  if (blob.size > PHOTO_LIMITS.maxBytes) throw new ApiError(413, 'photo_too_large');
  const ticket = await api<PhotoUploadTicket>('/media/photo-uploads', { method: 'POST', body: JSON.stringify({ contentType: 'image/jpeg', size: blob.size }) });
  const res = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: blob });
  if (!res.ok) throw new ApiError(res.status, 'photo_upload_failed');
  return ticket.key;
}

// ---- sync state (saving the list) ----

let sync = { saving: false, failed: false };
const listeners = new Set<() => void>();
const setSync = (p: Partial<typeof sync>) => { sync = { ...sync, ...p }; listeners.forEach((l) => l()); };
export const usePhotoSync = () => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => sync, () => sync);

const photos = () => meStore.get().photos as MyPhoto[];
const setPhotos = (f: (p: MyPhoto[]) => MyPhoto[]) => meStore.set((s) => ({ photos: f(s.photos as MyPhoto[]) }));
const patch = (id: string, p: Partial<MyPhoto>) => setPhotos((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));
/** Saved right away once the profile exists; during onboarding, at the last step. */
const live = () => !DEMO_MODE && meStore.get().onboarded;

let chain: Promise<void> = Promise.resolve();
/**
 * Sends the ordered list of ready photos. Calls are queued so the server
 * always ends up with the latest order. Uploads still running are left out
 * and added by the next call.
 */
export function commitPhotos(): Promise<void> {
  if (DEMO_MODE) return Promise.resolve();
  const run = async () => {
    const ready = photos().filter((p) => !p.status);
    const refs: PhotoRef[] = ready.map((p) => (p.key ? { key: p.key } : { id: p.id }));
    setSync({ saving: true, failed: false });
    try {
      const view = await api<ProfilePublic>('/profiles/me/photos', { method: 'PUT', body: JSON.stringify({ photos: refs }) });
      // Same order as sent: give each local photo its server id.
      const ids = new Map(ready.map((p, i) => [p.id, view.photos[i]?.id]));
      setPhotos((list) => list.map((p) => {
        const id = ids.get(p.id);
        return id ? { ...p, id, key: undefined } : p;
      }));
      setSync({ saving: false });
    } catch (err) {
      setSync({ saving: false, failed: true });
      throw err;
    }
  };
  chain = chain.then(run, run);
  return chain;
}

const commitIfLive = () => { if (live()) commitPhotos().catch(() => undefined); };

let seq = 0;
/** Adds a picked photo at the end. In demo mode it stays on the phone. */
export async function addPhoto(uri: string) {
  if (photos().length >= PHOTO_LIMITS.maxCount) return;
  const id = `local-${Date.now()}-${seq++}`;
  if (CLOUD) {
    setPhotos((list) => [...list, { id, url: uri, localUri: uri, isDemo: false, status: 'uploading' }]);
    await sendCloud(id, uri);
    return;
  }
  setPhotos((list) => [...list, { id, url: uri, localUri: uri, isDemo: false, ...(DEMO_MODE ? {} : { status: 'uploading' as const }) }]);
  if (!DEMO_MODE) await send(id, uri);
}

export async function retryPhoto(id: string) {
  const p = photos().find((x) => x.id === id);
  if (p?.localUri) { patch(id, { status: 'uploading' }); await (CLOUD ? sendCloud(id, p.localUri) : send(id, p.localUri)); }
}

/**
 * Real storage (Supabase bucket `photos`, folder = the member's id). The
 * profile row keeps the public URL; the order is saved with the profile.
 */
async function sendCloud(id: string, uri: string) {
  try {
    const blob = await (await fetch(uri)).blob();
    if (blob.size > PHOTO_LIMITS.maxBytes) throw new ApiError(413, 'photo_too_large');
    const { data: u } = await sb.auth.getUser();
    if (!u.user) throw new ApiError(401, 'signed_out');
    const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new ApiError(500, 'photo_upload_failed');
    const url = sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
    patch(id, { id: path, url, status: undefined });
  } catch {
    patch(id, { status: 'error' });
  }
}

/** Removes the file from storage too (real accounts). */
function forgetCloudFile(id: string) {
  if (CLOUD && id.includes('/')) void sb.storage.from('photos').remove([id]);
}

async function send(id: string, uri: string) {
  try {
    const key = await upload(uri);
    patch(id, { key, status: undefined });
    commitIfLive();
  } catch {
    patch(id, { status: 'error' });
  }
}

export function removePhoto(id: string) {
  forgetCloudFile(id);
  setPhotos((list) => list.filter((p) => p.id !== id));
  commitIfLive();
}

/** Moves a photo to position `to` (0 = main photo). */
export function movePhoto(id: string, to: number) {
  setPhotos((list) => {
    const from = list.findIndex((p) => p.id === id);
    if (from < 0 || to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p!);
    return next;
  });
  commitIfLive();
}

export const uploadsPending = (list: MyPhoto[]) => list.some((p) => p.status === 'uploading');
