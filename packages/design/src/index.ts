/**
 * MOTEK design tokens. Platform-agnostic (plain numbers/strings) so the
 * mobile app, a future web app and email templates share one source.
 *
 * Direction "Grenat" (23/11, Avishay's brief): MOTEK's own identity —
 * intimate, editorial, warm, contemporary. One signature colour, a deep
 * garnet, shared by both themes: the main action, the active tab, the
 * reasons of a suggestion. Light theme "Ivoire" (warm ivory paper, ink with
 * a touch of aubergine); dark theme "Aubergine" (deep plum, ivory type).
 * Photos carry the rest of the colour. Titles in Fraunces (the logo's face),
 * text and controls in Inter; Hebrew gets Frank Ruhl Libre and Heebo.
 * Every text tone passes WCAG AA (4.5:1) on `bg`, `surface` and `surfaceAlt`
 * (checked: docs/design-system.md).
 */
export const palette = {
  /** The signature: deep garnet. Ivory on it = 9.5:1. */
  grenat: '#7A1E36',
  grenatPressed: '#64172C',
  /** Garnet lifted for fills on the aubergine theme (ivory on it = 7.6:1). */
  grenatLift: '#93284A',
  /** Garnet as text on aubergine (8.8:1 on surface). */
  grenatRose: '#EDA9BA',
  /** Garnet tint behind chips and selected rows. */
  grenatMist: '#F3E1E3',
  grenatNight: '#3A1A28',
  // Ivoire (light)
  ivory: '#FBF7F0',
  linen: '#F4EDE3',
  parchment: '#EBE2D5',
  sandLine: '#E2D7C7',
  ink: '#22161C',
  inkSoft: '#56464E',
  inkFaint: '#6E5D65',
  // Aubergine (dark)
  aubergine: '#1A1118',
  plum: '#251923',
  plumHigh: '#30222D',
  plumLine: '#432F3D',
  cream: '#F6EEE6',
  creamSoft: '#D3C4CA',
  mauve: '#AD99A4',
  // Status
  green: '#1E6B45',
  greenSoft: '#86D3A4',
  red: '#B42318',
  redSoft: '#FF8A7A',
  white: '#FFFFFF',
  /** Calls stay dark whatever the theme (video first): aubergine black. */
  night: '#120B10',
} as const;

export const colors = {
  /** "Ivoire": warm ivory paper, aubergine ink, garnet for what matters. */
  light: {
    bg: palette.ivory, surface: palette.linen, surfaceAlt: palette.parchment, border: palette.sandLine,
    text: palette.ink, textMuted: palette.inkSoft, textSubtle: palette.inkFaint,
    /** Actions toward a person (react) and garnet text. */
    accent: palette.grenat, accentPressed: palette.grenatPressed, accentSoft: palette.grenatMist,
    /** The one main action of a screen: garnet pill, ivory label. */
    primary: palette.grenat, primaryPressed: palette.grenatPressed, onPrimary: palette.ivory,
    highlight: palette.grenat, live: palette.green, danger: palette.red, onAccent: palette.ivory,
  },
  /** "Aubergine": deep plum for the evening, the same garnet signature. */
  dark: {
    bg: palette.aubergine, surface: palette.plum, surfaceAlt: palette.plumHigh, border: palette.plumLine,
    text: palette.cream, textMuted: palette.creamSoft, textSubtle: palette.mauve,
    accent: palette.grenatRose, accentPressed: '#F5C4D0', accentSoft: palette.grenatNight,
    primary: palette.grenatLift, primaryPressed: palette.grenat, onPrimary: palette.cream,
    highlight: palette.grenatRose, live: palette.greenSoft, danger: palette.redSoft, onAccent: palette.aubergine,
  },
} as const;
export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.light]: string };
/** Ivory by default; members can switch to aubergine in Moi. */
export const DEFAULT_SCHEME: ColorScheme = 'light';

export const fonts = {
  display: 'Fraunces_300Light',
  displayItalic: 'Fraunces_300Light_Italic',
  displayRegular: 'Fraunces_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

/**
 * Hebrew: Fraunces and Inter have no Hebrew glyphs. In Hebrew the app swaps
 * each family for its counterpart (editorial serif, then a clear sans).
 */
export const hebrewFonts: Record<string, string> = {
  Fraunces_300Light: 'FrankRuhlLibre_400Regular',
  Fraunces_300Light_Italic: 'FrankRuhlLibre_400Regular',
  Fraunces_400Regular: 'FrankRuhlLibre_500Medium',
  Inter_400Regular: 'Heebo_400Regular',
  Inter_500Medium: 'Heebo_500Medium',
  Inter_600SemiBold: 'Heebo_600SemiBold',
};

/**
 * Type scale (pt). Components must allow Dynamic Type / font scaling.
 * Editorial contrast: large light serif for names and titles, regular serif
 * for section headings, a readable 16 pt sans for everything you read or press.
 */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 42, lineHeight: 46, letterSpacing: -0.9 },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.7 },
  heading: { fontFamily: fonts.displayRegular, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  /** A member's own words (answers to questions): serif, generous. */
  quote: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, letterSpacing: -0.15 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24, letterSpacing: -0.15 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, letterSpacing: -0.05 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  /** Small section label in capitals, lightly tracked. */
  overline: { fontFamily: fonts.bodySemibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' as const },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
/** Soft, not bubbly: cards 20, controls pill-shaped. */
export const radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;

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
  card: { shadowColor: '#22161C', shadowOpacity: 0.07, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  float: { shadowColor: '#22161C', shadowOpacity: 0.14, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
} as const;
