import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REGIONS } from '@kapara/config';
import { hitSlop, radius, space } from '@kapara/design';
import { cityOf } from '../me/identity';
import { meStore, useMe } from '../me/store';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

/** Country name in the app's language, when the platform knows it. */
function countryName(code: string, lang: string) {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

/**
 * "Where are you?" The member's city decides who "Pour toi" shows, and
 * where they are shown. Changing it is free and immediate (after Raya's
 * travel mode): on a trip, pick the city you are in. Saved with the profile.
 */
export function CitySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const current = useMe((s) => s.regionCode);
  const cities = [...REGIONS].sort((a, b) => a.city.localeCompare(b.city, i18n.language));
  const pick = (code: string) => { if (code !== current) meStore.set({ regionCode: code }); onClose(); };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: space.xs }}>
        <Text variant="overline" tone="highlight">{t('city.free')}</Text>
        <Text variant="heading" accessibilityRole="header">{t('city.title')}</Text>
        <Text variant="caption" tone="textMuted">{t('city.body')}</Text>
      </View>
      <ScrollView style={{ maxHeight: 420 }} accessibilityRole="radiogroup">
        {cities.map((r, i) => {
          const on = r.code === current;
          return (
            <Pressable key={r.code} onPress={() => pick(r.code)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              accessibilityLabel={`${r.city}, ${countryName(r.country, i18n.language)}`}
              style={({ pressed }) => ({ minHeight: hitSlop + 4, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xs,
                borderTopWidth: i ? 1 : 0, borderTopColor: c.border, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ flex: 1 }}>
                <Text variant={on ? 'bodyStrong' : 'body'}>{r.city}</Text>
                <Text variant="caption" tone="textSubtle">{countryName(r.country, i18n.language)}</Text>
              </View>
              {on ? <Icon name="check" size={20} color={c.text} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

/** Small tracked "PARIS ⌄" control that opens the city sheet. */
export function CityButton() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const city = cityOf(useMe((s) => s.regionCode));
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('city.change', { city })} hitSlop={6}
        style={({ pressed }) => ({ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md,
          borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.6 : 1 })}>
        <Icon name="pin" size={14} color={c.text} />
        <Text variant="overline" style={{ color: c.text, letterSpacing: 1.6 }}>{city}</Text>
        <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="chevron" size={12} color={c.textMuted} /></View>
      </Pressable>
      <CitySheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
