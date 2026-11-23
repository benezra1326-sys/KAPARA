import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { APP } from '@kapara/config';
import { fonts, palette } from '@kapara/design';
import { isHebrew } from '../i18n';
import { useTheme } from '../theme';
import { Text } from './Text';
import { BRAND_NAME, MARK, WORDMARK } from './brandPaths';

/**
 * Brand logo: the initial in light Fraunces, ivory on the MOTEK garnet, with
 * one soft rosé dot; the name in the same light Fraunces, tracked capitals.
 * Same letter drawings as assets/brand/*.svg (regenerate with
 * assets/brand/generate.py); colours come from the design tokens.
 * In Hebrew the name is also written מותק under the wordmark.
 */
const TILE = palette.grenat;
const LETTER = palette.ivory;
const DOT = palette.grenatRose;

/** App-icon style mark (rounded square). Decorative: the wordmark or a label carries the name. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const { dark, c } = useTheme();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.224, overflow: 'hidden',
        // On the aubergine theme a hairline keeps the tile's edge crisp.
        borderWidth: dark ? 1 : 0, borderColor: c.border }}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Rect width={1024} height={1024} fill={TILE} />
        <Path d={MARK.d} fill={LETTER} />
        <Circle cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} fill={DOT} />
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
    <View accessible accessibilityRole={role} accessibilityLabel={APP.name} style={{ alignItems: 'center' }}>
      <Svg width={(size * WORDMARK.width) / WORDMARK.height} height={size} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}>
        <Path d={WORDMARK.d} fill={c.text} />
      </Svg>
      {isHebrew ? <Text style={{ fontFamily: fonts.displayRegular, fontSize: size * 0.95, lineHeight: size * 1.3, color: c.accent, marginTop: size * 0.2 }}>מותק</Text> : null}
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
