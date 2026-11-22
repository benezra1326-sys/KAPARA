import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { DEMO_MODE } from '../api/client';
import { Button, Field, Sheet, Text } from '../ui';
import { demoAccount, type SignInProvider } from './demo-account';
import { ProviderButtons } from './ProviderButtons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME: Record<Exclude<SignInProvider, 'email'>, string> = { apple: 'Apple', google: 'Google', facebook: 'Facebook' };

/** After any sign-in: straight into the app when the profile exists, otherwise finish it. */
export function afterSignIn(hasProfile: boolean) {
  router.replace(hasProfile ? '/' : '/onboarding/basics');
}

/**
 * The sign-in block of the welcome screen. Signing in and creating an
 * account are one gesture: a known account opens the app, a new one goes on
 * to build its profile.
 *
 * Demo: Apple, Google and Facebook are simulated in a sheet that says so;
 * an address can be given to link the account (the same address = the same
 * account). Connected mode: e-mail code works; the three providers need the
 * keys listed in docs/connexion-sociale.md and say so until then.
 */
export function SignInChoices() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<Exclude<SignInProvider, 'email'> | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<SignInProvider | null>(null);
  const clean = email.trim().toLowerCase();
  const invalid = !!clean && !EMAIL.test(clean);

  const press = (p: SignInProvider) => {
    if (p === 'email') { router.push('/onboarding/email'); return; }
    if (DEMO_MODE) { setEmail(''); setSheet(p); return; }
    const msg = t('signin.notConfigured', { provider: NAME[p] });
    if (Platform.OS === 'web') window.alert(msg); else Alert.alert(msg);
  };

  const confirm = async () => {
    if (!sheet || invalid) return;
    const p = sheet;
    setBusy(p);
    try {
      qc.clear();
      const r = await demoAccount.signIn(p, clean || undefined);
      setSheet(null);
      afterSignIn(r.hasProfile);
    } finally { setBusy(null); }
  };

  return (
    <View style={{ gap: space.md }}>
      <ProviderButtons onPress={press} busy={busy} />
      <Sheet visible={!!sheet} onClose={() => setSheet(null)}>
        {sheet ? (
          <View style={{ gap: space.lg }}>
            <Text variant="title" accessibilityRole="header">{t('signin.demoTitle', { provider: NAME[sheet] })}</Text>
            <Text tone="textMuted">{t('signin.demoBody', { provider: NAME[sheet] })}</Text>
            <Field label={t('signin.demoEmailLabel')} value={email} onChangeText={setEmail} placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} inputMode="email" autoComplete="email"
              onSubmitEditing={() => void confirm()} error={invalid ? t('auth.emailInvalid') : undefined} />
            <Text variant="caption" tone="textSubtle">{t('signin.demoEmailHint')}</Text>
            <Button label={t('signin.demoContinue', { provider: NAME[sheet] })} onPress={() => void confirm()} loading={!!busy} disabled={invalid} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
