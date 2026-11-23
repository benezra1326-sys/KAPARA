import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { APP } from '@kapara/config';
import { hitSlop, space } from '@kapara/design';
import { useAuthStatus } from '../../src/account';
import { SignInChoices } from '../../src/account/SignInChoices';
import { DEMO_MODE } from '../../src/api/client';
import { useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { BrandMark, Icon, Text, Wordmark } from '../../src/ui';

const UNIVERSES = ['forYou', 'crossed', 'live'] as const;
type Universe = (typeof UNIVERSES)[number];
/** Time each way to meet stays on screen before the next one. */
const ROTATE_MS = 4200;
const EASE = Easing.out(Easing.cubic);

/**
 * Welcome. One centred column, read top to bottom: the brand, what it
 * promises, the three ways to meet, then one clear place to sign in or
 * create an account (the same buttons do both, and the title says so).
 * Phone: brand in the upper part, sign-in at thumb reach.
 */
export default function Welcome() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const status = useAuthStatus();
  const onboarded = useMe((s) => s.onboarded);
  const [active, setActive] = useState<Universe>('forYou');
  const [touched, setTouched] = useState(false);

  // The three ways to meet take turns, until the person picks one or prefers less motion.
  useEffect(() => {
    if (reduceMotion || touched) return;
    const id = setInterval(() => setActive((a) => UNIVERSES[(UNIVERSES.indexOf(a) + 1) % UNIVERSES.length]), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, touched]);

  // Already signed in (reload, back button): never ask again.
  if (status === 'loading') return null;
  if (status === 'signedIn') return <Redirect href={onboarded ? '/' : '/onboarding/basics'} />;
  const tagline = (APP.tagline as Record<string, string>)[i18n.language] ?? APP.tagline.fr;
  const enter = (delay: number, d = 600) => (reduceMotion ? undefined : FadeInDown.delay(delay).duration(d).easing(EASE));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center',
        paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.md, paddingHorizontal: space.xl }}>

        {/* Brand: centred in the space above the sign-in block. */}
        <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.md }}>
          <Animated.View entering={reduceMotion ? undefined : ZoomIn.duration(800).easing(EASE).withInitialValues({ transform: [{ scale: 0.88 }] })}>
            <BrandMark size={64} />
          </Animated.View>
          <Animated.View entering={enter(220, 700)} style={{ marginTop: space.lg }}>
            <Wordmark size={22} header />
          </Animated.View>
          <Animated.View entering={enter(380, 700)} style={{ marginTop: space.md, maxWidth: 240 }}>
            <Text variant="quote" tone="textMuted" style={{ fontSize: 19, lineHeight: 24, textAlign: 'center' }}>{tagline}</Text>
          </Animated.View>

          {/* The three ways to meet: one line, the active one explained below. */}
          <Animated.View entering={enter(560)} style={{ marginTop: space.xl, alignItems: 'center', gap: space.sm, alignSelf: 'stretch' }}>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg }}>
              {UNIVERSES.map((u) => {
                const on = u === active;
                return (
                  <Pressable key={u} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t(`onb.u.${u}.title`)}
                    onPress={() => { setTouched(true); setActive(u); }}
                    style={{ minHeight: hitSlop, minWidth: 84, alignItems: 'center', gap: space.xs }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: on ? c.accentSoft : 'transparent', borderWidth: 1, borderColor: on ? c.accentSoft : c.border }}>
                      <Icon name={u} size={19} color={on ? c.accent : c.textSubtle} />
                    </View>
                    <Text variant="caption" tone={on ? 'text' : 'textSubtle'}>{t(`onb.u.${u}.title`)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* Fixed height: changing the text never moves the buttons below. */}
            <View style={{ minHeight: 34, maxWidth: 300, justifyContent: 'flex-start' }} accessibilityLiveRegion="polite">
              <Animated.View key={active} entering={reduceMotion ? undefined : FadeIn.duration(450)}>
                <Text variant="caption" tone="textMuted" style={{ textAlign: 'center' }}>{t(`onb.u.${active}.body`)}</Text>
              </Animated.View>
            </View>
          </Animated.View>
        </View>

        {/* Sign in or create an account: the same buttons. */}
        <Animated.View entering={enter(700)} style={{ gap: space.md }}>
          <Text variant="overline" tone="textSubtle" accessibilityRole="header" style={{ textAlign: 'center' }}>{t('signin.title')}</Text>
          <SignInChoices />
          <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 15 }}>
            {t('signin.terms')}{DEMO_MODE ? `\n${t('signin.demoNotice')}` : ''}
          </Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
