import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { APP } from '@kapara/config';
import { fonts } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

/**
 * Brand logo "Nuit": the initial in light Fraunces on the night colour with
 * one brass dot (same drawing as assets/brand/icon.svg, regenerate both with
 * assets/brand/generate.py), and the name in tracked Inter capitals.
 */
const NIGHT = '#131220';
const PORCELAIN = '#F5F4F7';
const BRASS = '#D6AE6E';
const MARK_PATH = 'M509.4 630.4 492.6 642.5 619.7 330Q622.5 322.4 627 319.2Q631.5 316 639.3 316H691.7Q697 316 699.8 317.8Q702.6 319.6 702.6 323.3Q702.6 325.8 700.6 327.9Q698.7 330 692.8 331.1L674.9 335Q664.5 337.6 660.7 342.7Q656.9 347.9 657.8 360.8L682.4 670.5Q683 679.4 686.9 683.1Q690.8 686.7 700.6 689L718 692.9Q723.3 694 725.4 696Q727.5 697.9 727.5 700.4Q727.5 703.8 724.8 705.9Q722.2 708 716.6 708H604Q598.7 708 595.9 706Q593.1 704.1 593.1 700.7Q593.1 697.9 595.2 696.1Q597.3 694.3 602.9 692.9L620.3 689Q631.5 686.4 635.4 682.5Q639.3 678.6 638.7 670.8L613.3 360.2L629.2 360L502.9 671.6Q500.4 678 497.8 680.1Q495.1 682.2 491.7 682.2Q489.2 682.2 487.1 681.4Q485 680.6 483.2 678.2Q481.4 675.8 479.4 671.3L352 365.8L367.7 354.1L340.5 664.3Q339.4 675 344.5 680Q349.5 685 360.7 688.4L380.3 693.2Q384.5 694.6 386.9 696.1Q389.3 697.6 389.3 700.7Q389.3 703.8 386.5 705.9Q383.7 708 378.1 708H283.7Q278.1 708 275.3 706Q272.5 704.1 272.5 700.7Q272.5 697.4 275.3 695.5Q278.1 693.7 282.9 692.6L299.4 687.8Q309.7 685.6 314.5 680.3Q319.3 675 320.4 664.3L347.5 357.4Q348.4 348.2 343.9 342.7Q339.4 337.3 329.1 335.3L312.5 332.2Q306.7 330.8 304.1 328.9Q301.6 326.9 301.6 323.6Q301.6 316 313.4 316H364.6Q371.9 316 376.4 318.5Q380.9 321 383.7 328.6Z';

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
        <Path d={MARK_PATH} fill={PORCELAIN} />
        <Circle cx={771.5} cy={690} r={18} fill={BRASS} />
      </Svg>
    </View>
  );
}

/** The name as a wordmark. Uses APP.name so a rename never needs a new logo file. */
export function Wordmark({ size = 20, header = false }: { size?: number; header?: boolean }) {
  const { c } = useTheme();
  return (
    <Text accessibilityRole={header ? 'header' : 'text'} accessibilityLabel={APP.name} maxFontSizeMultiplier={1.4}
      style={{ fontFamily: fonts.bodyMedium, fontSize: size, lineHeight: size * 1.25, letterSpacing: size * 0.42, color: c.text,
        // Tracking adds space after the last letter: pull it back so the word stays optically centred.
        marginRight: -size * 0.42 }}>
      {APP.name.toUpperCase()}
    </Text>
  );
}

/** Mark + wordmark, side by side. */
export function Logo({ size = 40, header = false }: { size?: number; header?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.35 }}>
      <BrandMark size={size} />
      <Wordmark size={size * 0.42} header={header} />
    </View>
  );
}
