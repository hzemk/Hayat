import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@stores/auth';
import { AppColors, useTheme } from '@theme/index';

export default function Gate() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { colors } = useTheme();
  const styles = useStyles(colors);

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
