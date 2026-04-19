import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { GradientButton } from '@components/GradientButton';
import { listPrescriptions } from '@services/api/prescriptions.api';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

export default function PrescriptionsScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-JO' : 'en-GB';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data = [], isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: listPrescriptions,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader
        showBack
        title={t('prescriptions.title')}
        subtitle={t('prescriptions.subtitle') || 'Your medications'}
      />
      <View style={styles.body}>
        <GradientButton
          label={t('prescriptions.scan') || 'Scan prescription'}
          onPress={() => router.push('/prescriptions/scan')}
          leftIcon={
            <Ionicons name="scan" size={18} color={colors.text.inverse} />
          }
        />

        {isLoading ? (
          <Card>
            <Text style={styles.muted}>
              {t('common.loading') || 'Loading...'}
            </Text>
          </Card>
        ) : data.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Ionicons
                name="document-text-outline"
                size={36}
                color={colors.text.muted}
              />
              <Text style={styles.muted}>{t('prescriptions.empty')}</Text>
            </View>
          </Card>
        ) : (
          data.map((rx) => {
            const tone =
              rx.status === 'ACTIVE'
                ? colors.tint.green
                : rx.status === 'DISPENSED'
                  ? colors.tint.blue
                  : rx.status === 'EXPIRED' || rx.status === 'CANCELLED'
                    ? colors.tint.red
                    : colors.tint.gray;
            return (
              <Card key={rx.id}>
                <View style={styles.rxHeader}>
                  <Text style={styles.rxDate}>
                    {new Date(rx.issuedAt).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.pillText, { color: tone.fg }]}>
                      {rx.status}
                    </Text>
                  </View>
                </View>
                {rx.notes ? (
                  <Text style={styles.notes}>{rx.notes}</Text>
                ) : null}
                <View style={styles.items}>
                  {rx.items.map((i) => (
                    <View key={i.id} style={styles.item}>
                      <Ionicons
                        name="ellipse"
                        size={6}
                        color={colors.brand.primary}
                        style={{ marginTop: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{i.medicationName}</Text>
                        <Text style={styles.itemMeta}>
                          {i.dose} · {i.frequency}
                          {i.durationDays ? ` · ${i.durationDays}d` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                {rx.doctorUser?.fullName ? (
                  <Text style={styles.doctor}>
                    Dr. {rx.doctorUser.fullName}
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}
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
    gap: spacing.md,
  },
  muted: {
    color: colors.text.muted,
    textAlign: 'center',
    fontSize: typography.size.sm,
  },
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rxDate: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  pillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  notes: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  items: { gap: spacing.xs },
  item: { flexDirection: 'row', gap: spacing.sm },
  itemName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  itemMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  doctor: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
}), [colors]);
}
