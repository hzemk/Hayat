import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import '@i18n/index';
import i18n from '@i18n/index';
import { queryClient } from '@services/queryClient';
import { useAuthStore } from '@stores/auth';
import { ThemeProvider, useTheme } from '@theme/index';

// Force every cold start to land on the Gate (`app/index.tsx`), so a stale
// dev-client route like `/chat` can't trap the user on launch.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <ThemedShell />
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
