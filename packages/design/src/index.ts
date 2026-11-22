/**
 * KAPARA design tokens. Platform-agnostic (plain numbers/strings) so the
 * mobile app, a future web app and email templates share one source.
 *
 * Direction "dusk porcelain": a cool porcelain page (not cream), deep
 * indigo ink, a single wine-pomegranate accent and an antique-brass
 * highlight used sparingly. Serif display (Fraunces) for names and titles,
 * Inter for reading. Few borders, hairline separators, soft depth.
 * Every text tone below passes WCAG AA (4.5:1) on `bg` and `surface`.
 */
export const palette = {
  porcelain: '#F5F4F7',
  mistLilac: '#ECEAF1',
  hairline: '#DEDBE5',
  ink: '#1B1928',
  inkSoft: '#474356',
  slate: '#6B6678',
  wine: '#9E2440',
  wineDeep: '#7E1B33',
  wineMist: '#F5E3E8',
  brass: '#7F5A28',
  olive: '#3F6A4A',
  night: '#131220',
  nightRaised: '#1E1C2D',
  white: '#FFFFFF',
  danger: '#B4361C',
} as const;

export const colors = {
  light: {
    bg: palette.porcelain, surface: palette.white, surfaceAlt: palette.mistLilac, border: palette.hairline,
    text: palette.ink, textMuted: palette.inkSoft, textSubtle: palette.slate,
    accent: palette.wine, accentPressed: palette.wineDeep, accentSoft: palette.wineMist,
    highlight: palette.brass, live: palette.olive, danger: palette.danger, onAccent: palette.white,
  },
  dark: {
    bg: palette.night, surface: palette.nightRaised, surfaceAlt: '#29263A', border: '#363249',
    text: '#F3F1F8', textMuted: '#C8C4D4', textSubtle: '#9C97AA',
    accent: '#E0607A', accentPressed: '#C94A65', accentSoft: '#3A1E2A',
    highlight: '#D6AE6E', live: '#86BE92', danger: '#F0845F', onAccent: '#1B1928',
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
  /** Small section label. Sentence case on purpose: tracked capitals were hard to read at 11 px. */
  overline: { fontFamily: fonts.bodySemibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

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
  card: { shadowColor: '#1B1928', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  float: { shadowColor: '#1B1928', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
} as const;
