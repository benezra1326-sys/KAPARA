import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

export function Screen({ title, subtitle, children, scroll = true, ...rest }: { title?: string; subtitle?: string; children: ReactNode; scroll?: boolean } & ScrollViewProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const header = title ? (
    <View style={{ paddingHorizontal: space.xl, paddingTop: insets.top + space.lg, paddingBottom: space.lg, gap: space.xs }}>
      {subtitle ? <Text variant="overline" tone="textSubtle">{subtitle}</Text> : null}
      <Text variant="title" accessibilityRole="header">{title}</Text>
    </View>
  ) : null;
  if (!scroll) return <View style={{ flex: 1, backgroundColor: c.bg }}>{header}{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }} {...rest}>
      {header}
      {children}
    </ScrollView>
  );
}
