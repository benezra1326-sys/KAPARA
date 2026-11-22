import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { DEMO_MODE } from '../api/client';
import { useAuthStatus } from '../account';
import { DemoTransport } from './demo-transport';
import { SocketTransport } from './socket-transport';
import { LiveStore, type LiveState } from './store';

const Ctx = createContext<LiveStore | null>(null);

/**
 * One Live connection for the whole app, so an invitation reaches the member
 * on any screen. Opens the call screen when someone invites you.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const store = useMemo(() => new LiveStore(DEMO_MODE ? new DemoTransport() : new SocketTransport()), []);
  // Connected mode: the socket opens only for a signed-in member and closes at sign-out.
  const signedIn = useAuthStatus() === 'signedIn';

  useEffect(() => {
    if (!signedIn) return;
    store.setIncomingHandler((call) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/call/[id]', params: { id: call.callId } });
    });
    void store.start();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void store.refresh(); });
    return () => { sub.remove(); store.stop(); };
  }, [store, router, signedIn]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useLiveStore(): LiveStore {
  const s = useContext(Ctx);
  if (!s) throw new Error('LiveProvider missing');
  return s;
}

/** Whole Live state; re-renders when it changes (snapshots are immutable). */
export function useLive(): LiveState {
  const store = useLiveStore();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
