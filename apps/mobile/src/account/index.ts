import { useSyncExternalStore } from 'react';
import { auth, DEMO_MODE, session } from '../api/client';
import type { SessionStatus } from '../api/session';
import { demoAccount, useDemoAccount, type Role } from './demo-account';

export { demoAccount, useDemoAccount, type SignInProvider, type DemoAccount, type Role } from './demo-account';
export { isAdminEmail } from './admins';

if (DEMO_MODE) void demoAccount.init();

/**
 * Signed in or not, whatever the mode: the demo account on this device, or
 * the API session (keychain tokens) in connected mode.
 */
export function useAuthStatus(): SessionStatus {
  const src = DEMO_MODE ? demoAccount : session;
  return useSyncExternalStore(src.subscribe.bind(src), () => src.status, () => src.status);
}

/** Demo: from the account. Connected: the API will say (see docs, roles not yet exposed). */
export function useRole(): Role {
  const account = useDemoAccount();
  return DEMO_MODE ? account?.role ?? 'member' : 'member';
}

export const signOut = () => (DEMO_MODE ? demoAccount.signOut() : auth.signOut());
