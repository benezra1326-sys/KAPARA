import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, shadow, space } from '@kapara/design';
import { demoAccount, signOut as doSignOut, useDemoAccount, useRole } from '../../src/account';
import { confirm } from '../../src/account/confirm';
import { DEMO_MODE } from '../../src/api/client';
import { cityOf, nameAndAge } from '../../src/me/identity';
import { useMe } from '../../src/me/store';
import { photoSource } from '../../src/demo/images';
import { appearance, useAppearance, useTheme } from '../../src/theme';
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

  const account = useDemoAccount();
  const isAdmin = useRole() === 'admin';
  // The tabs layout clears cached data and returns to the welcome screen.
  const signOut = () => confirm(t('me.signOutTitle'), t(DEMO_MODE ? 'signin.signOutDemoBody' : 'me.signOutBody'), t('me.signOut'), t('common.cancel'), () => void doSignOut());
  const forget = () => confirm(t('signin.forgetTitle'), t('signin.forgetBody'), t('signin.forget'), t('common.cancel'), () => void demoAccount.deleteAccount());
  const via = account ? t('signin.connectedVia', { provider: t(`signin.provider.${account.provider}`) }) + (account.email ? ` · ${account.email}` : '') : undefined;

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

      {isAdmin ? (
        <Section title={t('admin.section')}>
          <Row first title={t('admin.open')} value={t('admin.openHint')} onPress={go('/admin')} />
        </Section>
      ) : null}

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

      <Appearance />

      <Section title={t('tabs.live')}>
        <Row first title={t('ux.liveSettings')} value={t('ux.liveSettingsHint')} onPress={go('/settings/live')} />
      </Section>

      <Section title={t('ux.sectionAccount')} footnote={t('me.pauseHint')}>
        <SwitchRow first title={t('me.pause')} value={paused} onValueChange={setPaused} />
        {via ? <Row title={t('signin.account')} value={via} /> : null}
        <Row title={t('me.signOut')} onPress={signOut} trailing={null} />
        {DEMO_MODE && account ? <Row title={t('signin.forget')} onPress={forget} trailing={null} /> : null}
      </Section>
    </Screen>
  );
}

/** White by default; dark on request. Kept on this device. */
function Appearance() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const scheme = useAppearance();
  const opt = (value: 'light' | 'dark', first?: boolean) => (
    <Row first={first} title={t(value === 'light' ? 'ux.themeLight' : 'ux.themeDark')} onPress={() => appearance.set(value)}
      trailing={scheme === value ? <Icon name="check" size={20} color={c.accent} /> : <View style={{ width: 20 }} />} />
  );
  return <Section title={t('ux.appearance')}>{opt('light', true)}{opt('dark')}</Section>;
}
