import { useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TextField } from '@components/TextField';
import { GradientButton } from '@components/GradientButton';
import { HayatLogo } from '@components/HayatLogo';
import {
  buildMockSanadCode,
  loginWithEmail,
  loginWithSanad,
} from '@services/api/auth.api';
import { apiErrorMessage } from '@services/api/errors';
import { useAuthStore } from '@stores/auth';
import {
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
  type AppColors,
} from '@theme/index';

const SANAD_LOGO = require('../../assets/sanad-logo.png');

type Role = 'PATIENT' | 'DOCTOR' | 'HOSPITAL';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors, isDark, toggle } = useTheme();
  const styles = useStyles(colors);
  const setSession = useAuthStore((s) => s.setSession);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sanadLoading, setSanadLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setEmail('');
    setPassword('');
    setFormError(null);
  }

  function backToRoles() {
    resetForm();
    setRole(null);
  }

  async function onEmailLogin(expectedPrefix: 'dr.' | 'hosp.') {
    setFormError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormError(t('auth.invalidEmail'));
      return;
    }
    if (!trimmed.startsWith(expectedPrefix)) {
      setFormError(
        expectedPrefix === 'dr.'
          ? t('auth.doctorEmailInvalid')
          : t('auth.hospitalEmailInvalid'),
      );
      return;
    }
    if (password.length < 1) {
      setFormError(t('auth.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      const res = await loginWithEmail({ email: trimmed, password });
      await setSession({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
    } catch (err) {
      const status =
        axios.isAxiosError(err) ? err.response?.status : undefined;
      const msg =
        status === 401 || status === 403
          ? t('auth.invalidCredentials')
          : apiErrorMessage(err, t('auth.invalidCredentials'));
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onSanadLogin() {
    setFormError(null);
    setSanadLoading(true);
    try {
      const code = buildMockSanadCode({
        subject: 'JOR-9876543210',
        email: 'sanad.user@hayat.jo',
        fullName: 'منى الزعبي',
      });
      const res = await loginWithSanad(code);
      await setSession({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    } finally {
      setSanadLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable
        onPress={toggle}
        hitSlop={10}
        style={styles.themeToggle}
        accessibilityRole="button"
        accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={16}
          color={colors.text.primary}
        />
      </Pressable>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <HayatLogo
              size={120}
              variant={isDark ? 'dark' : 'light'}
              showECG
              showGlow
              showStars={isDark}
            />
            <Text style={styles.brand}>{t('app.name')}</Text>
            <Text style={styles.tagline}>{t('app.tagline')}</Text>
          </View>

          {role === null ? (
            <RoleChooser onPick={setRole} colors={colors} styles={styles} />
          ) : role === 'PATIENT' ? (
            <PatientCard
              loading={sanadLoading}
              onSubmit={onSanadLogin}
              onBack={backToRoles}
              colors={colors}
              styles={styles}
            />
          ) : (
            <EmailCard
              role={role}
              email={email}
              password={password}
              loading={loading}
              error={formError}
              onEmail={(v) => {
                setFormError(null);
                setEmail(v);
              }}
              onPassword={(v) => {
                setFormError(null);
                setPassword(v);
              }}
              onSubmit={() =>
                onEmailLogin(role === 'DOCTOR' ? 'dr.' : 'hosp.')
              }
              onBack={backToRoles}
              colors={colors}
              styles={styles}
            />
          )}

          {role === null ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof useStyles>;

function RoleChooser({
  onPick,
  colors,
  styles,
}: {
  onPick: (r: Role) => void;
  colors: AppColors;
  styles: Styles;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.chooserCard}>
      <Text style={styles.cardTitle}>{t('auth.chooseRoleTitle')}</Text>
      <Text style={styles.cardHint}>{t('auth.chooseRoleHint')}</Text>

      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <RoleCard
          accent={colors.brand.primary}
          icon="person"
          title={t('auth.rolePatientTitle')}
          hint={t('auth.rolePatientHint')}
          showSanadLogo
          onPress={() => onPick('PATIENT')}
          colors={colors}
          styles={styles}
        />
        <RoleCard
          accent={colors.tint.teal.fg}
          icon="medkit"
          title={t('auth.roleDoctorTitle')}
          hint={t('auth.roleDoctorHint')}
          onPress={() => onPick('DOCTOR')}
          colors={colors}
          styles={styles}
        />
        <RoleCard
          accent={colors.tint.purple.fg}
          icon="business"
          title={t('auth.roleHospitalTitle')}
          hint={t('auth.roleHospitalHint')}
          onPress={() => onPick('HOSPITAL')}
          colors={colors}
          styles={styles}
        />
      </View>
    </View>
  );
}

function RoleCard({
  icon,
  title,
  hint,
  accent,
  showSanadLogo,
  onPress,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  accent: string;
  showSanadLogo?: boolean;
  onPress: () => void;
  colors: AppColors;
  styles: Styles;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {showSanadLogo ? (
        <View style={styles.sanadBadge}>
          <Image
            source={SANAD_LOGO}
            style={styles.sanadBadgeLogo}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={[styles.roleIconWrap, { backgroundColor: accent + '22' }]}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
    </Pressable>
  );
}

function PatientCard({
  loading,
  onSubmit,
  onBack,
  colors,
  styles,
}: {
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
  colors: AppColors;
  styles: Styles;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <BackRow onBack={onBack} colors={colors} styles={styles} />
      <Text style={styles.cardTitle}>{t('auth.rolePatientTitle')}</Text>
      <Text style={styles.cardHint}>{t('auth.rolePatientHint')}</Text>

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }) => [
          styles.sanadButton,
          pressed && { opacity: 0.9 },
          loading && { opacity: 0.6 },
        ]}
      >
        <View style={styles.sanadBadgeInline}>
          <Image
            source={SANAD_LOGO}
            style={styles.sanadInlineLogo}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sanadTitle}>{t('auth.signInAsPatient')}</Text>
          <Text style={styles.sanadSubtitle}>{t('auth.sanadHint')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </View>
  );
}

function EmailCard({
  role,
  email,
  password,
  loading,
  error,
  onEmail,
  onPassword,
  onSubmit,
  onBack,
  colors,
  styles,
}: {
  role: Exclude<Role, 'PATIENT'>;
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  colors: AppColors;
  styles: Styles;
}) {
  const { t } = useTranslation();
  const isDoctor = role === 'DOCTOR';
  const title = isDoctor
    ? t('auth.roleDoctorTitle')
    : t('auth.roleHospitalTitle');
  const hint = isDoctor
    ? t('auth.doctorEmailHint')
    : t('auth.hospitalEmailHint');
  const placeholder = isDoctor ? 'dr.name@hayat.jo' : 'hosp.name@hayat.jo';
  const submitLabel = isDoctor
    ? t('auth.signInAsDoctor')
    : t('auth.signInAsHospital');
  const gradient: readonly [string, string] = isDoctor
    ? [colors.tint.teal.fg, colors.brand.primary]
    : [colors.tint.purple.fg, colors.brand.primary];

  return (
    <View style={styles.card}>
      <BackRow onBack={onBack} colors={colors} styles={styles} />
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rolePill}
      >
        <Ionicons
          name={isDoctor ? 'medkit' : 'business'}
          size={14}
          color="#fff"
        />
        <Text style={styles.rolePillText}>{title}</Text>
      </LinearGradient>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardHint}>{hint}</Text>

      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={onEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder={placeholder}
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={onPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
        />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons
            name="alert-circle"
            size={16}
            color={colors.tint.red.fg}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <GradientButton label={submitLabel} onPress={onSubmit} loading={loading} />
    </View>
  );
}

function BackRow({
  onBack,
  colors,
  styles,
}: {
  onBack: () => void;
  colors: AppColors;
  styles: Styles;
}) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onBack} hitSlop={8} style={styles.backRow}>
      <Ionicons name="chevron-back" size={16} color={colors.brand.primary} />
      <Text style={styles.backText}>{t('auth.backToRoles')}</Text>
    </Pressable>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: colors.surface.raised,
        },
        scroll: {
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
        },
        brandBlock: {
          alignItems: 'center',
          gap: spacing.xs,
          marginBottom: spacing.xl,
        },
        themeToggle: {
          position: 'absolute',
          top: spacing.md,
          right: spacing.md,
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          backgroundColor: colors.surface.base,
          borderColor: colors.surface.border,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          elevation: 4,
        },
        errorBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.tint.red.bg,
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          marginTop: spacing.xs,
        },
        errorText: {
          flex: 1,
          color: colors.tint.red.fg,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.medium,
        },
        brand: {
          fontSize: typography.size.xxl,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        tagline: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
        },
        chooserCard: {
          backgroundColor: colors.surface.base,
          borderRadius: radius.xxl,
          padding: spacing.xl,
          ...shadow.raised,
        },
        card: {
          backgroundColor: colors.surface.base,
          borderRadius: radius.xxl,
          padding: spacing.xl,
          gap: spacing.md,
          ...shadow.raised,
        },
        cardTitle: {
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        cardHint: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
        },
        roleCard: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.surface.border,
          backgroundColor: colors.surface.raised,
          padding: spacing.md,
        },
        roleIconWrap: {
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        roleTitle: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        roleHint: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: 2,
        },
        sanadBadge: {
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: colors.surface.border,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
        },
        sanadBadgeLogo: {
          width: 48,
          height: 48,
        },
        sanadBadgeInline: {
          width: 52,
          height: 48,
          borderRadius: radius.md,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
        },
        sanadInlineLogo: {
          width: 44,
          height: 40,
        },
        sanadButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: '#0B0B0B',
          borderRadius: radius.xl,
          padding: spacing.md,
          marginTop: spacing.sm,
        },
        sanadTitle: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.semibold,
          color: '#fff',
        },
        sanadSubtitle: {
          fontSize: typography.size.xs,
          color: 'rgba(255,255,255,0.6)',
          marginTop: 2,
        },
        rolePill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.sm + 2,
          height: 26,
          borderRadius: radius.pill,
        },
        rolePillText: {
          color: '#fff',
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
        },
        backRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
        },
        backText: {
          color: colors.brand.primary,
          fontWeight: typography.weight.semibold,
          fontSize: typography.size.sm,
        },
        footer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: spacing.xl,
        },
        footerText: {
          color: colors.text.secondary,
          fontSize: typography.size.sm,
        },
        footerLink: {
          color: colors.brand.primary,
          fontWeight: typography.weight.semibold,
          fontSize: typography.size.sm,
        },
      }),
    [colors],
  );
}
