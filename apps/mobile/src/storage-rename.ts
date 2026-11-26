/**
 * The app was renamed (MOTEK → ZIV) on 26/11/2026. On the web demo, settings
 * and demo accounts were saved under `motek.*` keys: move them once to `ziv.*`
 * so nobody loses their account, theme or language. Imported first in
 * app/_layout.tsx, before any module reads storage. Native builds were never
 * released under the old name, so only the web needs this.
 */
const OLD = 'motek.';
const NEW = 'ziv.';

try {
  if (typeof localStorage !== 'undefined') {
    const old: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(OLD)) old.push(k);
    }
    for (const k of old) {
      const next = NEW + k.slice(OLD.length);
      const v = localStorage.getItem(k);
      if (v !== null && localStorage.getItem(next) === null) localStorage.setItem(next, v);
      localStorage.removeItem(k);
    }
  }
} catch { /* storage unavailable: nothing to move */ }

export {};
