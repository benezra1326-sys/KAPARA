import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ThemeColors } from '@kapara/design';

const ThemeCtx = createContext<{ c: ThemeColors; dark: boolean }>({ c: colors.light, dark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const dark = useColorScheme() === 'dark';
  return <ThemeCtx.Provider value={{ c: dark ? colors.dark : colors.light, dark }}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);
