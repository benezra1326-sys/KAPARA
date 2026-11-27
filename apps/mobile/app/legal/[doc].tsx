import { useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SUPPORT, supportConfigured } from '@kapara/config';
import { radius, space } from '@kapara/design';
import { useTheme } from '../../src/theme';
import { Button, Screen, Text } from '../../src/ui';

const DOCS = ['privacy', 'terms', 'rules', 'safety'] as const;
type Doc = (typeof DOCS)[number];

/**
 * Privacy, terms, community rules, safety and account deletion. These are
 * drafts describing what the app really does; they carry a visible notice
 * until a lawyer has validated them. No legal guarantee is invented here.
 */
export default function LegalDoc() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { doc: raw } = useLocalSearchParams<{ doc: string }>();
  const doc: Doc = (DOCS as readonly string[]).includes(raw ?? '') ? (raw as Doc) : 'privacy';
  const paragraphs = t(`beta.legal.${doc}.body`).split('\n\n');
  const email = doc === 'privacy' ? SUPPORT.privacyEmail : doc === 'safety' ? SUPPORT.safetyEmail : SUPPORT.email;
  return (
    <Screen back="back" title={t(`beta.legal.${doc}.title`)}>
      <View style={{ paddingHorizontal: space.xl, gap: space.lg, paddingBottom: space.xxl }}>
        <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md }}>
          <Text variant="caption" tone="textMuted">{t('beta.legal.draft')}</Text>
        </View>
        {paragraphs.map((p, i) => <Text key={i}>{p}</Text>)}
        {supportConfigured(email)
          ? <Button kind="secondary" label={t('beta.legal.write', { email })} onPress={() => void Linking.openURL(`mailto:${email}`)} />
          : <Text variant="caption" tone="textSubtle">{t('beta.help.notSet')}</Text>}
      </View>
    </Screen>
  );
}
