import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuthStatus } from '../../src/account';
import { useTheme } from '../../src/theme';

/** Steps reachable before signing in: welcome, e-mail and code. The profile steps need an account. */
const PUBLIC = new Set(['index', 'email', 'code']);

export default function OnboardingLayout() {
  const { c } = useTheme();
  const status = useAuthStatus();
  const step = (useSegments() as string[])[1] ?? 'index';
  if (status === 'signedOut' && !PUBLIC.has(step)) return <Redirect href="/onboarding" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }} />;
}
