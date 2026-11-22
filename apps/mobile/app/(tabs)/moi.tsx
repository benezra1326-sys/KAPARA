import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, shadow, space } from '@kapara/design';
import { auth, DEMO_MODE } from '../../src/api/client';
import { cityOf, nameAndAge } from '../../src/me/identity';
import { meStore, useMe } from '../../src/me/store';
import { photoSource } from '../../src/demo/images';
import { useTheme } from '../../src/theme';
import { Button, DemoBadge, Icon, Screen, Text } from '../../src/ui';
import { Row, Section, SwitchRow } from '../../src/ui/Rows';

/**
 * "Moi": how I appear (from the single profile store, exactly what the
 * editor and the preview show), then every setting one tap away, grouped
 * as profile / privacy / Live / account.
 */
export default function Me() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const me = useMe();
  const [paused, setPaused] = useState(false);
  const go = (href: Href) => () => router.push(href);
  const photo = me.photos[0];
  const title = nameAndAge(me) || t('ux.profileIncomplete');

  const signOut = () => {
    if (DEMO_MODE) { meStore.reset(); router.replace('/onboarding'); return; }
    Alert.alert(t('me.signOutTitle'), t('me.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      // The tabs layout clears cached data and returns to the welcome screen.
      { text: t('me.signOut'), style: 'destructive', onPress: () => void auth.signOut() },
    ]);
  };

  return (
    <Screen title={t('me.title')}>
      <View style={[{ marginHorizontal: space.lg, marginBottom: space.xl, padding: space.xl, borderRadius: radius.xl, backgroundColor: c.surface, gap: space.lg }, shadow.card]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, overflow: 'hidden', backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            {photo ? <Image source={photoSource(photo.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" accessible={false} />
              : <Icon name="me" size={36} color={c.textSubtle} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="heading" style={{ fontSize: 24, lineHeight: 30 }} accessibilityRole="header" numberOfLines={2}>{title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="pin" size={15} color={c.textMuted} />
              <Text variant="caption" tone="textMuted">{cityOf(me.regionCode)}</Text>
            </View>
            {me.headline ? <Text variant="caption" tone="textMuted" numberOfLines={2}>{me.headline}</Text> : null}
          </View>
        </View>
        {photo?.isDemo ? (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <DemoBadge compact />
            <Text variant="caption" tone="textSubtle" style={{ flex: 1 }}>{t('ux.demoMyPhotos')}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button kind="secondary" icon="eye" label={t('ux.seeAsOthers')} onPress={go('/profile/preview')} style={{ flex: 1, paddingHorizontal: space.md }} />
          <Button label={t('ux.edit')} onPress={go('/profile/edit')} style={{ flex: 1, paddingHorizontal: space.md }} />
        </View>
        <Text variant="caption" tone="textSubtle">{t('ux.sameEverywhere')}</Text>
      </View>

      <Section title={t('ux.sectionProfile')}>
        <Row first title={t('me.editProfile')} onPress={go('/profile/edit')} />
        <Row title={t('me.preferences')} onPress={go('/preferences')} />
        <Row title={t('me.introductions')} onPress={go('/introductions')} />
      </Section>

      <Section title={t('me.privacy')}>
        <Row first title={t('me.privacy')} value={t('ux.privacyHint')} onPress={go('/settings/privacy')} />
        <Row title={t('me.shabbatMode')} value={t('me.shabbatModeHint')} onPress={go('/settings/shabbat')} />
        <Row title={t('me.blocked')} onPress={go('/settings/blocked')} />
      </Section>

      <Section title={t('tabs.live')}>
        <Row first title={t('ux.liveSettings')} value={t('ux.liveSettingsHint')} onPress={go('/settings/live')} />
      </Section>

      <Section title={t('ux.sectionAccount')} footnote={t('me.pauseHint')}>
        <SwitchRow first title={t('me.pause')} value={paused} onValueChange={setPaused} />
        <Row title={t(DEMO_MODE ? 'me.restartDemo' : 'me.signOut')} onPress={signOut} trailing={null} />
      </Section>
    </Screen>
  );
}
