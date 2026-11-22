import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts } from '@kapara/design';
import { useSessionStatus } from '../../src/api/client';
import { meStore } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Text } from '../../src/ui';

const glyph = (g: string) => ({ color }: { color: ColorValue | null }) => <Text style={{ color: color ?? undefined, fontSize: 20 }} accessibilityElementsHidden>{g}</Text>;

export const unstable_settings = { initialRouteName: 'index' };

/** Three universes up front (Croisés · Pour toi · Live), then messages and me. */
export default function TabsLayout() {
  const { c } = useTheme();
  const { t } = useTranslation();
  const status = useSessionStatus();
  const qc = useQueryClient();
  // Signed out (by the member, or because the session expired): nothing of the
  // previous account stays in memory.
  useEffect(() => { if (status === 'signedOut') { qc.clear(); meStore.reset(); } }, [status, qc]);
  if (status === 'loading') return null; // the splash background stays while the keychain is read
  if (status === 'signedOut') return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textSubtle,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="croises" options={{ title: t('tabs.crossed'), tabBarIcon: glyph('◌') }} />
      <Tabs.Screen name="index" options={{ title: t('tabs.forYou'), tabBarIcon: glyph('✦') }} />
      <Tabs.Screen name="live" options={{ title: t('tabs.live'), tabBarIcon: glyph('◉') }} />
      <Tabs.Screen name="messages" options={{ title: t('tabs.messages'), tabBarIcon: glyph('❝') }} />
      <Tabs.Screen name="moi" options={{ title: t('tabs.me'), tabBarIcon: glyph('○') }} />
    </Tabs>
  );
}
