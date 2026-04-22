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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { listHospitalDepartments } from '@services/api/hospital-portal.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

export default function HospitalRosterScreen() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const departments = useQuery({
    queryKey: ['hospital-departments'],
    queryFn: listHospitalDepartments,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = departments.data ?? [];
    if (!q) return list;
    return list.filter((d) =>
      (`${d.nameEn} ${d.nameAr} ${d.code}`).toLowerCase().includes(q),
    );
  }, [departments.data, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('hospitalPortal.roster.title')}
        subtitle={t('hospitalPortal.roster.subtitle')}
      >
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.85)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('hospitalPortal.roster.searchDepartments')}
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={[styles.searchInput, isAr && { textAlign: 'right' }]}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color="rgba(255,255,255,0.85)"
              />
            </Pressable>
          ) : null}
        </View>
      </GradientHeader>

      {departments.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={departments.isFetching}
              onRefresh={() =>
                qc.invalidateQueries({ queryKey: ['hospital-departments'] })
              }
              tintColor={colors.brand.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.helper}>
              {t('hospitalPortal.roster.pickDepartment')}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name={query ? 'search' : 'business-outline'}
                size={28}
                color={colors.text.muted}
              />
              <Text style={styles.emptyText}>
                {query
                  ? t('hospitalPortal.roster.noMatches')
                  : t('hospitalPortal.roster.empty')}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => {
            const name = isAr ? item.nameAr : item.nameEn;
            return (
              <Pressable
                onPress={() => router.push(`/hospital-roster/${item.id}`)}
                style={({ pressed }) => [
                  styles.cardWrap,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
                ]}
              >
                <LinearGradient
                  colors={[...colors.brand.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.accent}
                />
                <View style={styles.cardBody}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name="business"
                      size={22}
                      color={colors.brand.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.code} numberOfLines={1}>
                      {item.code}
                    </Text>
                    <View style={styles.chipsRow}>
                      <View style={styles.chip}>
                        <Ionicons
                          name="people"
                          size={12}
                          color={colors.text.secondary}
                        />
                        <Text style={styles.chipText}>
                          {t('hospitalPortal.roster.doctors', {
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
                        <View style={styles.liveDot} />
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
                  </View>
                  <Ionicons
                    name={isAr ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.text.muted}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}
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
        searchWrap: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          height: 42,
        },
        searchInput: {
          flex: 1,
          color: '#FFFFFF',
          fontSize: typography.size.sm,
          paddingVertical: 0,
        },
        list: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        helper: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          marginBottom: spacing.md,
        },
        cardWrap: {
          borderRadius: radius.xl,
          backgroundColor: colors.surface.base,
          flexDirection: 'row',
          overflow: 'hidden',
          ...shadow.soft,
        },
        accent: {
          width: 6,
        },
        cardBody: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
        },
        iconWrap: {
          width: 46,
          height: 46,
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
          letterSpacing: 0.6,
          marginTop: 2,
        },
        chipsRow: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginTop: spacing.sm,
          flexWrap: 'wrap',
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
        liveDot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.tint.green.fg,
        },
        emptyWrap: {
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.xxl,
        },
        emptyText: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
        },
      }),
    [colors],
  );
}
