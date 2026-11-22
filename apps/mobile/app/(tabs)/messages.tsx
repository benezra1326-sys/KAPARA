import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '../../src/ui';

export default function Messages() {
  const { t } = useTranslation();
  return <Screen title={t('messages.title')}><EmptyState title={t('messages.empty')} /></Screen>;
}
