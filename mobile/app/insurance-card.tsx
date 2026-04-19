import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { Card } from '@components/Card';
import { GradientButton } from '@components/GradientButton';
import { InsuranceCardVisual } from '@components/InsuranceCardVisual';
import {
  getInsuranceCard,
  syncInsuranceFromSanad,
  type InsuranceCoverageScope,
  type InsuranceCoverageType,
  type InsuranceCardSource,
} from '@services/api/insurance.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, spacing, typography, useTheme } from '@theme/index';

export default function InsuranceCardScreen() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['insurance-card'],
    queryFn: getInsuranceCard,
  });

  const sync = useMutation({
    mutationFn: syncInsuranceFromSanad,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-card'] });
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  const card = data ?? null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <GradientHeader
        showBack
        title={t('insurance.title')}
        subtitle={t('insurance.subtitle')}
      />

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : !card ? (
          <Card>
            <View style={styles.empty}>
              <Ionicons
                name="card-outline"
                size={36}
                color={colors.text.muted}
              />
              <Text style={styles.emptyTitle}>
                {t('insurance.noCardTitle')}
              </Text>
              <Text style={styles.emptyText}>
                {t('insurance.noCardHint')}
              </Text>
              <View style={{ height: spacing.md }} />
              <GradientButton
                label={t('insurance.syncSanad')}
                onPress={() => sync.mutate()}
                loading={sync.isPending}
              />
            </View>
          </Card>
        ) : (
          <>
            <InsuranceCardVisual card={card} />

            <SectionContainer title={t('insurance.details')} gap="sm">
              <Card>
                <View style={{ gap: spacing.md }}>
                  <DetailRow
                    label={t('insurance.holderName')}
                    value={card.holderName}
                  />
                  <DetailRow
                    label={t('insurance.memberNumber')}
                    value={card.memberNumber}
                    mono
                  />
                  <DetailRow
                    label={t('insurance.nationalId')}
                    value={card.nationalId}
                    mono
                  />
                  <DetailRow
                    label={t('insurance.coverage')}
                    value={`${coverageLabel(t, card.coverageType)} · ${scopeLabel(t, card.coverageScope)}`}
                  />
                  <DetailRow
                    label={t('insurance.validFrom')}
                    value={formatDate(card.validFrom)}
                  />
                  <DetailRow
                    label={t('insurance.validUntil')}
                    value={formatDate(card.validUntil)}
                    accent={isExpired(card.validUntil)}
                  />
                  {card.issuedByHospital ? (
                    <DetailRow
                      label={t('insurance.issuedBy')}
                      value={
                        isAr
                          ? card.issuedByHospital.nameAr
                          : card.issuedByHospital.nameEn
                      }
                    />
                  ) : null}
                  <DetailRow
                    label={t('insurance.source')}
                    value={sourceLabel(t, card.source)}
                  />
                </View>
              </Card>
            </SectionContainer>

            <Pressable
              onPress={() => sync.mutate()}
              style={styles.syncBtn}
              disabled={sync.isPending}
            >
              {sync.isPending ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <>
                  <Ionicons
                    name="sync"
                    size={16}
                    color={colors.brand.primary}
                  />
                  <Text style={styles.syncText}>
                    {t('insurance.refreshFromSanad')}
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={styles.footer}>{t('insurance.readOnlyHint')}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          mono ? styles.mono : null,
          accent ? styles.detailValueAccent : null,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function coverageLabel(t: (k: string) => string, type: InsuranceCoverageType) {
  switch (type) {
    case 'PUBLIC':
      return t('insurance.coverageTypes.public');
    case 'MILITARY':
      return t('insurance.coverageTypes.military');
    case 'PRIVATE':
      return t('insurance.coverageTypes.private');
  }
}

function scopeLabel(t: (k: string) => string, scope: InsuranceCoverageScope) {
  return scope === 'FAMILY'
    ? t('insurance.scopes.family')
    : t('insurance.scopes.selfOnly');
}

function sourceLabel(t: (k: string) => string, source: InsuranceCardSource) {
  switch (source) {
    case 'SANAD':
      return t('insurance.sources.sanad');
    case 'HOSPITAL':
      return t('insurance.sources.hospital');
    case 'ADMIN':
      return t('insurance.sources.admin');
  }
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function isExpired(validUntil: string) {
  return new Date(validUntil).getTime() < Date.now();
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
    flex: 1,
    textAlign: 'right',
  },
  detailValueAccent: {
    color: colors.status.error,
  },
  mono: {
    fontVariant: ['tabular-nums'],
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  syncText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  footer: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
}), [colors]);
}
