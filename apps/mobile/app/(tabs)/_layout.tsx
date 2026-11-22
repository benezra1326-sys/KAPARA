import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionStatus } from '../../src/api/client';
import { meStore } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { AppNav, useLayout } from '../../src/ui';

export const unstable_settings = { initialRouteName: 'index' };

/** Three universes up front (Croisés · Pour toi · Live), then messages and me. */
export default function TabsLayout() {
  const { c } = useTheme();
  const { t } = useTranslation();
  const { isDesktop } = useLayout();
  const status = useSessionStatus();
  const qc = useQueryClient();
  // Signed out (by the member, or because the session expired): nothing of the
  // previous account stays in memory.
  useEffect(() => { if (status === 'signedOut') { qc.clear(); meStore.reset(); } }, [status, qc]);
  if (status === 'loading') return null; // the splash background stays while the keychain is read
  if (status === 'signedOut') return <Redirect href="/onboarding" />;
  return (
    <Tabs
      tabBar={(props) => <AppNav {...props} />}
      screenOptions={{
        headerShown: false,
        // Desktop: the navigation becomes a sidebar (see AppNav).
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="croises" options={{ title: t('tabs.crossed') }} />
      <Tabs.Screen name="index" options={{ title: t('tabs.forYou') }} />
      <Tabs.Screen name="live" options={{ title: t('tabs.live') }} />
      <Tabs.Screen name="messages" options={{ title: t('tabs.messages') }} />
      <Tabs.Screen name="moi" options={{ title: t('tabs.me') }} />
    </Tabs>
  );
}
