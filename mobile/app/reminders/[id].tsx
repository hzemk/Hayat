import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@components/Card';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { getReminder, Reminder } from '@services/api/reminders.api';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function monthsBetween(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return Math.max(1, months);
}

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reminderId = String(id);
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-JO' : 'en-GB';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading, error } = useQuery<Reminder>({
    queryKey: ['reminder', reminderId],
    queryFn: () => getReminder(reminderId),
    enabled: Boolean(reminderId),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.muted}>{t('common.error')}</Text>
      </View>
    );
  }

  const doctor = data.doctor;
  const rx = data.prescription;
  const isAr = i18n.language === 'ar';
  const startLabel = formatDate(data.scheduledAt, locale);
  const endLabel = data.endsAt ? formatDate(data.endsAt, locale) : null;
  const months = endLabel ? monthsBetween(data.scheduledAt, data.endsAt!) : null;
  const doctorName = doctor
    ? isAr
      ? (doctor.fullName ?? doctor.email)
      : (doctor.fullName ?? doctor.email)
    : null;
  const specialty = doctor
    ? isAr
      ? (doctor.specialtyAr ?? doctor.specialty)
      : doctor.specialty
    : null;
  const rxItem = rx?.items.find(
    (it) => it.medicationName.toLowerCase() ===
      data.title.split(' ')[0].toLowerCase(),
  ) ?? rx?.items[0] ?? null;
  const instructions = rxItem
    ? isAr
      ? (rxItem.instructionsAr ?? rxItem.instructionsEn)
      : (rxItem.instructionsEn ?? rxItem.instructionsAr)
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader
        showBack
        title={data.title}
        subtitle={data.subtitle ?? t('reminders.detailTitle')}
      />

      <View style={styles.body}>
        <SectionContainer
          title={
            months != null
              ? `${t('reminders.takeFrom')} · ${t('reminders.durationMonths', { count: months })}`
              : t('reminders.takeFrom')
          }
        >
          <Card>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name="calendar"
                  size={18}
                  color={colors.brand.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t('reminders.takeFrom')}</Text>
                <Text style={styles.value}>{startLabel}</Text>
              </View>
            </View>
            {endLabel ? (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name="flag"
                      size={18}
                      color={colors.brand.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{t('reminders.takeUntil')}</Text>
                    <Text style={styles.value}>{endLabel}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </Card>
        </SectionContainer>

        <SectionContainer title={t('reminders.prescribedBy')}>
          <Card>
            {doctor ? (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Ionicons
                    name="medkit"
                    size={20}
                    color={colors.brand.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{doctorName}</Text>
                  {specialty ? (
                    <Text style={styles.specialty}>{specialty}</Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text style={styles.muted}>{t('reminders.noDoctor')}</Text>
            )}
          </Card>
        </SectionContainer>

        {rxItem ? (
          <SectionContainer title={t('reminders.dose')}>
            <Card>
              <View style={styles.kv}>
                <Text style={styles.label}>{t('reminders.dose')}</Text>
                <Text style={styles.value}>{rxItem.dose ?? '—'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.kv}>
                <Text style={styles.label}>{t('reminders.frequency')}</Text>
                <Text style={styles.value}>{rxItem.frequency ?? '—'}</Text>
              </View>
              {instructions ? (
                <>
                  <View style={styles.divider} />
                  <View>
                    <Text style={styles.label}>{t('reminders.notes')}</Text>
                    <Text style={[styles.value, { marginTop: 4 }]}>
                      {instructions}
                    </Text>
                  </View>
                </>
              ) : null}
            </Card>
          </SectionContainer>
        ) : null}
      </View>
    </ScrollView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        loadingWrap: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.raised,
          gap: spacing.md,
        },
        muted: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
        },
        body: {
          paddingTop: spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.xl,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatar: {
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          fontWeight: typography.weight.semibold,
        },
        value: {
          fontSize: typography.size.md,
          color: colors.text.primary,
          fontWeight: typography.weight.semibold,
          marginTop: 2,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.surface.border,
          marginVertical: spacing.md,
        },
        doctorName: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        specialty: {
          fontSize: typography.size.sm,
          color: colors.brand.primary,
          fontWeight: typography.weight.semibold,
          marginTop: 2,
        },
        kv: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      }),
    [colors],
  );
}
