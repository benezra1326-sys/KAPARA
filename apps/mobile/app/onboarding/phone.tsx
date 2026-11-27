import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, radius, space } from '@kapara/design';
import { demoAccount } from '../../src/account';
import { afterSignIn } from '../../src/account/SignInChoices';
import { defaultDialCode, prettyPhone, toE164 } from '../../src/account/phone';
import { DEMO_MODE } from '../../src/api/client';
import { cloudAccount } from '../../src/cloud/account';
import { CLOUD } from '../../src/cloud/client';
import { useTheme } from '../../src/theme';
import { Button, Field, Screen, Text } from '../../src/ui';

const LENGTH = 6;
const RESEND_AFTER_S = 60;

/**
 * Sign-in with a phone number: the number, then the 6-digit code sent by SMS
 * (Supabase Auth with Twilio). A known number opens the app, a new one goes
 * on to build its profile. Demo: no SMS is sent, and it says so; the same
 * number finds the same account on this device.
 */
export default function OnbPhone() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const qc = useQueryClient();
  const [dial, setDial] = useState(defaultDialCode);
  const [number, setNumber] = useState('');
  const [touched, setTouched] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const input = useRef<TextInputInstance>(null);
  const simulated = !CLOUD && DEMO_MODE;
  const phone = toE164(dial, number);
  useEffect(() => { if (!sentTo) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [sentTo]);
  const wait = Math.max(0, RESEND_AFTER_S - Math.floor((now - sentAt) / 1000));

  const errorText = (code: string) => t(`phone.err.${code}`, { defaultValue: t('phone.err.sms_failed') });

  const send = async (resend = false) => {
    setTouched(true);
    const to = resend ? sentTo : phone;
    if (!to || busy) return;
    setBusy(true); setError(null); setInfo(null);
    try {
      if (simulated) {
        // Demo: no SMS. The number opens (or creates) its account on this device.
        qc.clear();
        const d = await demoAccount.signIn('phone', undefined, to);
        afterSignIn(d.hasProfile);
        return;
      }
      const r = await cloudAccount.sendPhoneCode(to);
      if (!r.ok) { setError(errorText(r.code)); return; }
      setSentTo(to); setSentAt(Date.now()); setNow(Date.now()); setCode('');
      if (resend) setInfo(t('auth.resent'));
    } finally { setBusy(false); }
  };

  const verify = async (value: string) => {
    if (!sentTo || value.length !== LENGTH || busy) return;
    setBusy(true); setError(null); setInfo(null);
    try {
      qc.clear();
      const r = await cloudAccount.verifyPhoneCode(sentTo, value);
      if (!r.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(errorText(r.code)); setCode(''); input.current?.focus();
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      afterSignIn(r.hasProfile);
    } finally { setBusy(false); }
  };

  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits); setError(null);
    if (digits.length === LENGTH) void verify(digits);
  };

  if (sentTo) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen back="back" title={t('auth.codeTitle')} keyboardShouldPersistTaps="handled"
          footer={<Button label={t('auth.verify')} onPress={() => void verify(code)} loading={busy} disabled={code.length !== LENGTH} />}>
          <View style={{ paddingHorizontal: space.xl, gap: space.xl }}>
            <Text tone="textMuted">{t('phone.codeIntro', { phone: prettyPhone(sentTo) })}</Text>
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
              {/* One real input over the boxes: SMS autofill, paste and screen readers all work on it. */}
              <TextInput ref={input} value={code} onChangeText={onCode} autoFocus maxLength={LENGTH}
                keyboardType="number-pad" inputMode="numeric" textContentType="oneTimeCode" autoComplete="sms-otp"
                accessibilityLabel={t('auth.codeLabel')} caretHidden selectionColor="transparent"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'transparent', opacity: 0.02 }} />
            </Pressable>
            {error ? <Text variant="caption" style={{ color: c.danger }} accessibilityLiveRegion="polite">{error}</Text> : null}
            {info ? <Text variant="caption" tone="live" accessibilityLiveRegion="polite">{info}</Text> : null}
            <View style={{ gap: space.xs }}>
              <Button kind="ghost" label={wait > 0 ? t('auth.resendIn', { seconds: wait }) : t('auth.resend')} disabled={wait > 0 || busy} onPress={() => void send(true)} />
              <Button kind="ghost" label={t('phone.change')} onPress={() => { setSentTo(null); setCode(''); setError(null); setInfo(null); }} />
            </View>
          </View>
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back="back" title={t('phone.title')} keyboardShouldPersistTaps="handled"
        footer={<Button label={t(simulated ? 'signin.continue' : 'phone.send')} onPress={() => void send()} loading={busy} disabled={touched && !phone} />}>
        <View style={{ paddingHorizontal: space.xl, gap: space.xl }}>
          <Text tone="textMuted">{t('phone.intro')}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <View style={{ width: 96 }}>
              <Field label={t('phone.dialLabel')} value={dial} onChangeText={(v) => { setDial(`+${v.replace(/\D/g, '').slice(0, 4)}`); setError(null); }}
                keyboardType="phone-pad" inputMode="tel" autoComplete="tel-country-code" maxLength={5} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('phone.numberLabel')} value={number} onChangeText={(v) => { setNumber(v); setError(null); }}
                placeholder={t('phone.numberPlaceholder')} keyboardType="phone-pad" inputMode="tel" autoComplete="tel" textContentType="telephoneNumber"
                autoFocus returnKeyType="send" onSubmitEditing={() => void send()} maxLength={20}
                error={error ?? (touched && !phone ? t('phone.err.phone_invalid') : undefined)} />
            </View>
          </View>
          <Text variant="caption" tone="textSubtle">{t('phone.privacy')}</Text>
          {simulated ? <Text variant="caption" tone="textSubtle">{t('phone.demoNoSms')}</Text> : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
