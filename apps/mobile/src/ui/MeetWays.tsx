import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { hitSlop, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export const MEET_WAYS = ['forYou', 'crossed', 'live'] as const;
export type MeetWay = (typeof MEET_WAYS)[number];
/** Time each card stays before the next one, while nobody has touched them. */
const ROTATE_MS = 5000;
const EASE = Easing.out(Easing.cubic);

/**
 * The three ways to meet, as cards: tabs on top (with a thin progress line on
 * the active one), one card below that slides in. Tap a tab, tap the card or
 * swipe it to move on; touching stops the automatic turn. Reduced motion: no
 * automatic turn, no slide.
 */
export function MeetWays() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [auto, setAuto] = useState(!reduceMotion);
  const way = MEET_WAYS[index];

  const go = (next: number, byHand: boolean) => {
    const n = (next + MEET_WAYS.length) % MEET_WAYS.length;
    if (n === index) return;
    setDir(next > index || (index === MEET_WAYS.length - 1 && n === 0) ? 1 : -1);
    setIndex(n);
    if (byHand) setAuto(false);
  };

  // Automatic turn, drawn as a progress line on the active tab.
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!auto || reduceMotion) { cancelAnimation(progress); progress.value = auto ? 0 : 1; return; }
    progress.value = 0;
    progress.value = withTiming(1, { duration: ROTATE_MS, easing: Easing.linear });
    const id = setTimeout(() => go(index + 1, false), ROTATE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, auto, reduceMotion]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // Card entrance: from the side it comes from.
  const shown = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    shown.value = 0;
    shown.value = withTiming(1, { duration: 420, easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  const card = useAnimatedStyle(() => ({ opacity: 0.2 + shown.value * 0.8, transform: [{ translateX: (1 - shown.value) * 24 * dir }] }));

  // Swipe left or right on the card.
  const indexRef = useRef(index);
  indexRef.current = index;
  const goRef = useRef(go);
  goRef.current = go;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (g.dx < -40) goRef.current(indexRef.current + 1, true);
      else if (g.dx > 40) goRef.current(indexRef.current - 1, true);
    },
  })).current;

  return (
    <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: space.xs, padding: 3, borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
        {MEET_WAYS.map((w, i) => {
          const on = i === index;
          return (
            <Pressable key={w} onPress={() => go(i, true)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t(`onb.u.${w}.title`)}
              style={({ pressed }) => ({ flex: 1, minHeight: 40, borderRadius: radius.pill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 6, backgroundColor: on ? c.bg : 'transparent', opacity: pressed ? 0.7 : 1,
                borderWidth: on ? 1 : 0, borderColor: c.border })}>
              <Icon name={w} size={16} color={on ? c.accent : c.textSubtle} />
              <Text variant="label" tone={on ? 'text' : 'textSubtle'} style={{ fontSize: 13 }}>{t(`onb.u.${w}.title`)}</Text>
              {on ? (
                <View style={{ position: 'absolute', left: 18, right: 18, bottom: 5, height: 2, borderRadius: 1, overflow: 'hidden', backgroundColor: c.border }}>
                  <Animated.View style={[{ height: 2, backgroundColor: c.accent }, bar]} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => go(index + 1, true)} accessibilityRole="button" accessibilityHint={t('onb.u.next')}
        accessibilityLabel={`${t(`onb.u.${way}.title`)}. ${t(`onb.u.${way}.body`)}`} {...pan.panHandlers}>
        {({ pressed }) => (
          <Animated.View style={[{ minHeight: Math.max(hitSlop, 124), borderRadius: radius.xl, padding: space.lg, backgroundColor: c.accentSoft,
            flexDirection: 'row', alignItems: 'center', gap: space.lg, transform: [{ scale: pressed ? 0.98 : 1 }] }, card]}>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text variant="heading" style={{ fontSize: 22, lineHeight: 26 }}>{t(`onb.u.${way}.title`)}</Text>
              <Text variant="caption" tone="textMuted">{t(`onb.u.${way}.body`)}</Text>
            </View>
            <Art way={way} />
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

/** A small drawing per way to meet. Live breathes, unless motion is reduced. */
function Art({ way }: { way: MeetWay }) {
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (way !== 'live' || reduceMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [way, reduceMotion]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - pulse.value), transform: [{ scale: 0.6 + pulse.value * 0.6 }] }));
  const size = 72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {way === 'forYou' ? (
        <Svg width={size} height={size} viewBox="0 0 72 72">
          <Rect x={10} y={16} width={30} height={40} rx={7} fill={c.bg} stroke={c.border} transform="rotate(-12 25 36)" />
          <Rect x={32} y={16} width={30} height={40} rx={7} fill={c.bg} stroke={c.border} transform="rotate(12 47 36)" />
          <Rect x={21} y={12} width={30} height={44} rx={7} fill={c.bg} stroke={c.accent} strokeWidth={1.5} />
          <Circle cx={36} cy={28} r={6} fill={c.accentSoft} stroke={c.accent} strokeWidth={1.2} />
          <Path d="M28 46c2-5 14-5 16 0" stroke={c.accent} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <Path d="M56 8c.5 3 1.8 4.3 4.8 4.8-3 .5-4.3 1.8-4.8 4.8-.5-3-1.8-4.3-4.8-4.8 3-.5 4.3-1.8 4.8-4.8Z" fill={c.accent} />
        </Svg>
      ) : null}
      {way === 'crossed' ? (
        <Svg width={size} height={size} viewBox="0 0 72 72">
          <Path d="M8 58C24 50 34 30 64 14" stroke={c.textSubtle} strokeWidth={1.5} strokeDasharray="3 4" fill="none" strokeLinecap="round" />
          <Path d="M8 16c18 4 32 22 56 40" stroke={c.accent} strokeWidth={1.5} strokeDasharray="3 4" fill="none" strokeLinecap="round" />
          <Circle cx={35} cy={36} r={9} fill={c.bg} stroke={c.accent} strokeWidth={1.5} />
          <Circle cx={35} cy={36} r={3} fill={c.accent} />
          <Circle cx={8} cy={58} r={3} fill={c.textSubtle} />
          <Circle cx={8} cy={16} r={3} fill={c.accent} />
        </Svg>
      ) : null}
      {way === 'live' ? (
        <>
          <Animated.View style={[{ position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: c.accent }, ring]} />
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg, borderWidth: 1, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="audio" size={20} color={c.accent} />
          </View>
        </>
      ) : null}
    </View>
  );
}
