import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { hitSlop, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Kind = 'primary' | 'accent' | 'secondary' | 'ghost';

/**
 * One button for the whole app. Primary = the one action of a screen (black pill);
 * accent = an action toward a person (react, like), in motek rose;
 * secondary = an alternative of equal standing; ghost = a quiet link.
 * Hover and focus are visible on the web; press feedback is a slight scale.
 */
export function Button({ label, kind = 'primary', loading, onPress, icon, style, ...rest }: Omit<PressableProps, 'style'> & {
  label: string; kind?: Kind; loading?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const solid = kind === 'primary' || kind === 'accent';
  const bg = kind === 'primary' ? c.primary : kind === 'accent' ? c.accent : 'transparent';
  const pressedBg = kind === 'primary' ? c.primaryPressed : c.accentPressed;
  const fg = kind === 'primary' ? c.onPrimary : kind === 'accent' ? c.onAccent : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: rest.disabled ?? undefined }}
      onPress={(e) => { if (Platform.OS !== 'web') void Haptics.selectionAsync(); onPress?.(e); }}
      style={(state) => {
        const { pressed, hovered, focused } = state as typeof state & { hovered?: boolean; focused?: boolean };
        return [{
          minHeight: hitSlop + 4, borderRadius: radius.pill, paddingHorizontal: space.xl, justifyContent: 'center', alignItems: 'center',
          flexDirection: 'row', gap: space.sm,
          backgroundColor: solid ? (pressed || hovered ? pressedBg : bg) : (pressed || hovered) ? c.surfaceAlt : bg,
          borderWidth: kind === 'secondary' ? 1 : 0, borderColor: c.border,
          opacity: rest.disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          ...(Platform.OS === 'web' ? { transitionDuration: '160ms', transitionProperty: 'background-color, transform', outlineStyle: focused ? 'solid' : 'none', outlineWidth: 2, outlineColor: c.text, outlineOffset: 2 } as object : {}),
        }, style];
      }}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <View><Icon name={icon} size={20} color={fg} /></View> : null}
          <Text variant="label" style={{ color: fg, fontFamily: 'DMSans_600SemiBold', fontSize: 15, letterSpacing: 0.1 }} numberOfLines={1}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
