import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { APP } from '@kapara/config';
import { space } from '@kapara/design';
import { DEMO_MODE } from '../../src/api/client';
import { useTheme } from '../../src/theme';
import { Button, Text } from '../../src/ui';

const UNIVERSES = ['forYou', 'crossed', 'live'] as const;
const GLYPH = { forYou: '✦', crossed: '◌', live: '◉' } as const;

/** Welcome: what the app is, the three ways to meet, and the promises we keep. */
export default function Welcome() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const tagline = (APP.tagline as Record<string, string>)[i18n.language] ?? APP.tagline.fr;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.xl, justifyContent: 'space-between' }}>
      <View style={{ gap: space.xxl }}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ gap: space.md }}>
          <Text variant="overline" tone="highlight">{t('onb.welcomeOverline')}</Text>
          <Text variant="hero" accessibilityRole="header" style={{ fontSize: 52, lineHeight: 56 }}>{APP.name}</Text>
          <Text variant="quote" tone="textMuted">{tagline}</Text>
        </Animated.View>
        <View style={{ gap: space.lg }}>
          {UNIVERSES.map((u, i) => (
            <Animated.View key={u} entering={FadeInDown.delay(150 + i * 120).duration(450)} style={{ flexDirection: 'row', gap: space.lg }}>
              <Text variant="heading" tone="accent" accessibilityElementsHidden style={{ width: 24, textAlign: 'center' }}>{GLYPH[u]}</Text>
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
        {DEMO_MODE ? <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('onb.demoNotice')}</Text> : null}
        <Button label={t('onb.start')} onPress={() => router.push('/onboarding/basics')} />
      </View>
    </View>
  );
}
