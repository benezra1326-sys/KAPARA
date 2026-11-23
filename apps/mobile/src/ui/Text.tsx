import { Text as RNText, type TextProps } from 'react-native';
import { type } from '@kapara/design';
import { useTheme } from '../theme';

type Variant = keyof typeof type;
type Tone = 'text' | 'textMuted' | 'textSubtle' | 'accent' | 'onAccent' | 'highlight' | 'live' | 'danger';

export function Text({ variant = 'body', tone = 'text', style, ...rest }: TextProps & { variant?: Variant; tone?: Tone }) {
  const { c } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={variant === 'hero' || variant === 'title' ? 1.4 : 2}
      style={[type[variant], { color: c[tone], writingDirection: 'auto' }, style]}
      {...rest}
    />
  );
}
