import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { APP } from '@kapara/config';
import { fonts } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';
import { BRAND_NAME, MARK, WORDMARK } from './brandPaths';

/**
 * Brand logo "Nuit": the initial in light Fraunces on the night colour with
 * one brass dot, and the name in the same light Fraunces, tracked capitals.
 * Same drawings as assets/brand/*.svg: regenerate both with assets/brand/generate.py.
 */
const NIGHT = '#131220';
const PORCELAIN = '#F5F4F7';
const BRASS = '#D6AE6E';

/** App-icon style mark (rounded square). Decorative: the wordmark or a label carries the name. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const { dark, c } = useTheme();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.224, overflow: 'hidden',
        // On the dark theme the night square would vanish into the page: give it a hairline.
        borderWidth: dark ? 1 : 0, borderColor: c.border }}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Rect width={1024} height={1024} fill={NIGHT} />
        <Path d={MARK.d} fill={PORCELAIN} />
        <Circle cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} fill={BRASS} />
      </Svg>
    </View>
  );
}

/**
 * The name as a wordmark: light Fraunces capitals, drawn as a path (brandPaths.ts,
 * generated from brand.json). `size` is the cap height. If the app was renamed
 * without regenerating, falls back to the display font so the right name shows.
 */
export function Wordmark({ size = 20, header = false }: { size?: number; header?: boolean }) {
  const { c } = useTheme();
  const role = header ? 'header' : 'text';
  if (BRAND_NAME !== APP.name) {
    return <Text accessibilityRole={role} style={{ fontFamily: fonts.display, fontSize: size * 1.4, letterSpacing: size * 0.3, color: c.text }}>{APP.name.toUpperCase()}</Text>;
  }
  return (
    <View accessible accessibilityRole={role} accessibilityLabel={APP.name}>
      <Svg width={(size * WORDMARK.width) / WORDMARK.height} height={size} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}>
        <Path d={WORDMARK.d} fill={c.text} />
      </Svg>
    </View>
  );
}

/** Mark + wordmark, side by side. */
export function Logo({ size = 40, header = false }: { size?: number; header?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.35 }}>
      <BrandMark size={size} />
      <Wordmark size={size * 0.34} header={header} />
    </View>
  );
}
