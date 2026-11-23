import { Redirect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { APP } from '@kapara/config';
import { space } from '@kapara/design';
import { useAuthStatus } from '../../src/account';
import { SignInChoices } from '../../src/account/SignInChoices';
import { DEMO_MODE } from '../../src/api/client';
import { CLOUD } from '../../src/cloud/client';
import { useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { BrandMark, Icon, Text, Wordmark, useLayout } from '../../src/ui';

const UNIVERSES = ['forYou', 'crossed', 'live'] as const;
const GLYPH = { forYou: 'forYou', crossed: 'crossed', live: 'live' } as const;

/** Welcome: what the app is, the three ways to meet, and the promises we keep. */
export default function Welcome() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { isPhone } = useLayout();
  const status = useAuthStatus();
  const onboarded = useMe((s) => s.onboarded);
  // Already signed in (reload, back button): never ask again.
  if (status === 'loading') return null;
  if (status === 'signedIn') return <Redirect href={onboarded ? '/' : '/onboarding/basics'} />;
  const tagline = (APP.tagline as Record<string, string>)[i18n.language] ?? APP.tagline.fr;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ flexGrow: 1 }}>
    <View style={{ flexGrow: 1, backgroundColor: c.bg, paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.xl,
      // Phone: content up, action at thumb reach. Larger screens: one centred block.
      justifyContent: isPhone ? 'space-between' : 'center', gap: isPhone ? undefined : space.xxxl, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <View style={{ gap: space.xxl }}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ gap: space.md }}>
          <BrandMark size={72} />
          <Text variant="overline" tone="highlight" style={{ marginTop: space.md }}>{t('onb.welcomeOverline')}</Text>
          <Wordmark size={24} header />
          <Text variant="quote" tone="textMuted">{tagline}</Text>
        </Animated.View>
        <View style={{ gap: space.lg }}>
          {UNIVERSES.map((u, i) => (
            <Animated.View key={u} entering={FadeInDown.delay(150 + i * 120).duration(450)} style={{ flexDirection: 'row', gap: space.lg }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={GLYPH[u]} size={22} color={c.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{t(`onb.u.${u}.title`)}</Text>
                <Text variant="caption" tone="textMuted">{t(`onb.u.${u}.body`)}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
        <Animated.View entering={FadeInDown.delay(560).duration(450)}>
          <Text variant="caption" tone="textSubtle">{t('onb.promise')}</Text>
        </Animated.View>
      </View>
      <View style={{ gap: space.sm }}>
        {DEMO_MODE && !CLOUD ? <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('signin.demoNotice')}</Text> : null}
        <SignInChoices />
        <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('signin.terms')}</Text>
      </View>
    </View>
    </ScrollView>
  );
}
