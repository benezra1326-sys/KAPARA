import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

/** Thin segmented progress, e.g. "3 of 8" in today's selection or onboarding. */
export function Progress({ total, current }: { total: number; current: number }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t('ui.progress', { current: Math.min(current + 1, total), total })}
      accessibilityValue={{ min: 0, max: total, now: Math.min(current + 1, total) }}
      style={{ flexDirection: 'row', gap: space.xs, paddingHorizontal: space.xl }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < current ? c.textSubtle : i === current ? c.accent : c.border }} />
      ))}
    </View>
  );
}

/**
 * Onboarding: once the basics are in, every other step can wait. This quiet
 * link goes straight to the end; the profile can be completed later from Moi.
 */
export function SkipToEnd() {
  const { t } = useTranslation();
  return (
    <Pressable onPress={() => router.push('/onboarding/done')} accessibilityRole="button" accessibilityLabel={t('onb.skipAllHint')}
      style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, opacity: pressed ? 0.6 : 1 })}>
      <Text variant="label" tone="textMuted">{t('onb.skipAll')}</Text>
    </Pressable>
  );
}
