import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { SectionContainer } from '@components/SectionContainer';
import { useAuthStore } from '@stores/auth';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <GradientHeader showBack size="lg">
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={styles.heroTitle}>{t('profile.edit.title')}</Text>
            <Text style={styles.heroSubtitle}>
              {t('profile.edit.readOnlySubtitle')}
            </Text>
          </View>
        </GradientHeader>

        <View style={styles.body}>
          <View style={styles.lockBanner}>
            <Ionicons
              name="lock-closed"
              size={16}
              color={colors.brand.primary}
            />
            <Text style={styles.lockText}>
              {t('profile.edit.readOnlyHint')}
            </Text>
          </View>

          <SectionContainer title={t('profile.edit.basics')}>
            <Card>
              <View style={{ gap: spacing.md }}>
                <ReadRow
                  label={t('profile.edit.fullName')}
                  value={user?.fullName ?? '—'}
                />
                <ReadRow
                  label={t('profile.edit.phone')}
                  value={user?.phoneNumber ?? '—'}
                />
                <ReadRow
                  label={t('profile.edit.dob')}
                  value={user?.dateOfBirth ?? '—'}
                />
              </View>
            </Card>
          </SectionContainer>

          <Card>
            <Text style={styles.noticeTitle}>
              {t('profile.edit.healthLockedTitle')}
            </Text>
            <Text style={styles.noticeBody}>
              {t('profile.edit.healthLockedBody')}
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  heroTitle: {
    color: colors.text.inverse,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  heroSubtitle: {
    color: colors.brand.onMuted,
    fontSize: typography.size.sm,
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.tint.teal.bg,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  lockText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  rowLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  rowValue: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  noticeTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  noticeBody: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
}), [colors]);
}
