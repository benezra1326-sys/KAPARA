import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REGIONS } from '@kapara/config';
import { hitSlop, radius, space } from '@kapara/design';
import { browseStore, useBrowseRegion } from '../me/browse';
import { cityOf } from '../me/identity';
import { meStore } from '../me/store';
import { canBrowseOtherCity } from '../premium/plans';
import { openPaywall, usePlan } from '../premium/store';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

/** Country name in the app's language, when the platform knows it. */
function countryName(code: string, lang: string) {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

/**
 * Choosing a city. Two different questions, never mixed:
 * - mode "home": where do I live? Part of the profile, free, any time.
 * - mode "browse": which city does "Pour toi" show? One's own city is free;
 *   another city is Plus and Cercle (Avishay, 23/11): a locked city opens
 *   the offer page instead of being chosen.
 * No city is hard-coded: the list comes from REGIONS.
 */
export function CitySheet({ visible, onClose, mode = 'browse' }: { visible: boolean; onClose: () => void; mode?: 'home' | 'browse' }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const { code: current, home } = useBrowseRegion();
  const plan = usePlan();
  const allowed = mode === 'home' || (plan.data ? canBrowseOtherCity(plan.data.plan, plan.data.isAdmin) : false);
  const selected = mode === 'home' ? home : current;
  const cities = [...REGIONS].filter((r) => mode === 'home' || r.code !== home).sort((a, b) => a.city.localeCompare(b.city, i18n.language));
  const pick = (code: string) => {
    if (mode === 'home') { if (code !== home) { meStore.set({ regionCode: code }); browseStore.set(null); } onClose(); return; }
    if (code !== home && !allowed) { onClose(); openPaywall('otherCity'); return; }
    browseStore.set(code === home ? null : code);
    onClose();
  };
  const row = (code: string, city: string, country: string, i: number, hint?: string, locked?: boolean) => {
    const on = code === selected;
    return (
      <Pressable key={code} onPress={() => pick(code)} accessibilityRole="radio" accessibilityState={{ checked: on }}
        accessibilityLabel={`${city}, ${country}${locked ? `, ${t('browse.lockedHint')}` : ''}`}
        style={({ pressed }) => ({ minHeight: hitSlop + 4, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xs,
          borderTopWidth: i ? 1 : 0, borderTopColor: c.border, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ flex: 1 }}>
          <Text variant={on ? 'bodyStrong' : 'body'} style={on ? { color: c.accent } : undefined}>{city}</Text>
          <Text variant="caption" tone="textSubtle">{hint ?? country}</Text>
        </View>
        {on ? <Icon name="check" size={20} color={c.accent} /> : locked ? (
          <View style={{ paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.accentSoft }}>
            <Text variant="caption" tone="accent">{t('browse.locked')}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };
  const homeRegion = REGIONS.find((r) => r.code === home);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: space.xs }}>
        <Text variant="heading" accessibilityRole="header">{t(mode === 'home' ? 'browse.homeTitle' : 'browse.title')}</Text>
        <Text variant="caption" tone="textMuted">{t(mode === 'home' ? 'browse.homeBody' : 'browse.body')}</Text>
      </View>
      <ScrollView style={{ maxHeight: 440 }} accessibilityRole="radiogroup">
        {mode === 'browse' && homeRegion ? (
          <View style={{ marginBottom: space.md }}>
            <Text variant="overline" tone="textSubtle">{t('browse.mine')}</Text>
            {row(homeRegion.code, homeRegion.city, countryName(homeRegion.country, i18n.language), 0, t('browse.mineHint'))}
            <Text variant="overline" tone="textSubtle" style={{ marginTop: space.lg }}>{t('browse.others')}</Text>
          </View>
        ) : null}
        {cities.map((r, i) => row(r.code, r.city, countryName(r.country, i18n.language), i, undefined, mode === 'browse' && !allowed))}
      </ScrollView>
    </Sheet>
  );
}

/** "PARIS ⌄": which city "Pour toi" shows; opens the browse sheet. */
export function CityButton() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { code, elsewhere } = useBrowseRegion();
  const city = cityOf(code);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('city.change', { city })} hitSlop={6}
        style={({ pressed }) => ({ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md,
          borderRadius: radius.pill, borderWidth: 1, borderColor: elsewhere ? c.accent : c.border, backgroundColor: elsewhere ? c.accentSoft : 'transparent', opacity: pressed ? 0.6 : 1 })}>
        <Icon name="pin" size={14} color={elsewhere ? c.accent : c.text} />
        <Text variant="overline" style={{ color: elsewhere ? c.accent : c.text }}>{city}</Text>
        <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="chevron" size={12} color={c.textMuted} /></View>
      </Pressable>
      <CitySheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
