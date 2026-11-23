import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { hitSlop, layout, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { useLayout, type PageWidth } from './layout';
import { Text } from './Text';

type Props = {
  title?: string; subtitle?: string; children: ReactNode; scroll?: boolean;
  /** Shows a back (or close) control above the title. */
  back?: 'back' | 'close'; right?: ReactNode;
  /** Pinned under the content (primary action), respects the home indicator. */
  footer?: ReactNode;
  /** Max content width: 'readable' (680) for lists and forms, 'wide' (1080) for profiles and grids. */
  width?: PageWidth;
} & ScrollViewProps;

/**
 * Every page: safe areas, title, and a centred content column whose max
 * width depends on the page. On a phone the column is the screen; on a
 * tablet or desktop it never stretches across the whole window.
 */
export function Screen({ title, subtitle, children, scroll = true, back, right, footer, width = 'readable', ...rest }: Props) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isPhone, isDesktop } = useLayout();
  const column = { width: '100%' as const, maxWidth: layout[width], alignSelf: 'center' as const };
  const top = (
    <View style={{ paddingTop: insets.top + (back ? space.xs : isDesktop ? space.xxl : space.lg) }}>
      {back ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm }}>
          {back ? (
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} accessibilityRole="button"
              accessibilityLabel={t(back === 'close' ? 'ui.close' : 'ui.back')}
              style={{ minWidth: hitSlop, minHeight: hitSlop, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={back === 'close' ? 'close' : 'back'} size={24} color={c.text} />
            </Pressable>
          ) : <View />}
          {right}
        </View>
      ) : null}
      {title ? (
        // Without a back control, `right` sits beside the title (e.g. the city on Pour toi).
        <View style={{ paddingHorizontal: space.xl, paddingBottom: space.lg, flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
          <View style={{ flex: 1, gap: space.xs }}>
            {subtitle ? <Text variant="overline" tone="textSubtle">{subtitle}</Text> : null}
            <Text variant="title" accessibilityRole="header" style={isPhone ? undefined : { fontSize: 32, lineHeight: 38 }}>{title}</Text>
          </View>
          {!back && right ? <View style={{ paddingBottom: 2 }}>{right}</View> : null}
        </View>
      ) : !back && right ? <View style={{ alignItems: 'flex-end', paddingHorizontal: space.xl }}>{right}</View> : null}
    </View>
  );
  const foot = footer ? (
    <View style={{ paddingTop: space.md, paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border }}>
      <View style={[column, { paddingHorizontal: space.xl, gap: space.sm }]}>{footer}</View>
    </View>
  ) : null;
  if (!scroll) return <View style={{ flex: 1, backgroundColor: c.bg }}><View style={[column, { flex: 1 }]}>{top}<View style={{ flex: 1 }}>{children}</View></View>{foot}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: (footer ? space.xl : insets.bottom + space.xxxl) }} {...rest}>
        <View style={column}>
          {top}
          {children}
        </View>
      </ScrollView>
      {foot}
    </View>
  );
}
