import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CLOUD } from './client';
import { cloudAccount } from './account';

/**
 * Web: Google's own "Continuer avec Google" button (Google Identity Services).
 * Google opens its small account chooser in a popup that names the app, then
 * hands back an ID token that Supabase checks (signInWithIdToken): no full-page
 * trip through the Supabase domain. Needs EXPO_PUBLIC_GOOGLE_CLIENT_ID (the web
 * OAuth client, with this site in its authorized JavaScript origins). Without
 * it, or if Google's script does not load, the usual redirect button is shown.
 */
const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
export const GOOGLE_WEB = Platform.OS === 'web' && CLOUD && !!CLIENT_ID;

type Gis = {
  accounts: { id: {
    initialize: (o: Record<string, unknown>) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  } };
};

let loading: Promise<Gis | null> | null = null;
function loadGis(): Promise<Gis | null> {
  const w = window as unknown as { google?: Gis };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  loading ??= new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    const timer = setTimeout(() => resolve(null), 6000);
    s.onload = () => { clearTimeout(timer); resolve(w.google?.accounts?.id ? w.google : null); };
    s.onerror = () => { clearTimeout(timer); loading = null; resolve(null); };
    document.head.appendChild(s);
  });
  return loading;
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function GoogleWebButton({ fallback, onSignedIn, onError }: {
  fallback: ReactNode; onSignedIn: (hasProfile: boolean) => void; onError: () => void;
}) {
  const { i18n } = useTranslation();
  const host = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const cb = useRef({ onSignedIn, onError });
  cb.current = { onSignedIn, onError };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const gis = await loadGis();
      const el = host.current;
      if (!alive) return;
      if (!gis || !el) { setState('failed'); return; }
      const raw = crypto.randomUUID();
      const hashed = await sha256Hex(raw);
      gis.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: hashed,
        ux_mode: 'popup',
        itp_support: true,
        use_fedcm_for_button: true,
        callback: async ({ credential }: { credential?: string }) => {
          const r = credential ? await cloudAccount.signInWithGoogleToken(credential, raw) : null;
          if (r) cb.current.onSignedIn(r.hasProfile); else cb.current.onError();
        },
      });
      const width = Math.min(400, Math.max(220, Math.round(el.getBoundingClientRect().width)));
      gis.accounts.id.renderButton(el, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with',
        logo_alignment: 'center', width, locale: i18n.language,
      });
      setState('ready');
    })();
    return () => { alive = false; };
  }, [i18n.language]);

  return (
    <View>
      {state === 'failed' ? fallback : null}
      <View ref={host as never} style={{ minHeight: state === 'failed' ? 0 : 44, alignItems: 'center', display: state === 'failed' ? 'none' : 'flex' }} />
    </View>
  );
}
