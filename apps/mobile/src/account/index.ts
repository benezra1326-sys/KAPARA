import { useSyncExternalStore } from 'react';
import { auth, DEMO_MODE, session } from '../api/client';
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
  if (CLOUD) return cloud?.role ?? 'member';
  return DEMO_MODE ? demo?.role ?? 'member' : 'member';
}

/** The signed-in account, as screens show it (e-mail, provider). */
export function useAccountInfo(): { email?: string; provider?: string } | null {
  const demo = useDemoAccount();
  const cloud = useCloudAccount();
  return CLOUD ? cloud : demo;
}

export const signOut = () => (CLOUD ? cloudAccount.signOut() : DEMO_MODE ? demoAccount.signOut() : auth.signOut());
export const deleteAccount = () => (CLOUD ? cloudAccount.deleteAccount() : demoAccount.deleteAccount());
