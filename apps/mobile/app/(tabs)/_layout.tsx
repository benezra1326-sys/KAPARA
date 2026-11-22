import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts } from '@kapara/design';
import { useTheme } from '../../src/theme';
import { Text } from '../../src/ui';

const glyph = (g: string) => ({ color }: { color: ColorValue | null }) => <Text style={{ color: color ?? undefined, fontSize: 20 }} accessibilityElementsHidden>{g}</Text>;

export const unstable_settings = { initialRouteName: 'index' };

/** Three universes up front (Croisés · Pour toi · Live), then messages and me. */
export default function TabsLayout() {
  const { c } = useTheme();
  const { t } = useTranslation();
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
