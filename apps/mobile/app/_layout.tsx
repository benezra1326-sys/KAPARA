import '../src/storage-rename';
import '../src/i18n';
import { useFonts } from 'expo-font';
// Typography: Fraunces (the logo's face) for titles, Inter for text; Hebrew: Frank Ruhl Libre and Heebo.
// Subpath imports so only these weights are bundled.
import { Fraunces_300Light } from '@expo-google-fonts/fraunces/300Light';
import { Fraunces_300Light_Italic } from '@expo-google-fonts/fraunces/300Light_Italic';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { FrankRuhlLibre_400Regular } from '@expo-google-fonts/frank-ruhl-libre/400Regular';
import { FrankRuhlLibre_500Medium } from '@expo-google-fonts/frank-ruhl-libre/500Medium';
import { Heebo_400Regular } from '@expo-google-fonts/heebo/400Regular';
import { Heebo_500Medium } from '@expo-google-fonts/heebo/500Medium';
import { Heebo_600SemiBold } from '@expo-google-fonts/heebo/600SemiBold';
import { isHebrew } from '../src/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { palette } from '@kapara/design';
import { LiveProvider } from '../src/live/LiveProvider';
import { ThemeProvider, useTheme } from '../src/theme';
import { useLayout } from '../src/ui/layout';
import { CONFIG_BLOCKED } from '../src/env';
import { ConfigError } from '../src/ui/EnvBadge';

void SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } });

export default function RootLayout() {
  // Hebrew faces are only loaded when the app is in Hebrew.
  const [loaded, error] = useFonts({ Fraunces_300Light, Fraunces_300Light_Italic, Fraunces_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    ...(isHebrew ? { FrankRuhlLibre_400Regular, FrankRuhlLibre_500Medium, Heebo_400Regular, Heebo_500Medium, Heebo_600SemiBold } : {}) });
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Root />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const { c, dark } = useTheme();
  const { isPhone } = useLayout();
  const full = { backgroundColor: c.bg };
  // Pages outside the tabs (conversation, settings, onboarding…) keep a
  // readable column on tablets and desktops instead of spanning the window.
  const column = isPhone ? full : { backgroundColor: c.bg, width: '100%' as const, maxWidth: 760, alignSelf: 'center' as const };
  // Profiles (photos + words side by side) get a wider column.
  const wide = isPhone ? full : { ...column, maxWidth: 1080 };
  // Navigation surfaces (behind narrow columns on a desktop) take the page colour, never a default grey.
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: c.bg, card: c.bg, border: c.border, text: c.text, primary: c.accent } };
  if (CONFIG_BLOCKED) return <ConfigError />;
  return (
    <NavThemeProvider value={navTheme}>
    <LiveProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: column }}>
        <Stack.Screen name="(tabs)" options={{ contentStyle: full }} />
        {/* Welcome has its own desktop layout; the steps inside keep a readable column. */}
        <Stack.Screen name="onboarding" options={{ contentStyle: full }} />
        <Stack.Screen name="profile/[id]" options={{ presentation: 'modal', contentStyle: wide }} />
        <Stack.Screen name="profile/preview" options={{ contentStyle: wide }} />
        <Stack.Screen name="admin/index" options={{ contentStyle: wide }} />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/live" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal', contentStyle: { backgroundColor: palette.night } }} />
        <Stack.Screen name="call/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false, contentStyle: full }} />
      </Stack>
    </LiveProvider>
    </NavThemeProvider>
  );
}
