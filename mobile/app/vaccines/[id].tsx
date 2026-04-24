import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import {
  createVaccineShareToken,
  getVaccination,
  vaccineShareUrl,
  Vaccination,
} from '@services/api/vaccinations.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

export default function VaccineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vaccineId = String(id);
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-JO' : 'en-GB';
  const isAr = i18n.language === 'ar';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data: vaccine } = useQuery<Vaccination>({
    queryKey: ['vaccination', vaccineId],
    queryFn: () => getVaccination(vaccineId),
    enabled: Boolean(vaccineId),
  });

  // Short-lived (24h) URL the QR encodes — points to a public HTML cert
  // that paramedics / airport health desks can read in any browser.
  const { data: shareToken } = useQuery({
    queryKey: ['vaccine-share-token', vaccineId],
    queryFn: () => createVaccineShareToken(vaccineId),
    enabled: Boolean(vaccineId),
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: 12 * 60 * 60 * 1000,
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

  // Until the share token arrives, encode the eventual URL skeleton so the
  // QR isn't blank. Once the real token loads, the QR re-renders with the
  // signed URL automatically.
  const qrValue = shareToken
    ? vaccineShareUrl(shareToken.path)
    : 'https://hayat.app';

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '—';

  const doctorName =
    vaccine.administeredByDoctor?.user.fullName ??
    vaccine.administeredByDoctor?.user.email ??
    null;
  const doctorSpecialty = vaccine.administeredByDoctor
    ? isAr
      ? (vaccine.administeredByDoctor.specialtyAr ??
        vaccine.administeredByDoctor.specialty)
      : vaccine.administeredByDoctor.specialty
    : null;
  const hospitalName = vaccine.administeredAtHospital
    ? isAr
      ? vaccine.administeredAtHospital.nameAr
      : vaccine.administeredAtHospital.nameEn
    : (vaccine.administeredAt ?? null);
  const hospitalCity = vaccine.administeredAtHospital?.city ?? null;

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

        {doctorName || hospitalName ? (
          <Card>
            <Text style={styles.sectionLabel}>
              {t('vaccines.administeredSection') || 'Administered by'}
            </Text>
            {doctorName ? (
              <View style={styles.providerRow}>
                <View style={styles.providerIcon}>
                  <Ionicons
                    name="medkit"
                    size={18}
                    color={colors.brand.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{doctorName}</Text>
                  {doctorSpecialty ? (
                    <Text style={styles.providerMeta}>{doctorSpecialty}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {hospitalName ? (
              <>
                {doctorName ? <Divider /> : null}
                <View style={styles.providerRow}>
                  <View style={styles.providerIcon}>
                    <Ionicons
                      name="business"
                      size={18}
                      color={colors.brand.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{hospitalName}</Text>
                    {hospitalCity ? (
                      <Text style={styles.providerMeta}>{hospitalCity}</Text>
                    ) : null}
                  </View>
                </View>
              </>
            ) : null}
          </Card>
        ) : null}
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
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  providerMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
}), [colors]);
}
