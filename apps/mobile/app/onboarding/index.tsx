import { Redirect } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
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
import { BrandMark, MeetWays, Text, Wordmark } from '../../src/ui';

const EASE = Easing.out(Easing.cubic);

/**
 * Fades and lifts its content in after `delay`. Plain opacity and translate
 * (no layout animation), so every element keeps its own place in the column
 * on every browser. Reduced motion: shown at once.
 */
function Reveal({ delay = 0, rise = 14, children, style }: { delay?: number; rise?: number; children: ReactNode; style?: ViewStyle }) {
  const reduceMotion = useReducedMotion();
  const v = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    v.value = withDelay(delay, withTiming(1, { duration: 700, easing: EASE }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * rise }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/**
 * Welcome. One centred column, read top to bottom: the brand, what it
 * promises, the three ways to meet as cards, then one clear place to sign in
 * or create an account (the same buttons do both, and the title says so).
 * Phone: brand in the upper part, sign-in at thumb reach.
 */
export default function Welcome() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStatus();
  const onboarded = useMe((s) => s.onboarded);

  // Already signed in (reload, back button): never ask again.
  if (status === 'loading') return null;
  if (status === 'signedIn') return <Redirect href={onboarded ? '/' : '/onboarding/basics'} />;
  const tagline = (APP.tagline as Record<string, string>)[i18n.language] ?? APP.tagline.fr;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center',
        paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.md, paddingHorizontal: space.xl }}>

        {/* Brand: mark, name and promise stacked on one centre line. */}
        <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.md }}>
          <Reveal rise={8} style={{ alignItems: 'center' }}>
            <BrandMark size={60} />
          </Reveal>
          <Reveal delay={180} style={{ marginTop: space.lg, alignItems: 'center' }}>
            <Wordmark size={22} header />
          </Reveal>
          <Reveal delay={320} style={{ marginTop: space.md, maxWidth: 240, alignItems: 'center' }}>
            <Text variant="quote" tone="textMuted" style={{ fontSize: 19, lineHeight: 24, textAlign: 'center' }}>{tagline}</Text>
          </Reveal>
          <Reveal delay={480} style={{ marginTop: space.xl, alignSelf: 'stretch' }}>
            <MeetWays />
          </Reveal>
        </View>

        {/* Sign in or create an account: the same buttons. */}
        <Reveal delay={640} style={{ gap: space.md, marginTop: space.md }}>
          <Text variant="overline" tone="textSubtle" accessibilityRole="header" style={{ textAlign: 'center' }}>{t('signin.title')}</Text>
          <SignInChoices />
          <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 15 }}>
            {t('signin.terms')}{DEMO_MODE && !CLOUD ? `\n${t('signin.demoNotice')}` : ''}
          </Text>
        </Reveal>
      </View>
    </ScrollView>
  );
}
