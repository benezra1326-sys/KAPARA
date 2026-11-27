import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuthStatus } from '../../src/account';
import { useTheme } from '../../src/theme';
import { useLayout } from '../../src/ui/layout';

/** Steps reachable before signing in: welcome, e-mail, code and phone. The profile steps need an account. */
const PUBLIC = new Set(['index', 'email', 'code', 'phone', 'underage']);

export default function OnboardingLayout() {
  const { c } = useTheme();
  const { isPhone } = useLayout();
  const status = useAuthStatus();
  const step = (useSegments() as string[])[1] ?? 'index';
  if (status === 'signedOut' && !PUBLIC.has(step)) return <Redirect href="/onboarding" />;
  // Profile steps: a readable column on wide screens; the welcome page lays itself out.
  const column = isPhone ? { backgroundColor: c.bg } : { backgroundColor: c.bg, width: '100%' as const, maxWidth: 760, alignSelf: 'center' as const };
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: column, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: c.bg } }} />
    </Stack>
  );
}
