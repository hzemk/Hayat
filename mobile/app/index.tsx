import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@stores/auth';
import { AppColors, useTheme } from '@theme/index';

// Dev-only escape hatch: when set, every cold start clears the persisted
// session so the QR-scan demo always lands on the login screen instead of
// resuming the previous user. Off in production.
const ALWAYS_LOGIN = process.env.EXPO_PUBLIC_ALWAYS_LOGIN === '1';

export default function Gate() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const logout = useAuthStore((s) => s.logout);
  const cleared = useRef(false);
  const { colors } = useTheme();
  const styles = useStyles(colors);

  useEffect(() => {
    if (ALWAYS_LOGIN && isHydrated && user && !cleared.current) {
      cleared.current = true;
      void logout();
    }
  }, [isHydrated, user, logout]);

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === 'DOCTOR') return <Redirect href="/(doctor)" />;
  if (user.role === 'HOSPITAL_ADMIN') return <Redirect href="/(hospital)" />;
  return <Redirect href="/(tabs)" />;
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.raised,
      },
    }), [colors]);
}
