import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { hitSlop, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

type Props = {
  title?: string; subtitle?: string; children: ReactNode; scroll?: boolean;
  /** Shows a back (or close) control above the title. */
  back?: 'back' | 'close'; right?: ReactNode;
  /** Pinned under the content (primary action), respects the home indicator. */
  footer?: ReactNode;
} & ScrollViewProps;

export function Screen({ title, subtitle, children, scroll = true, back, right, footer, ...rest }: Props) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const top = (
    <View style={{ paddingTop: insets.top + (back ? space.xs : space.lg) }}>
      {back || right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm }}>
          {back ? (
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} accessibilityRole="button"
              accessibilityLabel={t(back === 'close' ? 'ui.close' : 'ui.back')}
              style={{ minWidth: hitSlop, minHeight: hitSlop, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="heading" style={{ fontSize: 24 }}>{back === 'close' ? '×' : '‹'}</Text>
            </Pressable>
          ) : <View />}
          {right}
        </View>
      ) : null}
      {title ? (
        <View style={{ paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.xs }}>
          {subtitle ? <Text variant="overline" tone="textSubtle">{subtitle}</Text> : null}
          <Text variant="title" accessibilityRole="header">{title}</Text>
        </View>
      ) : null}
    </View>
  );
  const foot = footer ? (
    <View style={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, gap: space.sm }}>
      {footer}
    </View>
  ) : null;
  if (!scroll) return <View style={{ flex: 1, backgroundColor: c.bg }}>{top}<View style={{ flex: 1 }}>{children}</View>{foot}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: (footer ? space.xl : insets.bottom + space.xxxl) }} {...rest}>
        {top}
        {children}
      </ScrollView>
      {foot}
    </View>
  );
}
