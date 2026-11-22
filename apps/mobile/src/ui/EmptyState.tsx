import { View } from 'react-native';
import { space } from '@kapara/design';
import { Button } from './Button';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: space.xxl, gap: space.md, alignItems: 'center' }} accessibilityRole="summary">
      <Icon name="sparkle" size={32} color={c.highlight} filled />
      <Text variant="heading" style={{ textAlign: 'center' }}>{title}</Text>
      {body ? <Text tone="textMuted" style={{ textAlign: 'center' }}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space.md }}><Button label={action.label} onPress={action.onPress} /></View> : null}
    </View>
  );
}
