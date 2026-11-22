import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Small persistent key/value store for the demo account and its profile:
 * the browser's localStorage on the web demo, the keychain on iOS.
 * Every failure is swallowed: worst case, the demo starts fresh.
 */
const web = () => (typeof localStorage === 'undefined' ? null : localStorage);

export const kv = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return web()?.getItem(key) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  },
  async set(key: string, value: string | null): Promise<void> {
    try {
      if (Platform.OS === 'web') { if (value === null) web()?.removeItem(key); else web()?.setItem(key, value); return; }
      if (value === null) await SecureStore.deleteItemAsync(key); else await SecureStore.setItemAsync(key, value);
    } catch { /* storage unavailable: the demo simply won't remember */ }
  },
};
