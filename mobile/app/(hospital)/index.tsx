import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { StatCard } from '@components/StatCard';
import {
  getHospitalStats,
  listHospitalDoctors,
} from '@services/api/hospital-portal.api';
import { useAuthStore } from '@stores/auth';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

export default function HospitalOverviewScreen() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const statsQuery = useQuery({
    queryKey: ['hospital-stats'],
    queryFn: getHospitalStats,
  });
  const doctorsQuery = useQuery({
    queryKey: ['hospital-doctors'],
    queryFn: listHospitalDoctors,
  });

  const loading = statsQuery.isLoading || doctorsQuery.isLoading;
  const refreshing = statsQuery.isFetching || doctorsQuery.isFetching;

  async function onRefresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hospital-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['hospital-doctors'] }),
    ]);
  }

  const stats = statsQuery.data;
  const hospitalName = stats
    ? isAr
      ? stats.hospital.nameAr
      : stats.hospital.nameEn
    : '';
  const greetingName = user?.fullName ?? user?.email ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={hospitalName || t('hospitalPortal.overview.title')}
        subtitle={`${t('hospitalPortal.overview.greeting')}, ${greetingName}`}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <SectionContainer>
            <View style={styles.row}>
              <StatCard
                label={t('hospitalPortal.overview.doctors')}
                value={stats?.doctors ?? 0}
                icon="medkit-outline"
                tint="teal"
              />
              <StatCard
                label={t('hospitalPortal.overview.online')}
                value={stats?.onlineDoctors ?? 0}
                icon="pulse"
                tint="green"
              />
            </View>
            <View style={[styles.row, { marginTop: spacing.md }]}>
              <StatCard
                label={t('hospitalPortal.overview.unread')}
                value={stats?.unreadMessages ?? 0}
                icon="mail-unread-outline"
                tint="yellow"
              />
              <StatCard
                label={t('hospitalPortal.overview.appointments')}
                value={stats?.openAppointments ?? 0}
                icon="calendar-outline"
                tint="purple"
              />
            </View>
            <View style={[styles.row, { marginTop: spacing.md }]}>
              <StatCard
                label={t('hospitalPortal.overview.departments')}
                value={stats?.departments ?? 0}
                icon="business-outline"
                tint="blue"
              />
              <View style={{ flex: 1 }} />
            </View>
          </SectionContainer>

          <SectionContainer
            title={t('hospitalPortal.doctors.title')}
            action={{
              label: t('hospitalPortal.doctors.viewTeam'),
              onPress: () => router.push('/(hospital)/doctors'),
            }}
          >
            <Pressable
              onPress={() => router.push('/(hospital)/doctors')}
              style={({ pressed }) => [
                styles.teamCard,
                pressed && { opacity: 0.92 },
              ]}
            >
              {doctorsQuery.data && doctorsQuery.data.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  {doctorsQuery.data.slice(0, 5).map((doc) => {
                    const deptName = doc.department
                      ? isAr
                        ? doc.department.nameAr
                        : doc.department.nameEn
                      : t('hospitalPortal.doctors.noDepartment');
                    return (
                      <View key={doc.id} style={styles.doctorRow}>
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: doc.isAvailable
                                ? colors.status.success
                                : colors.text.muted,
                            },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docName} numberOfLines={1}>
                            {doc.user.fullName || doc.user.email}
                          </Text>
                          <Text style={styles.docMeta} numberOfLines={1}>
                            {doc.specialty} · {deptName}
                          </Text>
                        </View>
                        {doc.unreadMessages > 0 ? (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>
                              {doc.unreadMessages}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  <View style={styles.viewAllRow}>
                    <Text style={styles.viewAllText}>
                      {t('hospitalPortal.doctors.viewTeam')}
                    </Text>
                    <Ionicons
                      name={isAr ? 'chevron-back' : 'chevron-forward'}
                      size={14}
                      color={colors.brand.primary}
                    />
                  </View>
                </View>
              ) : (
                <Text style={styles.empty}>
                  {t('hospitalPortal.doctors.empty')}
                </Text>
              )}
            </Pressable>
          </SectionContainer>
        </ScrollView>
      )}
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        loading: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        body: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
          gap: spacing.lg,
        },
        row: {
          flexDirection: 'row',
          gap: spacing.md,
        },
        doctorRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.xs,
        },
        dot: {
          width: 10,
          height: 10,
          borderRadius: 5,
        },
        docName: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
        },
        docMeta: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: 2,
        },
        unreadBadge: {
          minWidth: 22,
          height: 22,
          paddingHorizontal: 6,
          borderRadius: 11,
          backgroundColor: colors.status.error,
          alignItems: 'center',
          justifyContent: 'center',
        },
        unreadText: {
          color: colors.emergency.on,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
        },
        empty: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
          textAlign: 'center',
          paddingVertical: spacing.md,
        },
        teamCard: {
          backgroundColor: colors.surface.base,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.surface.border,
        },
        viewAllRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          paddingTop: spacing.sm,
          marginTop: spacing.xs,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.surface.border,
        },
        viewAllText: {
          color: colors.brand.primary,
          fontWeight: typography.weight.semibold,
          fontSize: typography.size.sm,
        },
      }),
    [colors],
  );
}
