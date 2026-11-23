import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REGIONS } from '@kapara/config';
import { space } from '@kapara/design';
import { meStore, useMe } from '../src/me/store';
import { useTheme } from '../src/theme';
import { Icon, Screen, Text } from '../src/ui';
import { Row, Section } from '../src/ui/Rows';

/**
 * Where am I? Free for everyone, as often as needed: "Pour toi" then starts
 * with people in that city. Saved with the profile (real accounts).
 */
export default function City() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const qc = useQueryClient();
  const current = useMe((s) => s.regionCode);
  const name = (code: string, city: string) => t(`regions.${code}`, { defaultValue: city });
  const pick = (code: string) => {
    meStore.set({ regionCode: code });
    // The profile is saved shortly after; then the selection is rebuilt for the new city.
    setTimeout(() => void qc.invalidateQueries({ queryKey: ['for-you'] }), 1200);
    router.back();
  };
  const sorted = [...REGIONS].sort((a, b) => name(a.code, a.city).localeCompare(name(b.code, b.city)));
  return (
    <Screen back="close" title={t('premium.cityTitle')}>
      <View style={{ paddingHorizontal: space.xl, marginBottom: space.xl }}>
        <Text tone="textMuted">{t('premium.cityBody')}</Text>
      </View>
      <Section>
        {sorted.map((r, i) => (
          <Row key={r.code} first={i === 0} title={name(r.code, r.city)} onPress={() => pick(r.code)}
            trailing={r.code === current ? <Icon name="check" size={20} color={c.accent} /> : <View style={{ width: 20 }} />} />
        ))}
      </Section>
    </Screen>
  );
}
