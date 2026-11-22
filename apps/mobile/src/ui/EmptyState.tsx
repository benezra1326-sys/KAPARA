import { View } from 'react-native';
import { space } from '@kapara/design';
import { Button } from './Button';
import { Text } from './Text';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ padding: space.xxl, gap: space.md, alignItems: 'center' }} accessibilityRole="summary">
      <Text variant="quote" tone="highlight" style={{ fontSize: 32 }} accessibilityElementsHidden>✦</Text>
      <Text variant="heading" style={{ textAlign: 'center' }}>{title}</Text>
      {body ? <Text tone="textMuted" style={{ textAlign: 'center' }}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space.md }}><Button label={action.label} onPress={action.onPress} /></View> : null}
    </View>
  );
}
