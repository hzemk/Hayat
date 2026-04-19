import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { AddDoctorSheet } from '@components/hospital/AddDoctorSheet';
import {
  HospitalDoctorRow,
  listHospitalDoctors,
  setHospitalDoctorAvailability,
} from '@services/api/hospital-portal.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

export default function HospitalDoctorsScreen() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const doctorsQuery = useQuery({
    queryKey: ['hospital-doctors'],
    queryFn: listHospitalDoctors,
  });

  const availability = useMutation({
    mutationFn: ({
      doctorId,
      isAvailable,
    }: {
      doctorId: string;
      isAvailable: boolean;
    }) => setHospitalDoctorAvailability(doctorId, isAvailable),
    onMutate: async ({ doctorId, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey: ['hospital-doctors'] });
      const previous = queryClient.getQueryData<HospitalDoctorRow[]>([
        'hospital-doctors',
      ]);
      if (previous) {
        queryClient.setQueryData<HospitalDoctorRow[]>(
          ['hospital-doctors'],
          previous.map((d) => (d.id === doctorId ? { ...d, isAvailable } : d)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['hospital-doctors'], ctx.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-stats'] });
    },
  });

  const filtered = useMemo(() => {
    const rows = doctorsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) => {
      const deptName = d.department
        ? `${d.department.nameAr} ${d.department.nameEn}`
        : '';
      return (
        (d.user.fullName ?? '').toLowerCase().includes(q) ||
        d.user.email.toLowerCase().includes(q) ||
        (d.specialty ?? '').toLowerCase().includes(q) ||
        (d.specialtyAr ?? '').toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q)
      );
    });
  }, [doctorsQuery.data, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('hospitalPortal.doctors.title')}
        subtitle={t('hospitalPortal.doctors.subtitle')}
        right={
          <Pressable
            onPress={() => setShowAdd(true)}
            hitSlop={8}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={colors.text.inverse} />
          </Pressable>
        }
      />
      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={16}
          color={colors.text.muted}
          style={{ marginHorizontal: spacing.sm }}
        />
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder={t('hospitalPortal.doctors.searchPlaceholder')}
          placeholderTextColor={colors.text.muted}
          autoCorrect={false}
        />
        {search ? (
          <Pressable
            onPress={() => setSearch('')}
            hitSlop={8}
            style={{ marginHorizontal: spacing.sm }}
          >
            <Ionicons name="close-circle" size={16} color={colors.text.muted} />
          </Pressable>
        ) : null}
      </View>
      {doctorsQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={doctorsQuery.isFetching}
              onRefresh={() =>
                queryClient.invalidateQueries({
                  queryKey: ['hospital-doctors'],
                })
              }
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search
                ? t('hospitalPortal.doctors.empty')
                : t('hospitalPortal.doctors.empty')}
            </Text>
          }
          renderItem={({ item }) => {
            const deptName = item.department
              ? isAr
                ? item.department.nameAr
                : item.department.nameEn
              : t('hospitalPortal.doctors.noDepartment');
            return (
              <Card padding="md" style={{ marginBottom: spacing.sm }}>
                <View style={styles.row}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person"
                      size={22}
                      color={colors.brand.primary}
                    />
                    <View
                      style={[
                        styles.presenceDot,
                        {
                          backgroundColor: item.isAvailable
                            ? colors.status.success
                            : colors.text.muted,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.user.fullName || item.user.email}
                    </Text>
                    <Text style={styles.specialty} numberOfLines={1}>
                      {(isAr && item.specialtyAr) || item.specialty}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {deptName}
                    </Text>
                  </View>
                  <Switch
                    value={item.isAvailable}
                    onValueChange={(val) =>
                      availability.mutate({
                        doctorId: item.id,
                        isAvailable: val,
                      })
                    }
                    trackColor={{
                      false: colors.surface.border,
                      true: colors.brand.primary,
                    }}
                  />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Ionicons
                      name="people"
                      size={12}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.statText}>
                      {t('hospitalPortal.doctors.threads', {
                        count: item.threadCount,
                      })}
                    </Text>
                  </View>
                  {item.unreadMessages > 0 ? (
                    <View
                      style={[
                        styles.statChip,
                        { backgroundColor: colors.tint.red.bg },
                      ]}
                    >
                      <Ionicons
                        name="mail-unread"
                        size={12}
                        color={colors.tint.red.fg}
                      />
                      <Text
                        style={[
                          styles.statText,
                          { color: colors.tint.red.fg },
                        ]}
                      >
                        {t('hospitalPortal.doctors.unread', {
                          count: item.unreadMessages,
                        })}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.statChip,
                      {
                        backgroundColor: item.isAvailable
                          ? colors.tint.green.bg
                          : colors.tint.gray.bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statText,
                        {
                          color: item.isAvailable
                            ? colors.tint.green.fg
                            : colors.tint.gray.fg,
                        },
                      ]}
                    >
                      {item.isAvailable
                        ? t('hospitalPortal.doctors.online')
                        : t('hospitalPortal.doctors.offline')}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
      <AddDoctorSheet visible={showAdd} onClose={() => setShowAdd(false)} />
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
        addBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.22)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        searchWrap: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.base,
          marginHorizontal: spacing.lg,
          marginTop: -spacing.md,
          marginBottom: spacing.md,
          borderRadius: radius.pill,
          ...shadow.soft,
        },
        search: {
          flex: 1,
          height: 40,
          fontSize: typography.size.sm,
          color: colors.text.primary,
        },
        list: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        avatar: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        presenceDot: {
          position: 'absolute',
          width: 12,
          height: 12,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.surface.base,
          bottom: -1,
          right: -1,
        },
        name: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        specialty: {
          fontSize: typography.size.xs,
          color: colors.brand.primary,
          fontWeight: typography.weight.semibold,
          marginTop: 2,
        },
        meta: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: 2,
        },
        statsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
          marginTop: spacing.sm,
        },
        statChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.surface.sunken,
        },
        statText: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          fontWeight: typography.weight.semibold,
        },
        empty: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
          textAlign: 'center',
          paddingVertical: spacing.xxl,
        },
      }),
    [colors],
  );
}
