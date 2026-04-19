import { useMemo } from 'react';
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
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { Card } from '@components/Card';
import { InfoChip } from '@components/InfoChip';
import {
  DoctorSummary,
  listDoctors,
  listMyThreads,
} from '@services/api/doctors.api';
import { useAuthStore } from '@stores/auth';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

export default function DoctorsScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isRtl = i18n.language === 'ar';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: listDoctors,
  });

  const { data: threads } = useQuery({
    queryKey: ['doctor-threads'],
    queryFn: listMyThreads,
  });

  const defaultDoctor = useMemo(
    () => doctors?.find((d) => d.id === user?.defaultDoctorId),
    [doctors, user?.defaultDoctorId],
  );

  const others = useMemo(
    () => doctors?.filter((d) => d.id !== user?.defaultDoctorId) ?? [],
    [doctors, user?.defaultDoctorId],
  );

  const threadByDoctor = useMemo(() => {
    const map = new Map<string, boolean>();
    threads?.forEach((t) => map.set(t.doctorId, true));
    return map;
  }, [threads]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader
        title={t('doctors.title') || 'Your doctors'}
        subtitle={
          t('doctors.subtitle') ||
          'Chat, request prescriptions, or start a video call'
        }
      />

      <View style={styles.body}>
        {isLoading ? (
          <ActivityIndicator color={colors.brand.primary} />
        ) : null}

        {defaultDoctor ? (
          <SectionContainer
            title={t('doctors.myDoctor') || 'My doctor'}
            gap="md"
          >
            <DefaultDoctorCard
              doctor={defaultDoctor}
              onOpenChat={() =>
                router.push(`/doctors/chat/${defaultDoctor.id}`)
              }
              onOpenProfile={() => router.push(`/doctors/${defaultDoctor.id}`)}
              hasThread={threadByDoctor.get(defaultDoctor.id) ?? false}
              isRtl={isRtl}
            />
          </SectionContainer>
        ) : null}

        {others.length > 0 ? (
          <SectionContainer
            title={
              defaultDoctor
                ? t('doctors.otherDoctors')
                : t('doctors.allDoctors')
            }
            gap="sm"
          >
            <Text style={styles.sectionHint}>{t('doctors.chooseHint')}</Text>
            {others.map((d) => (
              <DoctorRow
                key={d.id}
                doctor={d}
                onOpenChat={() => router.push(`/doctors/chat/${d.id}`)}
                onOpenProfile={() => router.push(`/doctors/${d.id}`)}
                hasThread={threadByDoctor.get(d.id) ?? false}
                isRtl={isRtl}
              />
            ))}
          </SectionContainer>
        ) : null}
      </View>
    </ScrollView>
  );
}

function DefaultDoctorCard({
  doctor,
  onOpenChat,
  onOpenProfile,
  hasThread,
  isRtl,
}: {
  doctor: DoctorSummary;
  onOpenChat: () => void;
  onOpenProfile: () => void;
  hasThread: boolean;
  isRtl: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const specialty = isRtl
    ? doctor.specialtyAr ?? doctor.specialty
    : doctor.specialty;
  const hospital = doctor.hospital
    ? isRtl
      ? doctor.hospital.nameAr
      : doctor.hospital.nameEn
    : null;

  return (
    <Card padding="lg" style={styles.heroCard}>
      <View style={styles.heroRow}>
        {doctor.photoUrl ? (
          <Image source={{ uri: doctor.photoUrl }} style={styles.heroPhoto} />
        ) : (
          <View style={[styles.heroPhoto, styles.photoFallback]}>
            <Ionicons name="person" size={32} color={colors.brand.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName} numberOfLines={1}>
            {doctor.user.fullName}
          </Text>
          <Text style={styles.heroSpecialty} numberOfLines={1}>
            {specialty}
          </Text>
          {hospital ? (
            <Text style={styles.heroHospital} numberOfLines={1}>
              {hospital}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            {doctor.rating ? (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={12} color={colors.status.warning} />
                <Text style={styles.metaPillText}>
                  {doctor.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
            {doctor.yearsExperience ? (
              <InfoChip
                tint="blue"
                label={`${doctor.yearsExperience}y exp`}
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
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onOpenChat}
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
            {hasThread
              ? t('doctors.openChat') || 'Open chat'
              : t('doctors.startChat') || 'Start chat'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenProfile}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.88 },
          ]}
        >
          <Ionicons name="person" size={18} color={colors.brand.primary} />
          <Text style={styles.secondaryBtnText}>
            {t('doctors.profile') || 'Profile'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function DoctorRow({
  doctor,
  onOpenChat,
  onOpenProfile,
  hasThread,
  isRtl,
}: {
  doctor: DoctorSummary;
  onOpenChat: () => void;
  onOpenProfile: () => void;
  hasThread: boolean;
  isRtl: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const specialty = isRtl
    ? doctor.specialtyAr ?? doctor.specialty
    : doctor.specialty;
  return (
    <Pressable onPress={onOpenChat}>
      <Card padding="md" style={styles.row}>
        <View>
          {doctor.photoUrl ? (
            <Image source={{ uri: doctor.photoUrl }} style={styles.rowPhoto} />
          ) : (
            <View style={[styles.rowPhoto, styles.photoFallback]}>
              <Ionicons name="person" size={22} color={colors.brand.primary} />
            </View>
          )}
          {doctor.isAvailable ? <View style={styles.onlineDot} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {doctor.user.fullName}
          </Text>
          <Text style={styles.rowSpecialty} numberOfLines={1}>
            {specialty}
          </Text>
          <View style={styles.metaRow}>
            {doctor.rating ? (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={11} color={colors.status.warning} />
                <Text style={styles.metaPillText}>
                  {doctor.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
            {hasThread ? (
              <InfoChip tint="teal" label={t('doctors.chatted')} size="sm" />
            ) : null}
            {!doctor.isAvailable ? (
              <InfoChip tint="gray" label={t('doctors.offline')} size="sm" />
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={onOpenProfile}
          hitSlop={10}
          style={styles.infoBtn}
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.text.muted}
          />
        </Pressable>
        <View style={styles.chatPill}>
          <Ionicons name="chatbubble" size={14} color={colors.text.inverse} />
        </View>
      </Card>
    </Pressable>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  heroCard: {
    gap: spacing.lg,
    ...shadow.soft,
  },
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.tint.teal.bg,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  heroSpecialty: {
    fontSize: typography.size.sm,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  heroHospital: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.tint.yellow.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  metaPillText: {
    fontSize: typography.size.xs,
    color: colors.tint.yellow.fg,
    fontWeight: typography.weight.bold,
  },
  actionRow: {
    flexDirection: 'row',
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
  },
  primaryBtnText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.tint.teal.bg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  secondaryBtnText: {
    color: colors.brand.primary,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowPhoto: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.tint.teal.bg,
  },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.status.success,
    borderWidth: 2,
    borderColor: colors.surface.base,
  },
  rowName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  rowSpecialty: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 1,
  },
  infoBtn: {
    padding: 4,
  },
  chatPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  sectionHint: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
}), [colors]);
}
