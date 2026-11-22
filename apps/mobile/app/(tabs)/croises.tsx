import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '../../src/ui';

/** TODO(workstream crossed): expo-location (coarse), background policy, list from GET /v1/crossed. */
export default function Crossed() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  return (
    <Screen title={t('crossed.title')} subtitle={t('crossed.subtitle')}>
      {enabled
        ? <EmptyState title={t('crossed.empty')} />
        : <EmptyState title={t('crossed.offTitle')} body={t('crossed.offBody')} action={{ label: t('crossed.enable'), onPress: () => setEnabled(true) }} />}
    </Screen>
  );
}
