import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import {
  IssuedPrescription,
  listIssuedPrescriptions,
} from '@services/api/doctor-portal.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

type SortMode = 'recent' | 'patient' | 'medication';

export default function DoctorPrescriptionsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['doctor-issued'],
    queryFn: listIssuedPrescriptions,
  });

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');

  const prescriptions = data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? prescriptions.filter((rx) => {
          const patient = rx.patient?.fullName?.toLowerCase() ?? '';
          if (patient.includes(q)) return true;
          return rx.items.some((i) =>
            i.medicationName.toLowerCase().includes(q),
          );
        })
      : prescriptions;

    const copy = [...base];
    if (sort === 'recent') {
      copy.sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
      );
    } else if (sort === 'patient') {
      copy.sort((a, b) =>
        (a.patient?.fullName ?? '').localeCompare(b.patient?.fullName ?? ''),
      );
    } else {
      copy.sort((a, b) =>
        (a.items[0]?.medicationName ?? '').localeCompare(
          b.items[0]?.medicationName ?? '',
        ),
      );
    }
    return copy;
  }, [prescriptions, query, sort]);

  const sortOptions: Array<{ key: SortMode; label: string }> = [
    { key: 'recent', label: t('doctorPortal.issued.sortRecent') },
    { key: 'patient', label: t('doctorPortal.issued.sortPatient') },
    { key: 'medication', label: t('doctorPortal.issued.sortMedication') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('doctorPortal.issued.title')}
        subtitle={t('doctorPortal.issued.subtitle')}
      />

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('doctorPortal.issued.searchPlaceholder')}
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
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

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>
            {t('doctorPortal.issued.sortBy')}
          </Text>
          <View style={styles.sortChips}>
            {sortOptions.map((opt) => {
              const active = sort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSort(opt.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : prescriptions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name="medical-outline"
            size={40}
            color={colors.text.muted}
          />
          <Text style={styles.emptyTitle}>
            {t('doctorPortal.issued.emptyTitle')}
          </Text>
          <Text style={styles.emptyBody}>
            {t('doctorPortal.issued.emptyBody')}
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name="search-outline"
            size={32}
            color={colors.text.muted}
          />
          <Text style={styles.emptyBody}>
            {t('doctorPortal.issued.noResults')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() =>
                queryClient.invalidateQueries({
                  queryKey: ['doctor-issued'],
                })
              }
            />
          }
          renderItem={({ item }) => <RxRow rx={item} highlight={query} />}
        />
      )}
    </View>
  );
}

function RxRow({
  rx,
  highlight,
}: {
  rx: IssuedPrescription;
  highlight: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const issued = new Date(rx.issuedAt).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const firstMeds = rx.items
    .slice(0, 3)
    .map((i) => i.medicationName)
    .join(' · ');
  const more = rx.items.length > 3 ? ` +${rx.items.length - 3}` : '';
  const countLabel = t('doctorPortal.issued.itemCount', {
    count: rx.items.length,
  });

  return (
    <Card
      padding="md"
      style={{ gap: spacing.xs }}
      onPress={() =>
        router.push({
          pathname: '/(doctor)/rx/edit/[rxId]',
          params: { rxId: rx.id },
        })
      }
    >
      <View style={styles.rowTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(rx.patient?.fullName || 'P').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName} numberOfLines={1}>
            {rx.patient?.fullName ?? '—'}
          </Text>
          <Text style={styles.issuedDate}>{issued}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{countLabel}</Text>
        </View>
      </View>
      <Text style={styles.medList} numberOfLines={2}>
        {firstMeds}
        {more}
      </Text>
      {rx.notes ? (
        <Text style={styles.notes} numberOfLines={2}>
          {rx.notes}
        </Text>
      ) : null}
    </Card>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.base,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    ...shadow.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.semibold,
  },
  sortChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.sunken,
  },
  chipActive: {
    backgroundColor: colors.brand.primary,
  },
  chipText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
  },
  chipTextActive: {
    color: colors.brand.on,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.purple.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.tint.purple.fg,
    fontWeight: typography.weight.bold,
  },
  patientName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  issuedDate: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  countPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.teal.bg,
  },
  countText: {
    fontSize: typography.size.xs,
    color: colors.tint.teal.fg,
    fontWeight: typography.weight.bold,
  },
  medList: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  notes: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
}), [colors]);
}
