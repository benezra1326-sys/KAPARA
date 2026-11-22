/**
 * MOTEK design tokens. Platform-agnostic (plain numbers/strings) so the
 * mobile app, a future web app and email templates share one source.
 *
 * Direction "Blanc": clean and bright like a members' club in daylight.
 * True white pages, crisp near-black type, black pill for the main action,
 * and one vivid accent, "motek" rose, for what is about people: hearts,
 * reactions, the active tab, live presence. No beige, no brown.
 * Titles in Instrument Serif (fine, editorial), text in DM Sans (light,
 * friendly). A dark mode with the same accent is one tap away in Moi.
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
  rose: '#E0245E',
  roseDeep: '#C01A4F',
  roseMist: '#FDE8EF',
  violet: '#5B4BDB',
  green: '#16A34A',
  red: '#D92D20',
  // Dark mode
  black: '#0A0A0C',
  coal: '#151518',
  coalHigh: '#1F1F24',
  coalLine: '#2C2C33',
  cloud: '#F5F5F7',
  cloudSoft: '#B8B8C2',
  fog: '#8E8E99',
  roseBright: '#FF4F84',
  /** Calls stay dark whatever the theme (video first). */
  night: '#0A0A0C',
} as const;

export const colors = {
  light: {
    bg: palette.white, surface: palette.snow, surfaceAlt: palette.mist, border: palette.line,
    text: palette.ink, textMuted: palette.graphite, textSubtle: palette.steel,
    accent: palette.rose, accentPressed: palette.roseDeep, accentSoft: palette.roseMist,
    /** The main action: black pill on white. */
    primary: palette.ink, primaryPressed: '#2A2A33', onPrimary: palette.white,
    highlight: palette.rose, live: palette.green, danger: palette.red, onAccent: palette.white,
  },
  dark: {
    bg: palette.black, surface: palette.coal, surfaceAlt: palette.coalHigh, border: palette.coalLine,
    text: palette.cloud, textMuted: palette.cloudSoft, textSubtle: palette.fog,
    accent: palette.roseBright, accentPressed: '#E8336D', accentSoft: '#3A1424',
    primary: palette.cloud, primaryPressed: '#DADADF', onPrimary: palette.black,
    highlight: palette.roseBright, live: '#4ADE80', danger: '#FF6B5E', onAccent: palette.black,
  },
} as const;
export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.light]: string };
/** White by default; members can switch to dark in Moi. */
export const DEFAULT_SCHEME: ColorScheme = 'light';

export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  displayRegular: 'InstrumentSerif_400Regular',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemibold: 'DMSans_600SemiBold',
} as const;

/** Type scale (pt). Components must allow Dynamic Type / font scaling. */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 46, lineHeight: 50, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.display, fontSize: 25, lineHeight: 30 },
  quote: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  /** Section label: small tracked capitals. */
  overline: { fontFamily: fonts.bodyMedium, fontSize: 11.5, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase' as const },
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
