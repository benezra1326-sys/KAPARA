import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { Text } from './Text';

/** Every fictional profile carries this badge. Non-negotiable. */
export function DemoBadge() {
  const { t } = useTranslation();
  return (
    <View style={{ backgroundColor: 'rgba(20,17,24,0.62)', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, alignSelf: 'flex-start' }}>
      <Text variant="caption" style={{ color: '#fff' }}>{t('common.demoBadge')}</Text>
    </View>
  );
}
