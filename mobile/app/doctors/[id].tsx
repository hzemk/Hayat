import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Card } from '@components/Card';
import { SectionContainer } from '@components/SectionContainer';
import { InfoChip } from '@components/InfoChip';
import {
  getDoctor,
  selectDefaultDoctor,
} from '@services/api/doctors.api';
import { useAuthStore } from '@stores/auth';
import { apiErrorMessage } from '@services/api/errors';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

export default function DoctorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [error, setError] = useState<string | null>(null);

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => getDoctor(id!),
    enabled: !!id,
  });

  const selectMutation = useMutation({
    mutationFn: () => selectDefaultDoctor(id!),
    onSuccess: (res) => {
      if (user) setUser({ ...user, defaultDoctorId: res.defaultDoctorId });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (err) => {
      setError(apiErrorMessage(err, t('common.error')));
    },
  });

  if (isLoading || !doctor) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const specialty = isRtl
    ? doctor.specialtyAr ?? doctor.specialty
    : doctor.specialty;
  const bio = isRtl ? doctor.bioAr ?? doctor.bio : doctor.bio;
  const hospitalName = doctor.hospital
    ? isRtl
      ? doctor.hospital.nameAr
      : doctor.hospital.nameEn
    : null;
  const departmentName = doctor.department
    ? isRtl
      ? doctor.department.nameAr
      : doctor.department.nameEn
    : null;

  const isDefault = user?.defaultDoctorId === doctor.id;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons
            name={isRtl ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={colors.text.primary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>
          {t('doctors.profile') || 'Profile'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      >
        <View style={styles.heroWrap}>
          {doctor.photoUrl ? (
            <Image source={{ uri: doctor.photoUrl }} style={styles.heroPhoto} />
          ) : (
            <View style={[styles.heroPhoto, styles.photoFallback]}>
              <Ionicons name="person" size={44} color={colors.brand.primary} />
            </View>
          )}
          <Text style={styles.name}>{doctor.user.fullName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          {hospitalName ? (
            <Text style={styles.hospital}>
              {[hospitalName, departmentName].filter(Boolean).join(' • ')}
            </Text>
          ) : null}

          <View style={styles.chipsRow}>
            {doctor.rating ? (
              <View style={styles.ratingPill}>
                <Ionicons
                  name="star"
                  size={12}
                  color={colors.status.warning}
                />
                <Text style={styles.ratingText}>
                  {doctor.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
            {doctor.yearsExperience ? (
              <InfoChip
                tint="blue"
                label={`${doctor.yearsExperience}y ${t('doctors.experience') || 'exp'}`}
                size="sm"
              />
            ) : null}
            {doctor.isAvailable ? (
              <InfoChip
                tint="green"
                label={t('doctors.available') || 'Online'}
                size="sm"
              />
            ) : (
              <InfoChip
                tint="gray"
                label={t('doctors.offline') || 'Offline'}
                size="sm"
              />
            )}
            {isDefault ? (
              <InfoChip
                tint="teal"
                label={t('doctors.myDoctor') || 'My doctor'}
                size="sm"
              />
            ) : null}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push(`/doctors/chat/${doctor.id}`)}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.88 },
            ]}
          >
            <Ionicons
              name="chatbubbles"
              size={18}
              color={colors.text.inverse}
            />
            <Text style={styles.primaryBtnText}>
              {t('doctors.openChat') || 'Open chat'}
            </Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.body}>
          {bio ? (
            <SectionContainer title={t('doctors.about') || 'About'}>
              <Card padding="md">
                <Text style={styles.bioText}>{bio}</Text>
              </Card>
            </SectionContainer>
          ) : null}

          <SectionContainer title={t('doctors.details') || 'Details'}>
            <Card padding="md" style={styles.detailsCard}>
              <DetailRow
                icon="card-outline"
                label={t('doctors.license') || 'License'}
                value={doctor.licenseNumber}
              />
              {doctor.languages.length > 0 ? (
                <DetailRow
                  icon="language-outline"
                  label={t('doctors.languages') || 'Languages'}
                  value={doctor.languages.join(', ')}
                />
              ) : null}
            </Card>
          </SectionContainer>

          {!isDefault ? (
            <Pressable
              onPress={() => selectMutation.mutate()}
              disabled={selectMutation.isPending}
              style={({ pressed }) => [
                styles.outlineBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              {selectMutation.isPending ? (
                <ActivityIndicator
                  color={colors.brand.primary}
                  size="small"
                />
              ) : (
                <>
                  <Ionicons
                    name="star"
                    size={18}
                    color={colors.brand.primary}
                  />
                  <Text style={styles.outlineBtnText}>
                    {t('doctors.setAsDefault') || 'Set as my doctor'}
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={colors.brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.raised },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  heroWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  heroPhoto: {
    width: 120,
    height: 120,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.teal.bg,
    marginBottom: spacing.sm,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  specialty: {
    fontSize: typography.size.md,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
  },
  hospital: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.tint.yellow.bg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  ratingText: {
    fontSize: typography.size.xs,
    color: colors.tint.yellow.fg,
    fontWeight: typography.weight.bold,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    ...shadow.soft,
  },
  primaryBtnText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  bioText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  detailsCard: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    marginTop: 2,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    backgroundColor: colors.surface.base,
  },
  outlineBtnText: {
    color: colors.brand.primary,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
}), [colors]);
}
