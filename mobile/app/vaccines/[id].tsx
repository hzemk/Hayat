import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { useAuthStore } from '@stores/auth';
import {
  deleteVaccination,
  listVaccinations,
  Vaccination,
} from '@services/api/vaccinations.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

export default function VaccineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-JO' : 'en-GB';
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data: vaccinations } = useQuery({
    queryKey: ['vaccinations'],
    queryFn: listVaccinations,
  });

  const vaccine: Vaccination | undefined = useMemo(
    () => vaccinations?.find((v) => v.id === id),
    [vaccinations, id],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteVaccination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      router.back();
    },
    onError: (err) => {
      Alert.alert(t('common.error') || 'Error', apiErrorMessage(err));
    },
  });

  if (!vaccine) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface.raised }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <GradientHeader showBack title={t('vaccines.title') || 'Vaccinations'} />
        <View style={styles.body}>
          <Card>
            <Text style={{ color: colors.text.muted }}>
              {t('vaccines.notFound') || 'Not found'}
            </Text>
          </Card>
        </View>
      </ScrollView>
    );
  }

  const passportPayload = {
    v: 1,
    holder: user?.fullName ?? '',
    vaccine: vaccine.name,
    manufacturer: vaccine.manufacturer,
    dose: vaccine.doseNumber,
    of: vaccine.totalDoses,
    given: vaccine.dateGiven,
    expires: vaccine.expiresAt,
    batch: vaccine.batchNumber,
    by: vaccine.administeredBy,
    at: vaccine.administeredAt,
    cert: vaccine.certificateNumber,
  };
  const qrValue = JSON.stringify(passportPayload);

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '—';

  function onDelete() {
    Alert.alert(
      t('common.confirm') || 'Confirm',
      t('vaccines.deleteConfirm') || 'Delete this vaccination record?',
      [
        { text: t('common.no') || 'No', style: 'cancel' },
        {
          text: t('common.yes') || 'Yes',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(vaccine!.id),
        },
      ],
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader showBack size="lg">
        <View style={styles.heroBlock}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={28} color={colors.text.inverse} />
          </View>
          <Text style={styles.title}>{vaccine.name}</Text>
          {vaccine.manufacturer ? (
            <Text style={styles.subtitle}>{vaccine.manufacturer}</Text>
          ) : null}
          {vaccine.doseNumber && vaccine.totalDoses ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {t('vaccines.dose') || 'Dose'} {vaccine.doseNumber}/
                {vaccine.totalDoses}
              </Text>
            </View>
          ) : null}
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <Card>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Text style={styles.qrTitle}>
              {t('vaccines.passportTitle') || 'Show at airport / clinic'}
            </Text>
            <View style={styles.qrBox}>
              <QRCode
                value={qrValue}
                size={220}
                color={colors.text.primary}
                backgroundColor={colors.surface.base}
              />
            </View>
            <Text style={styles.qrHint}>
              {t('vaccines.passportHint') ||
                'Scan this code to verify vaccination details'}
            </Text>
          </View>
        </Card>

        <Card>
          <DetailRow
            label={t('vaccines.dateGiven') || 'Date given'}
            value={formatDate(vaccine.dateGiven)}
            icon="calendar-outline"
          />
          {vaccine.expiresAt ? (
            <>
              <Divider />
              <DetailRow
                label={t('vaccines.expiresAt') || 'Expires'}
                value={formatDate(vaccine.expiresAt)}
                icon="time-outline"
              />
            </>
          ) : null}
          {vaccine.batchNumber ? (
            <>
              <Divider />
              <DetailRow
                label={t('vaccines.batchNumber') || 'Batch / Lot'}
                value={vaccine.batchNumber}
                icon="barcode-outline"
              />
            </>
          ) : null}
          {vaccine.administeredBy ? (
            <>
              <Divider />
              <DetailRow
                label={t('vaccines.administeredBy') || 'Administered by'}
                value={vaccine.administeredBy}
                icon="business-outline"
              />
            </>
          ) : null}
          {vaccine.administeredAt ? (
            <>
              <Divider />
              <DetailRow
                label={t('vaccines.administeredAt') || 'Location'}
                value={vaccine.administeredAt}
                icon="location-outline"
              />
            </>
          ) : null}
          {vaccine.certificateNumber ? (
            <>
              <Divider />
              <DetailRow
                label={t('vaccines.certificateNumber') || 'Certificate #'}
                value={vaccine.certificateNumber}
                icon="document-text-outline"
              />
            </>
          ) : null}
        </Card>

        <Button
          label={t('vaccines.delete') || 'Delete'}
          variant="danger"
          onPress={onDelete}
          loading={deleteMutation.isPending}
        />
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.text.secondary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return <View style={styles.divider} />;
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
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
  pill: {
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.overlay,
  },
  pillText: {
    color: colors.text.inverse,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  qrTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  qrBox: {
    padding: spacing.md,
    backgroundColor: colors.surface.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  qrHint: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  rowValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface.border,
    marginVertical: spacing.xs,
  },
}), [colors]);
}
