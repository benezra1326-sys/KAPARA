import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { Text } from './Text';

/** Every fictional profile carries this badge. Non-negotiable. */
export function DemoBadge({ compact }: { compact?: boolean } = {}) {
  const { t } = useTranslation();
  return (
    <View style={{ backgroundColor: 'rgba(20,17,24,0.62)', borderRadius: radius.pill, paddingHorizontal: compact ? space.sm : space.md, paddingVertical: compact ? 2 : space.xs, alignSelf: 'flex-start' }}>
      <Text variant="caption" numberOfLines={1} style={[{ color: '#fff' }, compact ? { fontSize: 10, lineHeight: 14 } : null]}>{t(compact ? 'common.demoShort' : 'common.demoBadge')}</Text>
    </View>
  );
}
