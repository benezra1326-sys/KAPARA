import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { useTheme } from '../../src/theme';
import { EmptyState, Screen, Text } from '../../src/ui';

/** TODO(workstream live): socket.io presence, invitation sheet, LiveKit room, camera consent step. */
export default function Live() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [available, setAvailable] = useState(false);
  return (
    <Screen title={t('live.title')} subtitle={t('live.subtitle')}>
      <View style={{ marginHorizontal: space.lg, padding: space.xl, borderRadius: radius.lg, backgroundColor: c.surface, gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="bodyStrong">{t('live.availableToggle')}</Text>
          <Switch value={available} onValueChange={setAvailable} trackColor={{ true: c.live }} accessibilityLabel={t('live.availableToggle')} />
        </View>
        <Text variant="caption" tone="textMuted">{t('live.availableHint')}</Text>
        <Text variant="caption" tone="textMuted">{t('live.consentSteps')}</Text>
      </View>
      <View style={{ margin: space.lg, padding: space.lg, borderRadius: radius.md, backgroundColor: c.accentSoft }}>
        <Text variant="caption" tone="accent">{t('live.demoNotice')}</Text>
      </View>
      <EmptyState title={t('live.empty')} />
    </Screen>
  );
}
