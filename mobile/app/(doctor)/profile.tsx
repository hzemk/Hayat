import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { Card } from '@components/Card';
import { ListItem } from '@components/ListItem';
import { LanguagePicker } from '@components/LanguagePicker';
import { useAuthStore } from '@stores/auth';
import {
  getDoctorMe,
  setDoctorAvailability,
} from '@services/api/doctor-portal.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

export default function DoctorProfileScreen() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const meQuery = useQuery({ queryKey: ['doctor-me'], queryFn: getDoctorMe });
  const availability = useMutation({
    mutationFn: (next: boolean) => setDoctorAvailability(next),
    onSuccess: (updated) => queryClient.setQueryData(['doctor-me'], updated),
  });

  async function onLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  if (meQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const doctor = meQuery.data;
  if (!doctor) return null;

  const initials = (doctor.user?.fullName ?? '')
    .replace(/^dr\.?\s*/i, '')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const specialty = isAr
    ? doctor.specialtyAr || doctor.specialty
    : doctor.specialty;
  const hospitalName = isAr
    ? doctor.hospital?.nameAr
    : doctor.hospital?.nameEn;
  const departmentName = isAr
    ? doctor.department?.nameAr
    : doctor.department?.nameEn;
  const isOnline = doctor.isAvailable;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <GradientHeader size="lg">
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'D'}</Text>
          </View>
          <Text style={styles.name}>{doctor.user.fullName}</Text>
          {specialty ? <Text style={styles.sub}>{specialty}</Text> : null}
          {hospitalName ? (
            <Text style={styles.subHint}>
              {hospitalName}
              {departmentName ? ` · ${departmentName}` : ''}
            </Text>
          ) : null}
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <SectionContainer title={t('doctorPortal.profile.availability')}>
          <Card>
            <View style={styles.availRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.availTitle}>
                  {isOnline
                    ? t('doctorPortal.profile.online')
                    : t('doctorPortal.profile.offline')}
                </Text>
                <Text style={styles.availHint}>
                  {isOnline
                    ? t('doctors.available')
                    : t('doctors.offline')}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={(v) => availability.mutate(v)}
                disabled={availability.isPending}
                trackColor={{
                  false: colors.surface.border,
                  true: colors.brand.primaryLight,
                }}
                thumbColor={isOnline ? colors.brand.primary : '#fff'}
              />
            </View>
          </Card>
          <ListItem
            icon="calendar"
            title={t('doctorPortal.schedule.manage')}
            subtitle={t('doctorPortal.schedule.manageHint')}
            chevron
            onPress={() => router.push('/(doctor)/schedule')}
          />
        </SectionContainer>

        <SectionContainer title={t('profile.personalInfo')}>
          <Card>
            <View style={{ gap: spacing.md }}>
              <InfoRow
                icon="mail"
                label={t('doctorPortal.profile.email')}
                value={doctor.user.email}
              />
              {doctor.user.phoneNumber ? (
                <InfoRow
                  icon="call"
                  label={t('doctorPortal.profile.phone')}
                  value={doctor.user.phoneNumber}
                />
              ) : null}
              <InfoRow
                icon="ribbon"
                label={t('doctorPortal.profile.license')}
                value={doctor.licenseNumber}
              />
              {doctor.yearsExperience != null ? (
                <InfoRow
                  icon="time"
                  label={t('doctorPortal.profile.experience')}
                  value={t('doctorPortal.profile.experienceValue', {
                    years: doctor.yearsExperience,
                  })}
                />
              ) : null}
              {doctor.languages.length > 0 ? (
                <InfoRow
                  icon="language"
                  label={t('doctorPortal.profile.languages')}
                  value={doctor.languages.join(', ')}
                />
              ) : null}
            </View>
          </Card>
        </SectionContainer>

        <SectionContainer title={t('profile.preferences')}>
          <LanguagePicker />
          <ListItem
            icon="log-out"
            tint="red"
            title={t('doctorPortal.profile.logout')}
            danger
            chevron
            onPress={onLogout}
          />
        </SectionContainer>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.raised,
  },
  hero: { alignItems: 'center', gap: spacing.xs },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  avatarText: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  name: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  sub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  subHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: typography.size.xs,
  },
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  availTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  availHint: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  infoValue: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
}), [colors]);
}
