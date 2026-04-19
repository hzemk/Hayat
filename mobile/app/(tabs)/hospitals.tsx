import { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { InfoChip } from '@components/InfoChip';
import { GradientButton } from '@components/GradientButton';
import { Hospital, listHospitals } from '@services/api/hospitals.api';
import { localizeCity } from '@i18n/places';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

type Filter = 'ALL' | 'GOV' | 'PRIVATE';

export default function HospitalsScreen() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => listHospitals(),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((h) => {
      if (filter === 'GOV' && !h.isGovernment) return false;
      if (filter === 'PRIVATE' && h.isGovernment) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        h.nameAr.toLowerCase().includes(q) ||
        h.nameEn.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q)
      );
    });
  }, [data, query, filter]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <GradientHeader title={t('hospitals.title')}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('hospitals.searchPlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.text.muted}
              />
            </Pressable>
          ) : null}
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <View style={styles.filters}>
          {(
            [
              { key: 'ALL' as const, label: t('hospitals.nearMe') },
              { key: 'GOV' as const, label: t('hospitals.government') },
              { key: 'PRIVATE' as const, label: t('hospitals.private') },
            ]
          ).map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: colors.brand.primary,
                    borderColor: colors.brand.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && { color: '#fff' },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <Card variant="outline">
            <Text style={{ color: colors.text.muted }}>
              {t('common.loading')}
            </Text>
          </Card>
        ) : filtered.length === 0 ? (
          <Card variant="outline">
            <Text style={{ color: colors.text.muted }}>
              {t('common.error')}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {filtered.map((h) => (
              <HospitalCard key={h.id} hospital={h} locale={i18n.language} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function HospitalCard({
  hospital,
  locale,
}: {
  hospital: Hospital;
  locale: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const isRtl = locale === 'ar';
  const name = isRtl ? hospital.nameAr : hospital.nameEn;
  const city = localizeCity(hospital.city, isRtl);
  return (
    <Card style={styles.hospitalCard}>
      <View style={styles.hospitalHeader}>
        <View
          style={[
            styles.hospitalIcon,
            {
              backgroundColor: hospital.isGovernment
                ? colors.tint.teal.bg
                : colors.tint.red.bg,
            },
          ]}
        >
          <Ionicons
            name="business"
            size={20}
            color={
              hospital.isGovernment
                ? colors.tint.teal.fg
                : colors.tint.red.fg
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hospitalName}>{name}</Text>
          <View style={styles.hospitalMetaRow}>
            <Ionicons name="location" size={12} color={colors.text.muted} />
            <Text style={styles.hospitalMeta}>{city}</Text>
          </View>
        </View>
        <InfoChip
          label={
            hospital.isGovernment
              ? t('hospitals.government')
              : t('hospitals.private')
          }
          tint={hospital.isGovernment ? 'green' : 'blue'}
          size="sm"
        />
      </View>

      <View style={styles.actions}>
        {hospital.phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${hospital.phone}`)}
            style={[styles.actionBtn, styles.actionSecondary]}
          >
            <Ionicons name="call" size={16} color={colors.brand.primary} />
            <Text style={styles.actionSecondaryText}>{t('hospitals.call')}</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <GradientButton
            label={t('hospitals.book')}
            size="md"
            onPress={() =>
              router.push({
                pathname: '/booking',
                params: { hospitalId: hospital.id },
              })
            }
            rightIcon={<Ionicons name="arrow-forward" size={16} color="#fff" />}
          />
        </View>
      </View>
    </Card>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.base,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 44,
    ...shadow.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
  },
  chipText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
  },
  hospitalCard: { gap: spacing.md },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hospitalIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  hospitalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  hospitalMeta: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  actionSecondary: {
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.raised,
  },
  actionSecondaryText: {
    fontSize: typography.size.sm,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
  },
}), [colors]);
}
