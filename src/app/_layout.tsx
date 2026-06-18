import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTheme } from '@/hooks/useTheme';
import { initDb } from '@/lib/sqlite';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already preventing */
});

export default function RootLayout() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    let ready = false;
    (async () => {
      try {
        await initDb();
      } catch (e) {
        console.warn('[db] init failed', e);
      } finally {
        ready = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      void ready;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <ErrorBoundary>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[id]"
                options={{
                  headerShown: true,
                  headerBackTitle: 'Chats',
                  headerTintColor: colors.text,
                  headerTitleStyle: { color: colors.text },
                  headerStyle: { backgroundColor: colors.background },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen name="chat/new" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/api-key" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
