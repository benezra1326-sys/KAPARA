/**
 * KAPARA design tokens. Platform-agnostic (plain numbers/strings) so the
 * mobile app, a future web app and email templates share one source.
 *
 * Direction: "candlelight editorial" — warm ivory paper, deep ink,
 * pomegranate accent, a touch of brass. Serif display for intimacy,
 * clean sans for reading. Generous space, few borders, soft depth.
 */
export const palette = {
  ivory: '#FBF7F1',
  sand: '#F2EAE0',
  linen: '#E7DCCD',
  ink: '#1E1A24',
  inkSoft: '#4A4352',
  mist: '#8C8496',
  pomegranate: '#B23A48',
  pomegranateDeep: '#8E2433',
  blush: '#F4D9D6',
  brass: '#B88B4A',
  olive: '#5F7A61',
  night: '#141118',
  nightRaised: '#211C27',
  white: '#FFFFFF',
  danger: '#C2410C',
} as const;

export const colors = {
  light: {
    bg: palette.ivory, surface: palette.white, surfaceAlt: palette.sand, border: palette.linen,
    text: palette.ink, textMuted: palette.inkSoft, textSubtle: palette.mist,
    accent: palette.pomegranate, accentPressed: palette.pomegranateDeep, accentSoft: palette.blush,
    highlight: palette.brass, live: palette.olive, danger: palette.danger, onAccent: palette.white,
  },
  dark: {
    bg: palette.night, surface: palette.nightRaised, surfaceAlt: '#2A2431', border: '#3A3342',
    text: '#F5EFE8', textMuted: '#C9C0D0', textSubtle: '#8F8799',
    accent: '#D9596A', accentPressed: palette.pomegranate, accentSoft: '#3D2329',
    highlight: '#D4A866', live: '#8DB28F', danger: '#F97316', onAccent: palette.white,
  },
} as const;
export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.light]: string };

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

/** Type scale (pt). Components must allow Dynamic Type / font scaling. */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27 },
  quote: { fontFamily: fonts.displayItalic, fontSize: 19, lineHeight: 27 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bodySemibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' as const },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 22, xl: 32, pill: 999 } as const;
export const motion = {
  fast: 150, base: 240, slow: 420,
  spring: { damping: 18, stiffness: 180, mass: 1 },
} as const;
/** Minimum hit target (iOS HIG 44pt, Material 48dp). */
export const hitSlop = 48;

export const shadow = {
  card: { shadowColor: '#2B1A22', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  float: { shadowColor: '#2B1A22', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
} as const;
