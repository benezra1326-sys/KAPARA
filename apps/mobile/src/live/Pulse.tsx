import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

/** Soft concentric rings: someone is there, live. Static when "reduce motion" is on. */
export function Pulse({ color, size, rings = 2, active = true, style }: { color: string; size: number; rings?: number; active?: boolean; style?: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {Array.from({ length: rings }, (_, i) => <Ring key={i} color={color} size={size} delay={i * 900} active={active} />)}
    </View>
  );
}

function Ring({ color, size, delay, active }: { color: string; size: number; delay: number; active: boolean }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active || reduce) { cancelAnimation(t); t.value = 0; return; }
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, [active, reduce, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: active ? (reduce ? 0.25 : 0.5 * (1 - t.value)) : 0,
    transform: [{ scale: 1 + t.value * 0.45 }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color }, style]} />;
}
