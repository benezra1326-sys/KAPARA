import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api, auth, DEMO_MODE, session } from '../api/client';
import { meStore } from '../me/store';
import type { SessionStatus } from '../api/session';
import { cloudAccount, useCloudAccount } from '../cloud/account';
import { CLOUD } from '../cloud/client';
import { demoAccount, useDemoAccount, type Role } from './demo-account';

export { demoAccount, useDemoAccount, type SignInProvider, type DemoAccount, type Role } from './demo-account';
export { cloudAccount, useCloudAccount } from '../cloud/account';
export { CLOUD } from '../cloud/client';
export { isAdminEmail } from './admins';

if (CLOUD) void cloudAccount.init();
else if (DEMO_MODE) void demoAccount.init();

/**
 * Signed in or not, whatever the mode: the real account (Supabase), the demo
 * account on this device, or the API session (keychain tokens).
 */
export function useAuthStatus(): SessionStatus {
  const src = CLOUD ? cloudAccount : DEMO_MODE ? demoAccount : session;
  return useSyncExternalStore(src.subscribe.bind(src), () => src.status, () => src.status);
}

/** Real account: the database decides. Demo: from the device account. */
export function useRole(): Role {
  const demo = useDemoAccount();
  const cloud = useCloudAccount();
  // ZIV API: moderators are named on the server (MODERATOR_EMAILS); the app only asks.
  const status = useSyncExternalStore(session.subscribe.bind(session), () => session.status, () => session.status);
  const mod = useQuery({
    queryKey: ['moderator'], enabled: !CLOUD && !DEMO_MODE && status === 'signedIn', staleTime: 5 * 60_000,
    queryFn: () => api<{ moderator: boolean }>('/moderation/me').catch(() => ({ moderator: false })),
  });
  if (CLOUD) return cloud?.role ?? 'member';
  if (!DEMO_MODE) return mod.data?.moderator ? 'admin' : 'member';
  return demo?.role ?? 'member';
}

/** The signed-in account, as screens show it (e-mail, provider). */
export function useAccountInfo(): { email?: string; provider?: string } | null {
  const demo = useDemoAccount();
  const cloud = useCloudAccount();
  return CLOUD ? cloud : demo;
}

export const signOut = () => (CLOUD ? cloudAccount.signOut() : DEMO_MODE ? demoAccount.signOut() : auth.signOut());
/**
 * Deletes the account everywhere it lives: Supabase (photos, profile, auth
 * user), the API (DELETE /profiles/me: data, photo files, sessions) or the
 * demo account on this device. Throws if the server refused, so the screen
 * can say so instead of pretending.
 */
export async function deleteAccount(): Promise<void> {
  if (CLOUD) { await cloudAccount.deleteAccount(); return; }
  if (DEMO_MODE) { await demoAccount.deleteAccount(); return; }
  if (session.status === 'signedIn') await api('/profiles/me', { method: 'DELETE' });
  await auth.signOut().catch(() => undefined);
  meStore.reset();
}
