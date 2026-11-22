import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useQueryClient } from '@tanstack/react-query';
import { demoAccount } from '../../src/account';
import { afterSignIn } from '../../src/account/SignInChoices';
import { auth, DEMO_MODE } from '../../src/api/client';
import { authErrorMessage } from '../../src/api/auth-errors';
import { Button, Field, Screen, Text } from '../../src/ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Connected mode, step 0: email address. A 6-digit code is sent; no password. */
export default function OnbEmail() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = email.trim().toLowerCase();
  const valid = EMAIL.test(clean);

  const submit = async () => {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true); setError(null);
    try {
      if (DEMO_MODE) {
        // Demo: no e-mail is sent; the address opens (or creates) the account on this device.
        qc.clear();
        const d = await demoAccount.signIn('email', clean);
        afterSignIn(d.hasProfile);
        return;
      }
      const r = await auth.requestOtp(clean, i18n.language);
      router.push({ pathname: '/onboarding/code', params: { email: clean, sentAt: String(Date.now()), ...(r.devCode ? { devCode: r.devCode } : {}) } });
    } catch (e) {
      setError(authErrorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back="back" title={t('auth.emailTitle')} keyboardShouldPersistTaps="handled"
        footer={<Button label={t(DEMO_MODE ? 'signin.continue' : 'auth.sendCode')} onPress={() => void submit()} loading={busy} disabled={touched && !valid} />}>
        <View style={{ paddingHorizontal: space.xl, gap: space.xl }}>
          <Text tone="textMuted">{t('auth.emailIntro')}</Text>
          <Field label={t('auth.emailLabel')} value={email} onChangeText={(v) => { setEmail(v); setError(null); }}
            placeholder={t('auth.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            autoComplete="email" textContentType="emailAddress" inputMode="email" returnKeyType="send" autoFocus
            onSubmitEditing={() => void submit()} maxLength={254}
            error={error ?? (touched && !valid ? t('auth.emailInvalid') : undefined)} />
          <Text variant="caption" tone="textSubtle">{t('auth.emailPrivacy')}</Text>
          {DEMO_MODE ? <Text variant="caption" tone="textSubtle">{t('signin.demoEmailNoCode')}</Text> : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
