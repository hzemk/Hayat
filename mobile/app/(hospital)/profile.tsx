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
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { LanguagePicker } from '@components/LanguagePicker';
import { ThemePicker } from '@components/ThemePicker';
import { getHospitalMe } from '@services/api/hospital-portal.api';
import { useAuthStore } from '@stores/auth';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

export default function HospitalProfileScreen() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const query = useQuery({
    queryKey: ['hospital-me'],
    queryFn: getHospitalMe,
  });

  const hospital = query.data;
  const name = hospital ? (isAr ? hospital.nameAr : hospital.nameEn) : '';

  async function onLogout() {
    Alert.alert(t('hospitalPortal.profile.logout'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('hospitalPortal.profile.logout'),
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={name || t('hospitalPortal.profile.title')}
        subtitle={user?.email}
      />
      {query.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {hospital?.isGovernment ? (
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color={colors.brand.on} />
              <Text style={styles.badgeText}>
                {t('hospitalPortal.profile.governmentBadge')}
              </Text>
            </View>
          ) : null}

          <Card padding="md" style={{ gap: spacing.md }}>
            <Row
              icon="location"
              label={t('hospitalPortal.profile.city')}
              value={hospital?.city ?? '—'}
            />
            <Row
              icon="call"
              label={t('hospitalPortal.profile.phone')}
              value={hospital?.phone ?? '—'}
            />
            <Row
              icon="map"
              label={t('hospitalPortal.profile.addressAr')}
              value={hospital?.addressAr ?? '—'}
            />
            <Row
              icon="map-outline"
              label={t('hospitalPortal.profile.addressEn')}
              value={hospital?.addressEn ?? '—'}
            />
          </Card>

          <LanguagePicker />

          <ThemePicker />

          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [
              styles.logout,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.status.error}
            />
            <Text style={styles.logoutText}>
              {t('hospitalPortal.profile.logout')}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={16} color={colors.brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        loading: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        body: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
          gap: spacing.md,
        },
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
          paddingHorizontal: spacing.sm + 2,
          height: 26,
          borderRadius: radius.pill,
          backgroundColor: colors.brand.primary,
        },
        badgeText: {
          color: colors.brand.on,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
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
        rowLabel: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          fontWeight: typography.weight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        rowValue: {
          fontSize: typography.size.md,
          color: colors.text.primary,
          marginTop: 2,
        },
        logout: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.status.error,
          backgroundColor: colors.tint.red.bg,
          marginTop: spacing.md,
        },
        logoutText: {
          color: colors.status.error,
          fontWeight: typography.weight.bold,
          fontSize: typography.size.sm,
        },
      }),
    [colors],
  );
}
