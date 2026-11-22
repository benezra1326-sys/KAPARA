import '../src/i18n';
import { useFonts, Fraunces_400Regular_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LiveProvider } from '../src/live/LiveProvider';
import { ThemeProvider, useTheme } from '../src/theme';

void SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } });

export default function RootLayout() {
  const [loaded, error] = useFonts({ Fraunces_400Regular_Italic, Fraunces_600SemiBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
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
  return (
    <LiveProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/live" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="call/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </LiveProvider>
  );
}
