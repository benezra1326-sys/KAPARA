import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, radius, space } from '@kapara/design';
import { cloudAccount } from '../cloud/account';
import { sb } from '../cloud/client';
import { useTheme } from '../theme';
import { Button, Field, Screen, Text } from '../ui';
import { afterSignIn } from './SignInChoices';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

/**
 * Real e-mail account: "Se connecter" or "Créer un compte", clearly separated,
 * with a password (8 characters minimum) and a "mot de passe oublié" link.
 * After a reset link, `?mode=reset` asks for the new password.
 */
export function EmailPassword() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'reset' ? 'reset' : params.mode === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  useEffect(() => { setError(null); setInfo(null); setTouched(false); }, [mode]);

  const clean = email.trim().toLowerCase();
  const emailOk = EMAIL.test(clean);
  const pwdOk = password.length >= 8;
  const needsEmail = mode !== 'reset';
  const needsPwd = mode !== 'forgot';
  const valid = (!needsEmail || emailOk) && (!needsPwd || pwdOk);

  const submit = async () => {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true); setError(null); setInfo(null);
    try {
      if (mode === 'forgot') {
        await cloudAccount.resetPassword(clean);
        setInfo(t('cloud.resetSent'));
        return;
      }
      if (mode === 'reset') {
        const { error: e } = await sb.auth.updateUser({ password });
        if (e) { setError(t('cloud.err.reset_failed')); return; }
        afterSignIn(true);
        return;
      }
      qc.clear();
      const r = mode === 'signup' ? await cloudAccount.signUpEmail(clean, password) : await cloudAccount.signInEmail(clean, password);
      if (r.ok === 'confirm') { setInfo(t('cloud.confirmSent')); return; }
      if (!r.ok) {
        setError(t(`cloud.err.${r.code}`, { defaultValue: t('cloud.err.generic') }));
        if (r.code === 'already_registered') setMode('signin');
        return;
      }
      afterSignIn(r.hasProfile);
    } catch {
      setError(t('cloud.err.generic'));
    } finally {
      setBusy(false);
    }
  };

  const tab = (m: Mode, label: string) => {
    const on = mode === m;
    return (
      <Pressable onPress={() => setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: on }}
        style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.text : 'transparent' }}>
        <Text style={{ color: on ? c.bg : c.textMuted, fontFamily: fonts.bodySemibold, fontSize: 15 }}>{label}</Text>
      </Pressable>
    );
  };

  const title = mode === 'signup' ? t('cloud.signupTitle') : mode === 'forgot' ? t('cloud.forgotTitle') : mode === 'reset' ? t('cloud.resetTitle') : t('cloud.signinTitle');
  const cta = mode === 'signup' ? t('cloud.signupCta') : mode === 'forgot' ? t('cloud.forgotCta') : mode === 'reset' ? t('cloud.resetCta') : t('cloud.signinCta');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back="back" title={title} keyboardShouldPersistTaps="handled"
        footer={<Button label={cta} onPress={() => void submit()} loading={busy} disabled={touched && !valid} />}>
        <View style={{ paddingHorizontal: space.xl, gap: space.xl }}>
          {mode === 'signin' || mode === 'signup' ? (
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, gap: 4 }}>
              {tab('signin', t('cloud.tabSignin'))}
              {tab('signup', t('cloud.tabSignup'))}
            </View>
          ) : null}
          <Text tone="textMuted">{t(mode === 'signup' ? 'cloud.signupIntro' : mode === 'forgot' ? 'cloud.forgotIntro' : mode === 'reset' ? 'cloud.resetIntro' : 'cloud.signinIntro')}</Text>
          {needsEmail ? (
            <Field label={t('auth.emailLabel')} value={email} onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder={t('auth.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              autoComplete="email" textContentType={mode === 'signup' ? 'username' : 'emailAddress'} inputMode="email" autoFocus maxLength={254}
              onSubmitEditing={() => void submit()}
              error={touched && !emailOk ? t('auth.emailInvalid') : undefined} />
          ) : null}
          {needsPwd ? (
            <Field label={t(mode === 'signin' ? 'cloud.password' : 'cloud.newPassword')} value={password} onChangeText={(v) => { setPassword(v); setError(null); }}
              secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={72}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} textContentType={mode === 'signin' ? 'password' : 'newPassword'}
              onSubmitEditing={() => void submit()} hint={mode === 'signin' ? undefined : t('cloud.passwordHint')}
              error={touched && !pwdOk ? t('cloud.passwordHint') : undefined} />
          ) : null}
          {error ? <Text style={{ color: c.danger }} accessibilityLiveRegion="polite">{error}</Text> : null}
          {info ? <Text tone="highlight" accessibilityLiveRegion="polite">{info}</Text> : null}
          {mode === 'signin' ? <Button kind="ghost" label={t('cloud.forgotLink')} onPress={() => setMode('forgot')} /> : null}
          {mode === 'forgot' ? <Button kind="ghost" label={t('cloud.backToSignin')} onPress={() => setMode('signin')} /> : null}
          <Text variant="caption" tone="textSubtle">{t('auth.emailPrivacy')}</Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
