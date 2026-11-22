import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useTheme } from '../theme';

/** Thin segmented progress, e.g. "3 of 8" in today's selection or onboarding. */
export function Progress({ total, current }: { total: number; current: number }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t('ui.progress', { current: Math.min(current + 1, total), total })}
      accessibilityValue={{ min: 0, max: total, now: Math.min(current + 1, total) }}
      style={{ flexDirection: 'row', gap: space.xs, paddingHorizontal: space.xl }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < current ? c.text : i === current ? c.accent : c.border }} />
      ))}
    </View>
  );
}
