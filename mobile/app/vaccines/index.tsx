import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { GradientButton } from '@components/GradientButton';
import {
  listVaccinations,
  Vaccination,
} from '@services/api/vaccinations.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

function expiryState(v: Vaccination): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!v.expiresAt) return 'none';
  const exp = new Date(v.expiresAt).getTime();
  const now = Date.now();
  if (exp < now) return 'expired';
  if (exp - now < 60 * 24 * 60 * 60 * 1000) return 'expiring';
  return 'valid';
}

export default function VaccinesList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-JO' : 'en-GB';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data = [], isLoading } = useQuery({
    queryKey: ['vaccinations'],
    queryFn: listVaccinations,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader
        showBack
        title={t('vaccines.title') || 'Vaccinations'}
        subtitle={t('vaccines.subtitle') || 'Your immunization passport'}
      />

      <View style={styles.body}>
        <GradientButton
          label={t('vaccines.add') || 'Add vaccination'}
          onPress={() => router.push('/vaccines/new')}
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
                name="shield-checkmark-outline"
                size={36}
                color={colors.text.muted}
              />
              <Text style={styles.muted}>
                {t('vaccines.empty') ||
                  'No vaccinations recorded yet. Add your first one to build your passport.'}
              </Text>
            </View>
          </Card>
        ) : (
          data.map((v) => {
            const state = expiryState(v);
            const tone =
              state === 'expired'
                ? colors.tint.red
                : state === 'expiring'
                  ? colors.tint.yellow
                  : colors.tint.green;
            return (
              <Card
                key={v.id}
                onPress={() => router.push(`/vaccines/${v.id}`)}
              >
                <View style={styles.row}>
                  <View style={[styles.iconBubble, { backgroundColor: tone.bg }]}>
                    <Ionicons
                      name="shield-checkmark"
                      size={22}
                      color={tone.fg}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {v.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {new Date(v.dateGiven).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {v.doseNumber && v.totalDoses
                        ? `  ·  ${t('vaccines.dose') || 'Dose'} ${v.doseNumber}/${v.totalDoses}`
                        : ''}
                    </Text>
                    {v.manufacturer ? (
                      <Text style={styles.sub} numberOfLines={1}>
                        {v.manufacturer}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.statePill}>
                    <Text style={[styles.stateText, { color: tone.fg }]}>
                      {state === 'expired'
                        ? t('vaccines.expired') || 'Expired'
                        : state === 'expiring'
                          ? t('vaccines.expiring') || 'Expiring'
                          : state === 'valid'
                            ? t('vaccines.valid') || 'Valid'
                            : ''}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.text.muted}
                    />
                  </View>
                </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sub: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stateText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
}), [colors]);
}
