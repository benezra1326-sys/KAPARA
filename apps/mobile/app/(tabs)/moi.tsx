import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, shadow, space } from '@kapara/design';
import { CLOUD, deleteAccount, signOut as doSignOut, useAccountInfo, useRole } from '../../src/account';
import { confirm, notify } from '../../src/account/confirm';
import { loadPaused, savePaused } from '../../src/cloud/account';
import { api, DEMO_MODE } from '../../src/api/client';
import { SUPPORT, supportConfigured } from '@kapara/config';
import { Linking } from 'react-native';
import { cityOf, nameAndAge } from '../../src/me/identity';
import { useMe } from '../../src/me/store';
import { openPaywall, usePlan } from '../../src/premium/store';
import { photoSource } from '../../src/demo/images';
import { appearance, useAppearance, useTheme } from '../../src/theme';
import { Button, CitySheet, DemoBadge, EnvBadge, Icon, Screen, Text } from '../../src/ui';
import { useBrowseRegion } from '../../src/me/browse';
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
  const [paused, setPausedState] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const browse = useBrowseRegion();
  // With real accounts the pause is saved: a paused profile disappears from everyone's selection.
  // With the API too (PUT /profiles/me/settings). A failed save puts the switch back and says so.
  useEffect(() => {
    if (CLOUD) void loadPaused().then(setPausedState);
    else if (!DEMO_MODE) void api<{ paused?: boolean }>('/profiles/me').then((r) => setPausedState(!!r.paused)).catch(() => undefined);
  }, []);
  const setPaused = (v: boolean) => {
    setPausedState(v);
    const undo = () => { setPausedState(!v); notify(t('beta.save.failedTitle'), t('beta.save.failedBody')); };
    if (CLOUD) void savePaused(v).catch(undo);
    else if (!DEMO_MODE) void api('/profiles/me/settings', { method: 'PUT', body: JSON.stringify({ paused: v }) }).catch(undo);
  };
  const go = (href: Href) => () => router.push(href);
  const photo = me.photos[0];
  const title = nameAndAge(me) || t('ux.profileIncomplete');

  const account = useAccountInfo();
  const isAdmin = useRole() === 'admin';
  const plan = usePlan();
  const sub = plan.data?.subscribed ?? 'free';
  // The tabs layout clears cached data and returns to the welcome screen.
  const signOut = () => confirm(t('me.signOutTitle'), t(CLOUD ? 'cloud.signOutBody' : DEMO_MODE ? 'signin.signOutDemoBody' : 'me.signOutBody'), t('me.signOut'), t('common.cancel'), () => void doSignOut());
  // The account is deleted on the server first; a refusal is shown, never a false "deleted".
  const remove = () => void deleteAccount().catch(() => notify(t('beta.delete.failedTitle'), t('beta.delete.failedBody')));
  const forget = () => DEMO_MODE && !CLOUD
    ? confirm(t('signin.forgetTitle'), t('signin.forgetBody'), t('signin.forget'), t('common.cancel'), remove)
    : confirm(t('cloud.deleteTitle'), t('cloud.deleteBody'), t('cloud.delete'), t('common.cancel'), remove);
  const mail = (to: string) => () => { void Linking.openURL(`mailto:${to}`); };
  const via = account ? t('signin.connectedVia', { provider: t(`signin.provider.${account.provider ?? 'email'}`) }) + (account.email ? ` · ${account.email}` : '') : undefined;

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

      <Section title={t('premium.section')}>
        <Row first title={t(`premium.plan.${plan.data?.isAdmin ? 'cercle' : sub}`)}
          value={plan.data?.isAdmin ? t('premium.adminShort') : sub === 'free' ? t('premium.freeHint') : t('premium.manage')}
          onPress={() => openPaywall('browse')} />
        <Row title={t('browse.title')} value={t('browse.moiHint', { city: cityOf(browse.code) })} onPress={() => setCityOpen(true)} />
      </Section>
      <CitySheet visible={cityOpen} onClose={() => setCityOpen(false)} />

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
        {CLOUD && account ? <Row title={t('cloud.delete')} onPress={forget} trailing={null} /> : DEMO_MODE && account ? <Row title={t('signin.forget')} onPress={forget} trailing={null} /> : !DEMO_MODE ? <Row title={t('cloud.delete')} onPress={forget} trailing={null} /> : null}
      </Section>

      <Section title={t('beta.help.title')}>
        {supportConfigured()
          ? <Row first title={t('beta.help.contact')} value={SUPPORT.email} onPress={mail(SUPPORT.email)} />
          : <Row first title={t('beta.help.contact')} value={t('beta.help.notSet')} trailing={null} />}
        <Row title={t('beta.legal.safety.title')} onPress={go('/legal/safety')} />
        <Row title={t('beta.legal.rules.title')} onPress={go('/legal/rules')} />
        <Row title={t('beta.legal.privacy.title')} onPress={go('/legal/privacy')} />
        <Row title={t('beta.legal.terms.title')} onPress={go('/legal/terms')} />
      </Section>
      <View style={{ alignItems: 'center', marginBottom: space.xl }}><EnvBadge /></View>
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
