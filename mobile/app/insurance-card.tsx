import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { Card } from '@components/Card';
import { GradientButton } from '@components/GradientButton';
import {
  getInsuranceCard,
  syncInsuranceFromSanad,
  type InsuranceCard,
  type InsuranceCoverageScope,
  type InsuranceCoverageType,
  type InsuranceCardSource,
} from '@services/api/insurance.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

const COVERAGE_GRADIENTS: Record<
  InsuranceCoverageType,
  readonly [string, string, string]
> = {
  PUBLIC: ['#0EA5E9', '#0284C7', '#075985'],
  MILITARY: ['#65A30D', '#4D7C0F', '#365314'],
  PRIVATE: ['#9333EA', '#7E22CE', '#581C87'],
};

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
  const providerLabel = useMemo(() => {
    if (!card) return '';
    return isAr && card.providerAr ? card.providerAr : card.provider;
  }, [card, isAr]);

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
            <CardVisual
              card={card}
              providerLabel={providerLabel}
              coverageLabel={coverageLabel(t, card.coverageType)}
              scopeLabel={scopeLabel(t, card.coverageScope)}
            />

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

function CardVisual({
  card,
  providerLabel,
  coverageLabel,
  scopeLabel,
}: {
  card: InsuranceCard;
  providerLabel: string;
  coverageLabel: string;
  scopeLabel: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const gradient = COVERAGE_GRADIENTS[card.coverageType];
  return (
    <View style={styles.cardWrap}>
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardKicker}>{coverageLabel}</Text>
            <Text style={styles.cardProvider} numberOfLines={2}>
              {providerLabel}
            </Text>
          </View>
          {card.photoUrl ? (
            <Image source={{ uri: card.photoUrl }} style={styles.cardPhoto} />
          ) : (
            <View style={[styles.cardPhoto, styles.cardPhotoFallback]}>
              <Ionicons name="person" size={28} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>

        <View style={styles.cardMiddle}>
          <Text style={styles.cardLabel}>{providerLabelKey('member')}</Text>
          <Text style={styles.cardMember}>{card.memberNumber}</Text>
        </View>

        <View style={styles.cardBottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{providerLabelKey('holder')}</Text>
            <Text style={styles.cardName} numberOfLines={1}>
              {card.holderName}
            </Text>
          </View>
          <View style={styles.scopePill}>
            <Ionicons
              name={card.coverageScope === 'FAMILY' ? 'people' : 'person'}
              size={12}
              color="#FFFFFF"
            />
            <Text style={styles.scopeText}>{scopeLabel}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardLabel}>
            {formatDate(card.validFrom)} → {formatDate(card.validUntil)}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function providerLabelKey(_kind: 'member' | 'holder') {
  // Resolved by parent screen; the small label inside the card is just a static glyph.
  return _kind === 'member' ? 'MEMBER NO.' : 'HOLDER';
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
  cardWrap: {
    borderRadius: radius.xl,
    ...shadow.soft,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 220,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardKicker: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: typography.size.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardProvider: {
    color: '#FFFFFF',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    maxWidth: 220,
  },
  cardPhoto: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  cardPhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMiddle: {
    marginTop: spacing.sm,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cardMember: {
    color: '#FFFFFF',
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  scopeText: {
    color: '#FFFFFF',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: spacing.sm,
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
