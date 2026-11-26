import { View } from 'react-native';
import { APP } from '@kapara/config';
import { fonts, palette } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

const TILE = palette.grenat;
const LETTER = palette.ivory;
const DOT = palette.grenatRose;

/** App-icon style Z mark, used anywhere the brand needs a compact signature. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const { dark, c } = useTheme();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.224, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center', backgroundColor: TILE,
        // On the aubergine theme a hairline keeps the tile's edge crisp.
        borderWidth: dark ? 1 : 0, borderColor: c.border }}>
      <Text variant="title" allowFontScaling={false} maxFontSizeMultiplier={1}
        style={{ fontFamily: fonts.display, fontSize: size * 0.74, lineHeight: size,
          color: LETTER, textAlign: 'center', marginTop: -size * 0.035, includeFontPadding: false }}>
        Z
      </Text>
      <View pointerEvents="none" style={{ position: 'absolute', width: size * 0.075, height: size * 0.075,
        borderRadius: size, right: size * 0.17, bottom: size * 0.245, backgroundColor: DOT }} />
    </View>
  );
}

/** ZIV wordmark: Fraunces Light capitals with calm, editorial spacing. */
export function Wordmark({ size = 20, header = false }: { size?: number; header?: boolean }) {
  const { c } = useTheme();
  return (
    <Text accessibilityRole={header ? 'header' : 'text'} accessibilityLabel={APP.name}
      allowFontScaling={false} maxFontSizeMultiplier={1} numberOfLines={1}
      style={{ fontFamily: fonts.display, fontSize: size * 1.42, lineHeight: size * 1.6,
        letterSpacing: size * 0.3, color: c.text, includeFontPadding: false }}>
      {APP.name.toUpperCase()}
    </Text>
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
