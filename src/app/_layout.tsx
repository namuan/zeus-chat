import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SplashOverlay } from '@/components/SplashOverlay';
import { useTheme } from '@/hooks/useTheme';
import { initDb } from '@/lib/sqlite';
import { purgeOldDeletedChats } from '@/features/chat/chat.service';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already preventing */
});

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  // Hide the native splash once our custom overlay is mounted
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Initialise the database and purge expired trash.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDb();
        // Auto-clean soft-deleted chats older than 14 days.
        purgeOldDeletedChats(14).catch((e) => console.warn('[purge] failed', e));
      } catch (e) {
        console.warn('[db] init failed', e);
      } finally {
        if (!cancelled) {
          setDbReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOverlayFinish = useCallback(() => {
    setShowOverlay(false);
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
              <Stack.Screen
                name="settings/recently-deleted"
                options={{
                  headerShown: true,
                  headerTitle: 'Recently Deleted',
                  headerBackTitle: 'Settings',
                  headerTintColor: colors.text,
                  headerTitleStyle: { color: colors.text },
                  headerStyle: { backgroundColor: colors.background },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen name="onboarding/api-key" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
          </ErrorBoundary>

          {showOverlay && (
            <SplashOverlay
              ready={dbReady}
              onFinish={handleOverlayFinish}
            />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
