import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  InsuranceCard,
  InsuranceCoverageScope,
  InsuranceCoverageType,
} from '@services/api/insurance.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

const COVERAGE_GRADIENTS: Record<
  InsuranceCoverageType,
  readonly [string, string, string]
> = {
  PUBLIC: ['#0EA5E9', '#0284C7', '#075985'],
  MILITARY: ['#65A30D', '#4D7C0F', '#365314'],
  PRIVATE: ['#9333EA', '#7E22CE', '#581C87'],
};

function coverageLabel(t: (k: string) => string, type: InsuranceCoverageType) {
  if (type === 'PUBLIC') return t('insurance.coverageTypes.public');
  if (type === 'MILITARY') return t('insurance.coverageTypes.military');
  return t('insurance.coverageTypes.private');
}

function scopeLabel(t: (k: string) => string, scope: InsuranceCoverageScope) {
  return scope === 'FAMILY'
    ? t('insurance.scopes.family')
    : t('insurance.scopes.selfOnly');
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

export function InsuranceCardVisual({
  card,
  compact,
  onPress,
}: {
  card: InsuranceCard;
  compact?: boolean;
  onPress?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { colors } = useTheme();
  const styles = useStyles(colors, compact);
  const gradient = COVERAGE_GRADIENTS[card.coverageType];
  const providerLabel = isAr && card.providerAr ? card.providerAr : card.provider;

  const body = (
    <LinearGradient
      colors={[...gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardKicker}>
            {coverageLabel(t, card.coverageType)}
          </Text>
          <Text style={styles.cardProvider} numberOfLines={2}>
            {providerLabel}
          </Text>
        </View>
        {card.photoUrl ? (
          <Image source={{ uri: card.photoUrl }} style={styles.cardPhoto} />
        ) : (
          <View style={[styles.cardPhoto, styles.cardPhotoFallback]}>
            <Ionicons name="person" size={compact ? 22 : 28} color="rgba(255,255,255,0.7)" />
          </View>
        )}
      </View>

      <View style={styles.cardMiddle}>
        <Text style={styles.cardLabel}>{t('insurance.memberNumber')}</Text>
        <Text style={styles.cardMember}>{card.memberNumber}</Text>
      </View>

      <View style={styles.cardBottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>{t('insurance.holderName')}</Text>
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
          <Text style={styles.scopeText}>{scopeLabel(t, card.coverageScope)}</Text>
        </View>
      </View>

      {!compact ? (
        <View style={styles.cardFooter}>
          <Text style={styles.cardLabel}>
            {formatDate(card.validFrom)} → {formatDate(card.validUntil)}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.92 }]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={styles.wrap}>{body}</View>;
}

function useStyles(colors: AppColors, compact?: boolean) {
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          borderRadius: radius.xl,
          ...shadow.soft,
        },
        card: {
          borderRadius: radius.xl,
          padding: compact ? spacing.md : spacing.lg,
          gap: compact ? spacing.sm : spacing.md,
          minHeight: compact ? 170 : 220,
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
          fontSize: compact ? typography.size.md : typography.size.lg,
          fontWeight: typography.weight.bold,
          maxWidth: 220,
        },
        cardPhoto: {
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: radius.lg,
          backgroundColor: 'rgba(255,255,255,0.18)',
        },
        cardPhotoFallback: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        cardMiddle: {
          marginTop: compact ? 2 : spacing.sm,
        },
        cardLabel: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        },
        cardMember: {
          color: '#FFFFFF',
          fontSize: compact ? typography.size.lg : typography.size.xl,
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
          fontSize: compact ? typography.size.sm : typography.size.md,
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
      }),
    [colors, compact],
  );
}
