import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { AddDepartmentSheet } from '@components/hospital/AddDepartmentSheet';
import { listHospitalDepartments } from '@services/api/hospital-portal.api';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

export default function HospitalDepartmentsScreen() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const query = useQuery({
    queryKey: ['hospital-departments'],
    queryFn: listHospitalDepartments,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('hospitalPortal.departments.title')}
        subtitle={t('hospitalPortal.departments.subtitle')}
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
      {query.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() =>
                queryClient.invalidateQueries({
                  queryKey: ['hospital-departments'],
                })
              }
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {t('hospitalPortal.departments.empty')}
            </Text>
          }
          renderItem={({ item }) => {
            const name = isAr ? item.nameAr : item.nameEn;
            return (
              <Card
                padding="md"
                style={{ marginBottom: spacing.sm }}
                onPress={() =>
                  router.push(`/hospital-departments/${item.id}`)
                }
              >
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name="business"
                      size={20}
                      color={colors.brand.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.code}>{item.code}</Text>
                  </View>
                  <Ionicons
                    name={isAr ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.text.muted}
                  />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.chip}>
                    <Ionicons
                      name="people"
                      size={12}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.chipText}>
                      {t('hospitalPortal.departments.staff', {
                        count: item.doctorCount,
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: colors.tint.green.bg },
                    ]}
                  >
                    <View style={styles.pulseDot} />
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.tint.green.fg },
                      ]}
                    >
                      {t('hospitalPortal.departments.online', {
                        count: item.onlineCount,
                      })}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
      <AddDepartmentSheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
      />
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
        list: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        iconWrap: {
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        name: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        code: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          marginTop: 2,
          letterSpacing: 0.5,
        },
        statsRow: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginTop: spacing.sm,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.surface.sunken,
        },
        chipText: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          fontWeight: typography.weight.semibold,
        },
        pulseDot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.tint.green.fg,
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
