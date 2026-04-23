import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import {
  Appointment,
  AppointmentStatus,
  cancelAppointment,
  listAppointments,
} from '@services/api/appointments.api';
import { apiErrorMessage } from '@services/api/errors';
import { localizeCity } from '@i18n/places';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

function statusTone(status: AppointmentStatus, colors: AppColors) {
  switch (status) {
    case 'CONFIRMED':
      return { bg: colors.tint.green.bg, fg: colors.tint.green.fg };
    case 'PENDING':
      return { bg: colors.tint.yellow.bg, fg: colors.tint.yellow.fg };
    case 'CANCELLED':
    case 'NO_SHOW':
      return { bg: colors.tint.red.bg, fg: colors.tint.red.fg };
    case 'COMPLETED':
      return { bg: colors.tint.blue.bg, fg: colors.tint.blue.fg };
    default:
      return { bg: colors.tint.gray.bg, fg: colors.tint.gray.fg };
  }
}

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-JO' : 'en-GB';
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: listAppointments,
  });

  const appointment: Appointment | undefined = useMemo(
    () => appointments?.find((a) => a.id === id),
    [appointments, id],
  );

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      router.back();
    },
    onError: (err) => {
      Alert.alert(t('common.error') || 'Error', apiErrorMessage(err));
    },
  });

  if (!appointment) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface.raised }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <GradientHeader showBack title={t('home.nextAppointment')} />
        <View style={styles.body}>
          <Card>
            <Text style={{ color: colors.text.muted }}>
              {t('family.notFound') || 'Not found'}
            </Text>
          </Card>
        </View>
      </ScrollView>
    );
  }

  const scheduled = new Date(appointment.scheduledAt);
  const dateLabel = scheduled.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeLabel = scheduled.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isRTL = i18n.language === 'ar';
  const hospitalName = isRTL
    ? appointment.hospital.nameAr
    : appointment.hospital.nameEn;
  const departmentName = isRTL
    ? appointment.department.nameAr
    : appointment.department.nameEn;

  const canCancel =
    appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';
  const tone = statusTone(appointment.status, colors);

  function onCancelPress() {
    Alert.alert(
      t('common.confirm') || 'Confirm',
      t('common.cancelAppointment') || 'Cancel this appointment?',
      [
        { text: t('common.no') || 'No', style: 'cancel' },
        {
          text: t('common.yes') || 'Yes',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(appointment!.id),
        },
      ],
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      <GradientHeader showBack size="lg">
        <View style={styles.heroBlock}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar" size={28} color={colors.text.inverse} />
          </View>
          <Text style={styles.title}>{departmentName}</Text>
          <Text style={styles.subtitle}>{hospitalName}</Text>
          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.fg }]}>
              {appointment.status}
            </Text>
          </View>
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <SectionContainer title={t('booking.selectTime') || 'When'}>
          <Card>
            <View style={styles.row}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.rowText}>{dateLabel}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.rowText}>{timeLabel}</Text>
            </View>
          </Card>
        </SectionContainer>

        <SectionContainer title={t('booking.nearbyHospitals') || 'Location'}>
          <Card>
            <View style={styles.row}>
              <Ionicons
                name="business-outline"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.rowText}>{hospitalName}</Text>
            </View>
            {appointment.hospital.city ? (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.rowText}>
                    {localizeCity(
                      appointment.hospital.city,
                      i18n.language === 'ar',
                    )}
                  </Text>
                </View>
              </>
            ) : null}
          </Card>
        </SectionContainer>

        {appointment.reason ? (
          <SectionContainer title={t('booking.reason') || 'Reason'}>
            <Card>
              <Text style={styles.reasonText}>{appointment.reason}</Text>
            </Card>
          </SectionContainer>
        ) : null}

        {canCancel ? (
          <Button
            label={t('common.cancel') || 'Cancel appointment'}
            onPress={onCancelPress}
            variant="danger"
            loading={cancelMutation.isPending}
          />
        ) : null}
      </View>
    </ScrollView>
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
  heroBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.brand.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brand.overlayStrong,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  subtitle: {
    color: colors.brand.onMuted,
    fontSize: typography.size.sm,
  },
  statusPill: {
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface.border,
    marginVertical: spacing.xs,
  },
  reasonText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
}), [colors]);
}
