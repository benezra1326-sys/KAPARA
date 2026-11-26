import { useSyncExternalStore } from 'react';
import { kv } from '../account/kv';
import { meStore, useMe } from './store';

/**
 * Which city "Pour toi" looks at. By default the member's own city (their
 * profile's, free). Another city (a trip, a move to come) is a Plus/Cercle
 * feature; the picker checks the plan before setting it. Kept on this device.
 */
const KEY = 'ziv.browseRegion';
let browse: string | null = null;
const listeners = new Set<() => void>();
void kv.get(KEY).then((v) => { if (v) { browse = v; listeners.forEach((l) => l()); } });

export const browseStore = {
  get: () => browse,
  /** null = back to one's own city. */
  set(code: string | null) {
    browse = code && code !== meStore.get().regionCode ? code : null;
    void kv.set(KEY, browse);
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** The city "Pour toi" shows now: the chosen one, or the member's own. */
export function useBrowseRegion() {
  const home = useMe((s) => s.regionCode);
  const chosen = useSyncExternalStore(browseStore.subscribe, browseStore.get, browseStore.get);
  return { code: chosen ?? home, home, elsewhere: !!chosen && chosen !== home };
}
