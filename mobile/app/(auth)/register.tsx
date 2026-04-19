import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@components/ScreenContainer';
import { TextField } from '@components/TextField';
import { Button } from '@components/Button';
import { HayatLogo } from '@components/HayatLogo';
import { registerAccount } from '@services/api/auth.api';
import { apiErrorMessage } from '@services/api/errors';
import { useAuthStore } from '@stores/auth';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

type Role = 'PATIENT' | 'DOCTOR';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [role, setRole] = useState<Role>('PATIENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [license, setLicense] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (fullName.trim().length < 2) {
      Alert.alert(t('common.error'), t('auth.fullNameRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    const phoneNumber = phone.trim();
    if (phoneNumber && !/^\+962\d{9}$/.test(phoneNumber)) {
      Alert.alert(t('common.error'), t('auth.invalidPhone'));
      return;
    }

    if (role === 'DOCTOR') {
      if (license.trim().length < 3) {
        Alert.alert(t('common.error'), t('auth.licenseRequired'));
        return;
      }
      if (specialty.trim().length < 2) {
        Alert.alert(t('common.error'), t('auth.specialtyRequired'));
        return;
      }
    }

    setLoading(true);
    try {
      const res = await registerAccount({
        email: trimmedEmail,
        password,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber || undefined,
        role,
        doctorProfile:
          role === 'DOCTOR'
            ? {
                licenseNumber: license.trim(),
                specialty: specialty.trim(),
              }
            : undefined,
      });
      await setSession({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer padded={false} scroll>
      <LinearGradient
        colors={[...colors.brand.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text.inverse} />
        </Pressable>
        {role === 'DOCTOR' ? (
          <View style={styles.logoRing}>
            <Ionicons name="medkit" size={28} color={colors.text.inverse} />
          </View>
        ) : (
          <HayatLogo size={72} variant="dark" showGlow={false} />
        )}
        <Text style={styles.brand}>{t('auth.signUp')}</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.card}
      >
        <View style={styles.roleRow}>
          <RolePill
            active={role === 'PATIENT'}
            icon="person"
            label={t('auth.rolePatient')}
            onPress={() => setRole('PATIENT')}
          />
          <RolePill
            active={role === 'DOCTOR'}
            icon="medkit"
            label={t('auth.roleDoctor')}
            onPress={() => setRole('DOCTOR')}
          />
        </View>

        <TextField
          label={t('auth.fullName')}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={t('auth.emailPlaceholder')}
        />
        <TextField
          label={`${t('auth.phoneNumber')} (${t('auth.phoneOptional')})`}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t('auth.phonePlaceholder')}
        />

        {role === 'DOCTOR' ? (
          <>
            <TextField
              label={t('auth.licenseNumber')}
              value={license}
              onChangeText={setLicense}
              autoCapitalize="characters"
              placeholder={t('auth.licensePlaceholder')}
            />
            <TextField
              label={t('auth.specialty')}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder={t('auth.specialtyPlaceholder')}
            />
          </>
        ) : null}

        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <TextField
          label={t('auth.confirmPassword')}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="••••••••"
        />

        <Button
          label={
            role === 'DOCTOR'
              ? t('auth.signUpDoctor')
              : t('auth.signUp')
          }
          onPress={onSubmit}
          loading={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.haveAccount')} </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function RolePill({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.rolePill, active && styles.rolePillActive]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? colors.text.inverse : colors.brand.primary}
      />
      <Text
        style={[
          styles.rolePillText,
          active && { color: colors.text.inverse },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  hero: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: spacing.sm,
  },
  back: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    padding: spacing.xs,
  },
  logoRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  card: {
    marginTop: -spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface.base,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 4,
    backgroundColor: colors.surface.raised,
    borderRadius: radius.lg,
  },
  rolePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  rolePillActive: {
    backgroundColor: colors.brand.primary,
  },
  rolePillText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.brand.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  footerText: { color: colors.text.secondary },
  footerLink: {
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
  },
}), [colors]);
}
