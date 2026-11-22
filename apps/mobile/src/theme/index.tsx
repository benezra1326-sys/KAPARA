import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { colors, DEFAULT_SCHEME, type ColorScheme, type ThemeColors } from '@kapara/design';

/**
 * Appearance: white by default, dark on request (Moi > Apparence).
 * The choice is kept on this device (localStorage on the web; in memory on
 * native until a settings store exists).
 */
const KEY = 'motek.appearance';
const read = (): ColorScheme => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark') return v;
    }
  } catch { /* storage unavailable: default */ }
  return DEFAULT_SCHEME;
};
let scheme: ColorScheme = read();
const listeners = new Set<() => void>();
export const appearance = {
  get: () => scheme,
  set(next: ColorScheme) {
    scheme = next;
    try { if (Platform.OS === 'web') localStorage.setItem(KEY, next); } catch { /* ignore */ }
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.body.style.backgroundColor = colors[next].bg;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};
export const useAppearance = () => useSyncExternalStore(appearance.subscribe, appearance.get, appearance.get);

const ThemeCtx = createContext<{ c: ThemeColors; dark: boolean }>({ c: colors[DEFAULT_SCHEME], dark: DEFAULT_SCHEME === 'dark' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const s = useAppearance();
  return <ThemeCtx.Provider value={{ c: colors[s], dark: s === 'dark' }}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);
