import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { hebrewFonts, type } from '@kapara/design';
import { isHebrew } from '../i18n';
import { useTheme } from '../theme';

type Variant = keyof typeof type;
type Tone = 'text' | 'textMuted' | 'textSubtle' | 'accent' | 'onAccent' | 'highlight' | 'live' | 'danger';

/** Hebrew has no glyphs in Fraunces/Inter: swap each family for its Hebrew counterpart. */
export const fontFor = (family?: string) => (isHebrew && family ? hebrewFonts[family] ?? family : family);

/**
 * All text in the app. Variants come from the type scale; tones from the
 * theme. Long text and right-to-left scripts flow naturally
 * (writingDirection auto). In Hebrew, capitals tracking is dropped.
 */
export function Text({ variant = 'body', tone = 'text', style, ...rest }: TextProps & { variant?: Variant; tone?: Tone }) {
  const { c } = useTheme();
  let s = StyleSheet.flatten([type[variant], { color: c[tone], writingDirection: 'auto' }, style]) as TextStyle;
  if (isHebrew) s = { ...s, fontFamily: fontFor(s.fontFamily), letterSpacing: variant === 'overline' ? 0 : s.letterSpacing };
  return <RNText maxFontSizeMultiplier={variant === 'hero' || variant === 'title' ? 1.4 : 2} style={s} {...rest} />;
}
