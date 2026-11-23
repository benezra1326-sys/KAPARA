import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts, hitSlop, layout, radius, space } from '@kapara/design';
import { DEMO_MODE } from '../api/client';
import { CLOUD } from '../cloud/client';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { useLayout } from './layout';
import { Text } from './Text';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Tab route name → icon. */
export const TAB_ICONS: Record<string, IconName> = { croises: 'crossed', index: 'forYou', live: 'live', messages: 'messages', moi: 'me' };

/**
 * Main navigation. Phone: a fixed bottom bar of icons only (thumb reach,
 * safe area; each icon keeps its spoken name). Tablet: the same bar, labels beside icons, centred. Desktop: a sidebar
 * with the wordmark, so pages keep a readable width instead of stretching.
 */
export function AppNav({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { bp } = useLayout();
  const sidebar = bp === 'desktop';
  const phone = bp === 'phone';

  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key]!;
    const label = typeof options.title === 'string' ? options.title : route.name;
    const focused = state.index === index;
    const onPress = () => {
      const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigateToTab(route.key);
    };
    const color = focused ? c.text : c.textSubtle;
    const icon = <Icon name={TAB_ICONS[route.name] ?? 'sparkle'} size={sidebar ? 22 : 23} color={color} filled={focused} />;
    return (
      <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (sidebar ? {
          minHeight: hitSlop, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderRadius: radius.md,
          backgroundColor: focused ? c.surfaceAlt : hovered || pressed ? c.surfaceAlt : 'transparent',
        } : {
          flex: 1, minHeight: phone ? 54 : 56, alignItems: 'center', justifyContent: 'center', gap: bp === 'tablet' ? space.sm : 5, paddingTop: phone ? 5 : 0,
          flexDirection: bp === 'tablet' ? 'row' : 'column', opacity: pressed ? 0.7 : 1,
        })}>
        {icon}
        {phone ? (
          // Phone, after Raya: icons only; the open tab is marked by a brass dot.
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: focused ? c.highlight : 'transparent' }} />
        ) : (
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3}
            style={{ color, fontFamily: focused ? fonts.bodySemibold : fonts.bodyMedium, fontSize: sidebar ? 15 : 14, lineHeight: 20 }}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  });

  if (sidebar) {
    return (
      <View accessibilityRole="tablist" style={{ width: layout.sidebar, paddingTop: insets.top + space.xxl, paddingBottom: space.xl, paddingHorizontal: space.lg,
        backgroundColor: c.bg, borderRightWidth: 1, borderRightColor: c.border, gap: space.xs }}>
        <View style={{ paddingHorizontal: space.lg, marginBottom: space.xl }}><Logo size={36} header /></View>
        {items}
        <View style={{ flex: 1 }} />
        {DEMO_MODE ? <Text variant="caption" tone="textSubtle" style={{ paddingHorizontal: space.lg }}>{t(CLOUD ? 'cloud.navFooter' : 'nav.demoFooter')}</Text> : null}
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, paddingBottom: insets.bottom }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', width: '100%', maxWidth: bp === 'tablet' ? 720 : undefined, alignSelf: 'center' }}>{items}</View>
    </View>
  );
}
