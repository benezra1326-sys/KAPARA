import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { DEMO_MODE } from '../api/client';
import { Button, Field, Sheet, Text } from '../ui';
import { demoAccount, type SignInProvider } from './demo-account';
import { cloudAccount } from '../cloud/account';
import { CLOUD, enabledProviders } from '../cloud/client';
import { ProviderButtons } from './ProviderButtons';
import { GOOGLE_WEB, GoogleWebButton } from '../cloud/google-web';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME: Record<Exclude<SignInProvider, 'email'>, string> = { apple: 'Apple', google: 'Google', facebook: 'Facebook' };

/** After any sign-in: straight into the app when the profile exists, otherwise finish it. */
export function afterSignIn(hasProfile: boolean) {
  router.replace(hasProfile ? '/' : '/onboarding/basics');
}

export type SignInIntent = 'create' | 'signin';
const SOCIAL = ['apple', 'google', 'facebook'] as const;

/**
 * Which sign-in methods really work here. Real accounts (Supabase): e-mail,
 * plus each provider the project has switched on (read from the server, so
 * a provider appears the day it is activated). Offline demo: all four,
 * simulated and labelled so. Own API: e-mail only.
 */
export function useSignInMethods() {
  const q = useQuery({ queryKey: ['auth-providers'], queryFn: enabledProviders, enabled: CLOUD, staleTime: 10 * 60_000 });
  if (CLOUD) {
    const on = q.data ?? {};
    const live = SOCIAL.filter((p) => on[p]);
    return { methods: [...live, 'email'] as SignInProvider[], soon: q.data ? SOCIAL.filter((p) => !on[p]) : [], checking: q.isLoading, simulated: false };
  }
  if (DEMO_MODE) return { methods: [...SOCIAL, 'email'] as SignInProvider[], soon: [], checking: false, simulated: true };
  return { methods: ['email'] as SignInProvider[], soon: [...SOCIAL], checking: false, simulated: false };
}

/**
 * The sign-in methods, for one intent: "Créer mon profil" or "J'ai déjà un
 * compte". Only methods that work are shown; the others are named as
 * "bientôt" in one quiet line. A known account opens the app, a new one goes
 * on to build its profile, whatever the button.
 *
 * Demo: Apple, Google and Facebook are simulated in a sheet that says so;
 * an address can be given to link the account (the same address = the same
 * account).
 */
export function SignInChoices({ intent = 'create' }: { intent?: SignInIntent }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { methods, soon, checking, simulated } = useSignInMethods();
  const [sheet, setSheet] = useState<Exclude<SignInProvider, 'email'> | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<SignInProvider | null>(null);
  const clean = email.trim().toLowerCase();
  const invalid = !!clean && !EMAIL.test(clean);

  const say = (msg: string) => { if (Platform.OS === 'web') window.alert(msg); else Alert.alert(msg); };

  const press = (p: SignInProvider) => {
    if (p === 'email') { router.push({ pathname: '/onboarding/email', params: { mode: intent === 'create' ? 'signup' : 'signin' } }); return; }
    if (CLOUD) { void real(p); return; }
    if (DEMO_MODE) { setEmail(''); setSheet(p); return; }
    const msg = t('signin.notConfigured', { provider: NAME[p] });
    if (Platform.OS === 'web') window.alert(msg); else Alert.alert(msg);
  };

  /** Real sign-in: Google and Facebook through Supabase once switched on; Apple waits for the Apple Developer account. */
  const real = async (p: Exclude<SignInProvider, 'email'>) => {
    if (p === 'apple') { say(t('cloud.appleSoon')); return; }
    setBusy(p);
    try {
      const on = await enabledProviders();
      if (!on[p]) { say(t('cloud.providerOff', { provider: NAME[p] })); return; }
      qc.clear();
      if (!(await cloudAccount.signInWith(p))) say(t('cloud.err.generic'));
      // Web: the page leaves for the provider and comes back signed in.
    } finally { setBusy(null); }
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
      <ProviderButtons providers={methods} onPress={press} busy={busy}
        wrap={GOOGLE_WEB ? { google: (fallback) => (
          <GoogleWebButton fallback={fallback} onSignedIn={(has) => { qc.clear(); afterSignIn(has); }} onError={() => say(t('cloud.err.generic'))} />
        ) } : undefined} />
      {checking ? <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('entry.checking')}</Text> : null}
      {soon.length ? <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('entry.soon', { list: soon.map((p) => NAME[p]).join(', ') })}</Text> : null}
      {simulated ? <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center' }}>{t('entry.demoMethods')}</Text> : null}
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
