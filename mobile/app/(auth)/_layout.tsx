import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@stores/auth';

export default function AuthLayout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated || !user) return;
    if (user.role === 'DOCTOR') router.replace('/(doctor)');
    else if (user.role === 'HOSPITAL_ADMIN') router.replace('/(hospital)');
    else router.replace('/(tabs)');
  }, [isHydrated, user, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
