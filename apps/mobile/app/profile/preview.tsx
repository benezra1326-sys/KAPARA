import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LAUNCH_REGION, REGIONS } from '@kapara/config';
import { visibleSensitive, type JewishLife, type ProfilePublic, type ViewerRelation } from '@kapara/shared';
import { hitSlop, radius, space } from '@kapara/design';
import { ageFrom, useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Screen, Text } from '../../src/ui';
import { ProfileCard } from '../../src/ui/ProfileCard';

/** "See my profile as…": the same visibility rule the API applies, shown before anyone else sees it. */
export default function Preview() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const me = useMe();
  const [as, setAs] = useState<Exclude<ViewerRelation, 'self'>>('member');
  const consented = new Set(Object.keys(me.consents));
  const profile: ProfilePublic = {
    id: 'me', firstName: me.firstName || '—', age: ageFrom(me.birthDate) ?? 0,
    city: (REGIONS.find((r) => r.code === me.regionCode) ?? LAUNCH_REGION).city, regionCode: me.regionCode,
    headline: me.headline || undefined, languages: me.languages, photos: me.photos, prompts: me.prompts,
    jewishLife: visibleSensitive(me.jewishLife as Record<string, JewishLife[keyof JewishLife]>, as, consented) as Partial<JewishLife>,
    verified: false, isDemo: false,
  };
  return (
    <Screen back="close" title={t('preview.title')}>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', marginHorizontal: space.xl, marginBottom: space.md, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.xs, gap: space.xs }}>
        {(['member', 'match'] as const).map((r) => (
          <Pressable key={r} onPress={() => setAs(r)} accessibilityRole="radio" accessibilityState={{ checked: as === r }}
            style={{ flex: 1, minHeight: hitSlop, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: as === r ? c.surface : 'transparent' }}>
            <Text variant="label" tone={as === r ? 'text' : 'textMuted'}>{t(`preview.as.${r}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text variant="caption" tone="textSubtle" style={{ marginHorizontal: space.xl, marginBottom: space.lg }}>{t(`preview.hint.${as}`)}</Text>
      <ProfileCard profile={profile} />
    </Screen>
  );
}
