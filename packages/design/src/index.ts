/**
 * MOTEK design tokens. Platform-agnostic (plain numbers/strings) so the
 * mobile app, a future web app and email templates share one source.
 *
 * Direction "Nuit" (from the logo): a members' club at night. Near-black
 * ink pages, warm porcelain type, one champagne-brass accent used for the
 * single main action, photos full bleed. Light Fraunces for names and
 * titles (editorial, quiet luxury), Inter for reading, tracked small caps
 * for section labels. Few borders, hairlines only, no loud colour.
 * Every text tone passes WCAG AA (4.5:1) on `bg` and `surface`.
 */
export const palette = {
  night: '#0D0C12',
  nightRaised: '#16141D',
  nightHigh: '#1F1C28',
  nightLine: '#2B2835',
  porcelain: '#F4F1EA',
  porcelainSoft: '#BDB7C4',
  dusk: '#938DA0',
  champagne: '#D2B07A',
  champagnePressed: '#BC9862',
  champagneMist: '#2A2419',
  rose: '#E58C9A',
  sage: '#8FC09B',
  ember: '#EE8A6A',
  // Light theme (kept for a later light mode and for e-mails).
  paper: '#F6F3EE', paperAlt: '#ECE7DF', paperLine: '#DDD6CB', ink: '#16141D', inkSoft: '#4A4553', slate: '#6E6875', brass: '#7F5A28',
  white: '#FFFFFF',
} as const;

export const colors = {
  dark: {
    bg: palette.night, surface: palette.nightRaised, surfaceAlt: palette.nightHigh, border: palette.nightLine,
    text: palette.porcelain, textMuted: palette.porcelainSoft, textSubtle: palette.dusk,
    accent: palette.champagne, accentPressed: palette.champagnePressed, accentSoft: palette.champagneMist,
    highlight: palette.champagne, live: palette.sage, danger: palette.ember, onAccent: palette.night,
  },
  light: {
    bg: palette.paper, surface: palette.white, surfaceAlt: palette.paperAlt, border: palette.paperLine,
    text: palette.ink, textMuted: palette.inkSoft, textSubtle: palette.slate,
    accent: palette.ink, accentPressed: '#000000', accentSoft: palette.paperAlt,
    highlight: palette.brass, live: '#3F6A4A', danger: '#B4361C', onAccent: palette.porcelain,
  },
} as const;
export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.dark]: string };
/** MOTEK is dark first, like a private members' app. */
export const DEFAULT_SCHEME: ColorScheme = 'dark';

export const fonts = {
  display: 'Fraunces_300Light',
  displayItalic: 'Fraunces_300Light_Italic',
  displayRegular: 'Fraunces_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

/** Type scale (pt). Components must allow Dynamic Type / font scaling. */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.displayRegular, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  quote: { fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 30 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  /** Section label: tracked small capitals, 12 px, high-contrast tone only. */
  overline: { fontFamily: fonts.bodySemibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, textTransform: 'uppercase' as const },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 } as const;

/**
 * Responsive layout. The web demo is a real web app: phones get one column
 * and a bottom bar, tablets more air, desktops a sidebar and readable widths.
 */
export const breakpoints = { tablet: 640, desktop: 1024 } as const;
export const layout = {
  /** Max width of reading content (forms, lists, settings). */
  readable: 680,
  /** Max width of richer pages (profile with photo column, grids). */
  wide: 1080,
  /** Desktop sidebar width. */
  sidebar: 248,
  /** Horizontal page gutter per breakpoint. */
  gutter: { phone: 16, tablet: 28, desktop: 40 },
} as const;
export const motion = {
  /** One motion language (calm, eased, no overshoot): 160 / 240 / 400 ms. */
  fast: 160, base: 240, slow: 400,
  spring: { damping: 18, stiffness: 180, mass: 1 },
} as const;
/** Minimum hit target (iOS HIG 44pt, Material 48dp). */
export const hitSlop = 48;

export const shadow = {
  card: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  float: { shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 32, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
} as const;
