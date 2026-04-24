import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import '@i18n/index';
import i18n from '@i18n/index';
import { queryClient } from '@services/queryClient';
import { useAuthStore } from '@stores/auth';
import { useQuitSmokingStore } from '@stores/quitSmoking';
import { ThemeProvider, useTheme } from '@theme/index';
import { ErrorBoundary } from '@components/ErrorBoundary';

// Force every cold start to land on the Gate (`app/index.tsx`), so a stale
// dev-client route like `/chat` can't trap the user on launch.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateQuit = useQuitSmokingStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateQuit();
  }, [hydrate, hydrateQuit]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as
        | { type?: string; doctorId?: string; reminderId?: string }
        | undefined;
      if (!data) return;
      if (data.type === 'doctor-thread' && data.doctorId) {
        router.push(`/doctors/chat/${data.doctorId}`);
      } else if (data.type === 'doctor-thread') {
        router.push('/messages');
      } else if (data.reminderId) {
        router.push('/(tabs)/reminders');
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <ErrorBoundary>
                <ThemedShell />
              </ErrorBoundary>
            </ThemeProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedShell() {
  const { isDark, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface.raised },
          headerStyle: { backgroundColor: colors.surface.base },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { color: colors.text.primary },
        }}
      >
        <Stack.Screen name="chat" />
        <Stack.Screen name="emergency" options={{ headerShown: true, title: '' }} />
      </Stack>
    </View>
  );
}
