import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fonts, radius, space } from '@kapara/design';
import { auth } from '../../src/api/client';
import { authErrorMessage } from '../../src/api/auth-errors';
import { meStore } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Button, Screen, Text } from '../../src/ui';

const LENGTH = 6;
const RESEND_AFTER_S = 30;

/**
 * Connected mode, step 0 bis: the 6-digit code. Filled automatically from the
 * keyboard suggestion (iOS/Android one-time-code autofill), submitted as soon
 * as six digits are there. A known account goes straight to the app; a new
 * one continues onboarding.
 */
export default function OnbCode() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ email: string; sentAt?: string; devCode?: string }>();
  const email = params.email ?? '';
  const input = useRef<TextInputInstance>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState(params.devCode);
  const [sentAt, setSentAt] = useState(Number(params.sentAt) || Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const wait = Math.max(0, RESEND_AFTER_S - Math.floor((now - sentAt) / 1000));

  const verify = async (value: string) => {
    if (value.length !== LENGTH || busy) return;
    setBusy(true); setError(null); setInfo(null);
    try {
      const r = await auth.verifyOtp(email, value, i18n.language);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // A fresh account: nothing cached from a previous session may leak into it.
      qc.clear();
      meStore.reset();
      router.replace(r.isNewUser ? '/onboarding/basics' : '/');
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(authErrorMessage(t, e));
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (wait > 0 || busy) return;
    setBusy(true); setError(null); setInfo(null);
    try {
      const r = await auth.requestOtp(email, i18n.language);
      setDevCode(r.devCode);
      setSentAt(Date.now()); setNow(Date.now());
      setCode('');
      setInfo(t('auth.resent'));
    } catch (e) {
      setError(authErrorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === LENGTH) void verify(digits);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back="back" title={t('auth.codeTitle')} keyboardShouldPersistTaps="handled"
        footer={<Button label={t('auth.verify')} onPress={() => void verify(code)} loading={busy} disabled={code.length !== LENGTH} />}>
        <View style={{ paddingHorizontal: space.xl, gap: space.xl }}>
          <Text tone="textMuted">{t('auth.codeIntro', { email })}</Text>

          {devCode ? (
            <Animated.View entering={FadeIn} style={{ padding: space.lg, borderRadius: radius.md, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }}>
              <Text variant="caption" tone="textMuted">{t('auth.devCodeNotice', { code: devCode })}</Text>
            </Animated.View>
          ) : null}

          <Pressable onPress={() => input.current?.focus()} accessible={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: LENGTH }, (_, i) => {
                const active = i === code.length && !busy;
                return (
                  <View key={i} style={{
                    flex: 1, aspectRatio: 0.82, maxHeight: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: c.surface, borderWidth: active ? 2 : 1, borderColor: error ? c.danger : active ? c.accent : c.border,
                  }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 32 }}>{code[i] ?? ''}</Text>
                  </View>
                );
              })}
            </View>
            {/* One real input over the boxes: autofill, paste and screen readers all work on it. */}
            <TextInput ref={input} value={code} onChangeText={onChange} autoFocus maxLength={LENGTH}
              keyboardType="number-pad" inputMode="numeric" textContentType="oneTimeCode" autoComplete="one-time-code"
              accessibilityLabel={t('auth.codeLabel')} accessibilityHint={t('auth.codeIntro', { email })}
              caretHidden selectionColor="transparent"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'transparent', opacity: 0.02 }} />
          </Pressable>

          {error ? <Text variant="caption" style={{ color: c.danger }} accessibilityLiveRegion="polite">{error}</Text> : null}
          {info ? <Text variant="caption" tone="live" accessibilityLiveRegion="polite">{info}</Text> : null}

          <View style={{ gap: space.xs }}>
            <Button kind="ghost" label={wait > 0 ? t('auth.resendIn', { seconds: wait }) : t('auth.resend')} disabled={wait > 0 || busy} onPress={() => void resend()} />
            <Button kind="ghost" label={t('auth.changeEmail')} onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
