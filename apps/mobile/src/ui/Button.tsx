import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { hitSlop, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

export function Button({ label, kind = 'primary', loading, onPress, ...rest }: PressableProps & { label: string; kind?: 'primary' | 'secondary' | 'ghost'; loading?: boolean }) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'secondary' ? c.surfaceAlt : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: rest.disabled ?? undefined }}
      onPress={(e) => { void Haptics.selectionAsync(); onPress?.(e); }}
      style={({ pressed }) => ({
        minHeight: hitSlop, borderRadius: radius.pill, paddingHorizontal: space.xl, justifyContent: 'center', alignItems: 'center',
        backgroundColor: pressed && kind === 'primary' ? c.accentPressed : bg, opacity: rest.disabled ? 0.5 : pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
      {...rest}
    >
      {loading ? <ActivityIndicator color={kind === 'primary' ? c.onAccent : c.text} /> :
        <Text variant="label" tone={kind === 'primary' ? 'onAccent' : 'text'}>{label}</Text>}
    </Pressable>
  );
}
