import { createContext, useContext, type ReactNode } from 'react';
import { colors, DEFAULT_SCHEME, type ThemeColors } from '@kapara/design';

const ThemeCtx = createContext<{ c: ThemeColors; dark: boolean }>({ c: colors[DEFAULT_SCHEME], dark: DEFAULT_SCHEME === 'dark' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // MOTEK is dark first (identity "Nuit"); a light mode can come later as a setting.
  const dark = DEFAULT_SCHEME === 'dark';
  return <ThemeCtx.Provider value={{ c: dark ? colors.dark : colors.light, dark }}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);
