import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { APP } from '@kapara/config';
import { radius, shadow, space } from '@kapara/design';
import { auth, DEMO_MODE } from '../../src/api/client';
import { meStore } from '../../src/me/store';
import { DEMO_ME } from '../../src/demo';
import { photoSource } from '../../src/demo/images';
import { useTheme } from '../../src/theme';
import { DemoBadge, Screen, Text } from '../../src/ui';
import { Row, Section, SwitchRow } from '../../src/ui/Rows';

/** "Moi": who I am, how I appear, and every privacy control one tap away. */
export default function Me() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const go = (href: Href) => () => router.push(href);
  const me = DEMO_MODE ? DEMO_ME.profile : null;
  const photo = me?.photos[0];

  const signOut = () => {
    if (DEMO_MODE) { meStore.reset(); router.replace('/onboarding'); return; }
    Alert.alert(t('me.signOutTitle'), t('me.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      // The tabs layout clears cached data and returns to the welcome screen.
      { text: t('me.signOut'), style: 'destructive', onPress: () => void auth.signOut() },
    ]);
  };

  return (
    <Screen title={t('me.title')} subtitle={APP.name}>
      {me ? (
        <Pressable onPress={go('/profile/preview')} accessibilityRole="button" accessibilityLabel={`${me.firstName}, ${me.age}. ${t('me.editProfile')}`}
          style={({ pressed }) => [{ marginHorizontal: space.lg, marginBottom: space.xl, padding: space.lg, borderRadius: radius.xl,
            backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: space.lg, transform: [{ scale: pressed ? 0.99 : 1 }] }, shadow.card]}>
          {photo ? <Image source={photoSource(photo.url)} style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.surfaceAlt }} contentFit="cover" /> : null}
          <View style={{ flex: 1, gap: space.xs }}>
            <Text variant="heading">{me.firstName}, {me.age}</Text>
            {me.headline ? <Text variant="caption" tone="textMuted" numberOfLines={2}>{me.headline}</Text> : null}
            {me.isDemo ? <DemoBadge /> : null}
          </View>
          <Text tone="textSubtle" accessibilityElementsHidden>›</Text>
        </Pressable>
      ) : null}

      <Section title={t('profile.about')}>
        <Row first title={t('me.editProfile')} onPress={go('/profile/edit')} />
        <Row title={t('me.preferences')} onPress={go('/preferences')} />
        <Row title={t('me.introductions')} onPress={go('/introductions')} />
      </Section>

      <Section title={t('me.privacy')}>
        <Row first title={t('me.privacy')} onPress={go('/settings/privacy')} />
        <Row title={t('tabs.live')} onPress={go('/settings/live')} />
        <Row title={t('me.shabbatMode')} value={t('me.shabbatModeHint')} onPress={go('/settings/shabbat')} />
        <Row title={t('me.blocked')} onPress={go('/settings/blocked')} />
      </Section>

      <Section footnote={t('me.pauseHint')}>
        <SwitchRow first title={t('me.pause')} value={paused} onValueChange={setPaused} />
      </Section>

      <Section>
        <Row first title={t(DEMO_MODE ? 'me.restartDemo' : 'me.signOut')} onPress={signOut} trailing={null} />
      </Section>
    </Screen>
  );
}
