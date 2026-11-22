import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { space } from '@kapara/design';
import { Screen, Text } from '../../src/ui';

/** TODO(workstream profile): per-field visibility, consent history, withdraw-all. */
export default function Privacy() {
  const { t } = useTranslation();
  return (
    <Screen title={t('me.privacy')}>
      <View style={{ paddingHorizontal: space.xl, gap: space.md }}>
        <Text variant="heading">{t('jewishLife.sectionTitle')}</Text>
        <Text tone="textMuted">{t('jewishLife.sectionIntro')}</Text>
        <Text tone="textMuted">{t('jewishLife.consentBody')}</Text>
      </View>
    </Screen>
  );
}
