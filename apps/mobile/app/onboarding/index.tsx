import { Redirect } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { APP } from '@kapara/config';
import { radius, space } from '@kapara/design';
import { useAuthStatus } from '../../src/account';
import { SignInChoices, type SignInIntent } from '../../src/account/SignInChoices';
import { DEMO_MODE } from '../../src/api/client';
import { CLOUD } from '../../src/cloud/client';
import { useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { BrandMark, Button, MeetWays, Sheet, Text, useLayout, Wordmark } from '../../src/ui';

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
 * Welcome. Read top to bottom: the brand and its promise, a preview of the
 * three ways to meet (clearly a preview: nobody is signed in yet), then the
 * first choice, plainly split in two: "Créer mon profil" or "J'ai déjà un
 * compte". Each opens the sign-in methods that really work here.
 * Phone: one column, choices at thumb reach. Desktop: two columns, the
 * brand and choices on one side, the preview framed on the other.
 */
export default function Welcome() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, isPhone } = useLayout();
  const status = useAuthStatus();
  const onboarded = useMe((s) => s.onboarded);
  const [intent, setIntent] = useState<SignInIntent | null>(null);

  // Already signed in (reload, back button): never ask again.
  if (status === 'loading') return null;
  if (status === 'signedIn') return <Redirect href={onboarded ? '/' : '/onboarding/basics'} />;
  const tagline = (APP.tagline as Record<string, string>)[i18n.language] ?? APP.tagline.fr;

  const brand = (
    <View style={{ alignItems: isDesktop ? 'flex-start' : 'center' }}>
      <Reveal rise={8}><BrandMark size={isDesktop ? 64 : 58} /></Reveal>
      <Reveal delay={160} style={{ marginTop: space.lg }}><Wordmark size={isDesktop ? 24 : 21} header /></Reveal>
      <Reveal delay={300} style={{ marginTop: space.lg, maxWidth: isDesktop ? 420 : 300 }}>
        <Text variant="title" style={{ textAlign: isDesktop ? 'auto' : 'center', fontSize: isDesktop ? 44 : 30, lineHeight: isDesktop ? 50 : 36 }}>{tagline}</Text>
      </Reveal>
      <Reveal delay={400} style={{ marginTop: space.sm, maxWidth: 360 }}>
        <Text tone="textMuted" style={{ textAlign: isDesktop ? 'auto' : 'center' }}>{t('entry.launch')}</Text>
      </Reveal>
    </View>
  );

  const preview = (
    <Reveal delay={520} style={{ alignSelf: 'stretch', gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: isDesktop ? 'flex-start' : 'center' }}>
        <View style={{ paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border }}>
          <Text variant="overline" tone="textSubtle">{t('entry.preview')}</Text>
        </View>
      </View>
      <MeetWays />
      <Text variant="caption" tone="textSubtle" style={{ textAlign: isDesktop ? 'auto' : 'center' }}>{t('entry.previewHint')}</Text>
    </Reveal>
  );

  const choices = (
    <Reveal delay={640} style={{ gap: space.sm, alignSelf: 'stretch' }}>
      <Button label={t('entry.create')} onPress={() => setIntent('create')} />
      <Button kind="secondary" label={t('entry.haveAccount')} onPress={() => setIntent('signin')} />
      <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center', marginTop: space.xs }}>
        {t('entry.privacy')}{DEMO_MODE && !CLOUD ? `\n${t('signin.demoNotice')}` : ''}
      </Text>
    </Reveal>
  );

  const sheet = (
    <Sheet visible={!!intent} onClose={() => setIntent(null)}>
      {intent ? (
        <View style={{ gap: space.lg, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          <View style={{ gap: space.xs }}>
            <Text variant="title" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34 }}>{t(intent === 'create' ? 'entry.createTitle' : 'entry.signinTitle')}</Text>
            <Text tone="textMuted">{t(intent === 'create' ? 'entry.createBody' : 'entry.signinBody')}</Text>
          </View>
          <SignInChoices intent={intent} />
          <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('entry.privacy')}</Text>
        </View>
      ) : null}
    </Sheet>
  );

  if (isDesktop) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 72, paddingHorizontal: 48, paddingVertical: 56 }}>
          <View style={{ flex: 1, maxWidth: 460, gap: space.xxl }}>
            {brand}
            <View style={{ maxWidth: 380 }}>{choices}</View>
          </View>
          <View style={{ flex: 1, padding: space.xxl, borderRadius: radius.xl, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>{preview}</View>
        </View>
        {sheet}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flexGrow: 1, width: '100%', maxWidth: isPhone ? 440 : 520, alignSelf: 'center',
        paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.xl }}>
        <View style={{ flexGrow: 1, justifyContent: 'center', gap: space.xl, paddingVertical: space.md }}>
          {brand}
          {preview}
        </View>
        <View style={{ marginTop: space.lg }}>{choices}</View>
      </View>
      {sheet}
    </ScrollView>
  );
}
