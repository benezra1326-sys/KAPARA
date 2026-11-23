/**
 * MOTEK design tokens. Platform-agnostic (plain numbers/strings) so the
 * mobile app, a future web app and email templates share one source.
 *
 * Direction "Club" (23/11, after Raya): a private members' club. Almost
 * monochrome: true white pages, near-black ink for type, actions and
 * hearts, hairline borders, and one discreet brass note (the dot of the
 * logo) for small details. Photos carry the colour, not the interface.
 * Titles in light Fraunces (the logo's face), text in Inter, small and
 * precise; section labels in widely tracked capitals.
 * "Noir" (black and sand) is one tap away in Moi.
 * Every text tone passes WCAG AA (4.5:1) on `bg` and `surface`.
 */
export const palette = {
  white: '#FFFFFF',
  snow: '#F6F6F8',
  mist: '#EEEEF2',
  line: '#E6E6EB',
  ink: '#0E0E12',
  graphite: '#4A4A55',
  steel: '#6B6B76',
  /** Brass, from the logo's dot, darkened so text passes AA on white. */
  brass: '#86662F',
  brassLight: '#D6AE6E',
  rose: '#E0245E',
  roseDeep: '#C01A4F',
  roseMist: '#FDE8EF',
  violet: '#5B4BDB',
  green: '#16A34A',
  red: '#D92D20',
  // Noir (dark mode): black and sand
  black: '#0A0A0A',
  coal: '#151515',
  coalHigh: '#1E1E1E',
  coalLine: '#2A2A2A',
  cream: '#F4EFE6',
  creamSoft: '#BFB7AA',
  dune: '#928A7D',
  sand: '#D9C4A0',
  sandPressed: '#C6AF88',
  sandMist: '#29241C',
  /** Calls stay dark whatever the theme (video first). */
  night: '#0A0A0C',
} as const;

export const colors = {
  light: {
    bg: palette.white, surface: palette.snow, surfaceAlt: palette.mist, border: palette.line,
    text: palette.ink, textMuted: palette.graphite, textSubtle: palette.steel,
    /** Monochrome: actions toward people are ink too, never a loud colour. */
    accent: palette.ink, accentPressed: '#2A2A33', accentSoft: palette.snow,
    /** The main action: black pill on white. */
    primary: palette.ink, primaryPressed: '#2A2A33', onPrimary: palette.white,
    highlight: palette.brass, live: palette.green, danger: palette.red, onAccent: palette.white,
  },
  /** "Noir": true black and warm sand, quiet luxury for the evening. */
  dark: {
    bg: palette.black, surface: palette.coal, surfaceAlt: palette.coalHigh, border: palette.coalLine,
    text: palette.cream, textMuted: palette.creamSoft, textSubtle: palette.dune,
    accent: palette.sand, accentPressed: palette.sandPressed, accentSoft: palette.sandMist,
    primary: palette.sand, primaryPressed: palette.sandPressed, onPrimary: palette.black,
    highlight: palette.sand, live: '#7FCF9A', danger: '#FF7A6B', onAccent: palette.black,
  },
} as const;
export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.light]: string };
/** White by default; members can switch to dark in Moi. */
export const DEFAULT_SCHEME: ColorScheme = 'light';

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
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.display, fontSize: 23, lineHeight: 29, letterSpacing: -0.3 },
  quote: { fontFamily: fonts.display, fontSize: 24, lineHeight: 31, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 15.5, lineHeight: 23, letterSpacing: -0.1 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13.5, lineHeight: 19, letterSpacing: -0.05 },
  caption: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17 },
  /** Section label: small, widely tracked capitals (members' club signage). */
  overline: { fontFamily: fonts.bodyMedium, fontSize: 10.5, lineHeight: 15, letterSpacing: 2, textTransform: 'uppercase' as const },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

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
  card: { shadowColor: '#0E0E12', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  float: { shadowColor: '#0E0E12', shadowOpacity: 0.16, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
} as const;
