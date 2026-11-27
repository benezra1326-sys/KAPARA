import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { BACKEND, ENV, IS_PRODUCTION } from '../env';
import { useTheme } from '../theme';
import { Text } from './Text';

/**
 * Which environment this build is connected to, said plainly: demo (nothing
 * leaves the device), test (Supabase test base) or the ZIV server. Hidden in
 * production, where there is only one.
 */
export function EnvBadge({ align = 'center' }: { align?: 'center' | 'flex-start' }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  if (IS_PRODUCTION) return null;
  const host = BACKEND === 'api' ? hostOf(ENV.apiUrl) : '';
  return (
    <View accessibilityRole="text" style={{ alignSelf: align, flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 1, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BACKEND === 'api' ? c.live : c.highlight }} />
      <Text variant="caption" tone="textSubtle">{t(`beta.env.${BACKEND}`, { host })}</Text>
    </View>
  );
}

function hostOf(url: string) {
  try { return new URL(url).host; } catch { return url; }
}

/** Shown instead of the app when a production build is misconfigured: never a silent fallback. */
export function ConfigError() {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: space.xl, gap: space.md }}>
      <Text variant="title" accessibilityRole="header">{t('beta.config.title')}</Text>
      <Text tone="textMuted">{t('beta.config.body')}</Text>
      {ENV.errors.map((e) => <Text key={e} variant="caption" tone="textSubtle">• {e}</Text>)}
    </View>
  );
}
