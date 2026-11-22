import { useWindowDimensions } from 'react-native';
import { breakpoints, layout } from '@kapara/design';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';
export type PageWidth = 'readable' | 'wide';

/**
 * One place for responsive decisions. Driven by the window width (never by
 * the device type): a narrow desktop window gets the phone layout, an iPad
 * in landscape the desktop one.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const bp: Breakpoint = width >= breakpoints.desktop ? 'desktop' : width >= breakpoints.tablet ? 'tablet' : 'phone';
  const gutter = layout.gutter[bp];
  /** Width available to a page's content column, sidebar and gutters removed. */
  const contentWidth = (page: PageWidth = 'readable') =>
    Math.min(layout[page], width - (bp === 'desktop' ? layout.sidebar : 0) - gutter * 2);
  return { width, height, bp, isPhone: bp === 'phone', isDesktop: bp === 'desktop', gutter, contentWidth };
}

/** Number of grid columns for cards of a minimum width inside a given width. */
export const columnsFor = (available: number, minCard: number, max = 4) => Math.max(1, Math.min(max, Math.floor(available / minCard)));
