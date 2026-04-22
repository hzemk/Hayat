import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DepartmentRoster,
  RosterDoctor,
  RosterPatient,
  getDepartmentRoster,
} from '@services/api/hospital-portal.api';
import { PatientCareSheet } from '@components/hospital/PatientCareSheet';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SortKey = 'name' | 'patients' | 'recent' | 'status';

const SORT_OPTIONS: SortKey[] = ['name', 'patients', 'recent', 'status'];

function formatRelative(iso: string | null, lang: string): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return lang === 'ar' ? 'الآن' : 'just now';
  if (minutes < 60)
    return lang === 'ar' ? `قبل ${minutes} د` : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return lang === 'ar' ? `قبل ${hours} س` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return lang === 'ar' ? `قبل ${days} يوم` : `${days}d ago`;
  const weeks = Math.round(days / 7);
  return lang === 'ar' ? `قبل ${weeks} أسبوع` : `${weeks}w ago`;
}

function lastActivity(doctor: RosterDoctor): number {
  let latest = 0;
  for (const p of doctor.patients) {
    if (p.lastMessageAt) {
      const t = new Date(p.lastMessageAt).getTime();
      if (t > latest) latest = t;
    }
  }
  return latest;
}

function patientMatches(p: RosterPatient, q: string): boolean {
  if (!q) return true;
  return `${p.fullName ?? ''} ${p.email} ${p.phoneNumber ?? ''}`
    .toLowerCase()
    .includes(q);
}

export default function HospitalRosterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const departmentId = String(id);
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedCare, setSelectedCare] = useState<{
    doctorId: string;
    patientId: string;
    patientName: string | null;
  } | null>(null);

  const roster = useQuery<DepartmentRoster>({
    queryKey: ['hospital-roster', departmentId],
    queryFn: () => getDepartmentRoster(departmentId),
    enabled: Boolean(departmentId),
  });

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { doctors, totalDoctors, totalPatients } = useMemo(() => {
    const raw = roster.data?.doctors ?? [];
    const q = query.trim().toLowerCase();

    const filtered = raw
      .map((d) => {
        const docHit =
          !q ||
          [
            d.user.fullName ?? '',
            d.user.email,
            d.specialty,
            d.specialtyAr ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(q);
        const patients = q
          ? docHit
            ? d.patients
            : d.patients.filter((p) => patientMatches(p, q))
          : d.patients;
        return { doctor: d, patients, docHit };
      })
      .filter((r) => r.docHit || r.patients.length > 0);

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'patients':
          return b.doctor.patientCount - a.doctor.patientCount;
        case 'recent':
          return lastActivity(b.doctor) - lastActivity(a.doctor);
        case 'status':
          if (a.doctor.isAvailable === b.doctor.isAvailable) {
            return (a.doctor.user.fullName ?? '').localeCompare(
              b.doctor.user.fullName ?? '',
            );
          }
          return a.doctor.isAvailable ? -1 : 1;
        case 'name':
        default:
          return (a.doctor.user.fullName ?? '').localeCompare(
            b.doctor.user.fullName ?? '',
          );
      }
    });

    return {
      doctors: sorted,
      totalDoctors: raw.length,
      totalPatients: raw.reduce((n, d) => n + d.patientCount, 0),
    };
  }, [roster.data, query, sort]);

  if (roster.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const data = roster.data;
  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.empty}>{t('common.error')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const name = isAr ? data.nameAr : data.nameEn;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={[...colors.brand.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backBtn}
          >
            <Ionicons
              name={isAr ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSubtitle}>
              {data.code} ·{' '}
              {t('hospitalPortal.roster.doctors', { count: totalDoctors })} ·{' '}
              {t('hospitalPortal.roster.patients', { count: totalPatients })}
            </Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.85)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('hospitalPortal.roster.searchPeople')}
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
      </LinearGradient>

      <View style={styles.sortBar}>
        <Ionicons name="swap-vertical" size={14} color={colors.text.muted} />
        <Text style={styles.sortLabel}>
          {t('hospitalPortal.roster.sort')}
        </Text>
        <FlatList
          data={SORT_OPTIONS}
          keyExtractor={(k) => k}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortPills}
          renderItem={({ item }) => {
            const active = sort === item;
            return (
              <Pressable
                onPress={() => setSort(item)}
                style={[
                  styles.sortPill,
                  active && {
                    backgroundColor: colors.brand.primary,
                    borderColor: colors.brand.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sortPillText,
                    active && { color: '#FFFFFF' },
                  ]}
                >
                  {t(`hospitalPortal.roster.sortBy.${item}`)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={doctors}
        keyExtractor={(d) => d.doctor.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={roster.isFetching}
            onRefresh={() =>
              qc.invalidateQueries({
                queryKey: ['hospital-roster', departmentId],
              })
            }
            tintColor={colors.brand.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="search"
              size={28}
              color={colors.text.muted}
            />
            <Text style={styles.empty}>
              {t('hospitalPortal.roster.noMatches')}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <DoctorGroup
            doctor={item.doctor}
            visiblePatients={item.patients}
            expanded={expanded.has(item.doctor.id)}
            onToggle={() => toggleExpanded(item.doctor.id)}
            onPickPatient={(patient) =>
              setSelectedCare({
                doctorId: item.doctor.id,
                patientId: patient.id,
                patientName: patient.fullName,
              })
            }
            highlight={query.trim().toLowerCase()}
            isAr={isAr}
            lang={i18n.language}
          />
        )}
      />

      <PatientCareSheet
        visible={!!selectedCare}
        doctorId={selectedCare?.doctorId ?? null}
        patientId={selectedCare?.patientId ?? null}
        patientName={selectedCare?.patientName ?? null}
        onClose={() => setSelectedCare(null)}
      />
    </SafeAreaView>
  );
}

function DoctorGroup({
  doctor,
  visiblePatients,
  expanded,
  onToggle,
  onPickPatient,
  highlight,
  isAr,
  lang,
}: {
  doctor: RosterDoctor;
  visiblePatients: RosterPatient[];
  expanded: boolean;
  onToggle: () => void;
  onPickPatient: (patient: RosterPatient) => void;
  highlight: string;
  isAr: boolean;
  lang: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const specialty = isAr
    ? doctor.specialtyAr || doctor.specialty
    : doctor.specialty;
  const initials = (doctor.user.fullName ?? doctor.user.email)
    .replace(/^dr\.?\s*/i, '')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const totalUnread = doctor.patients.reduce((n, p) => n + p.unread, 0);

  return (
    <View style={styles.groupWrap}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.doctorRow,
          pressed && { opacity: 0.95 },
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'D'}</Text>
          <View
            style={[
              styles.presenceDot,
              {
                backgroundColor: doctor.isAvailable
                  ? colors.status.success
                  : colors.text.muted,
              },
            ]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName} numberOfLines={1}>
            {doctor.user.fullName ?? doctor.user.email}
          </Text>
          <Text style={styles.doctorMeta} numberOfLines={1}>
            {specialty}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons
                name="person"
                size={11}
                color={colors.text.secondary}
              />
              <Text style={styles.metaChipText}>
                {t('hospitalPortal.roster.patients', {
                  count: doctor.patientCount,
                })}
              </Text>
            </View>
            {totalUnread > 0 ? (
              <View
                style={[
                  styles.metaChip,
                  { backgroundColor: colors.tint.red.bg },
                ]}
              >
                <Ionicons
                  name="mail-unread"
                  size={11}
                  color={colors.tint.red.fg}
                />
                <Text
                  style={[
                    styles.metaChipText,
                    { color: colors.tint.red.fg },
                  ]}
                >
                  {t('hospitalPortal.roster.unread', { count: totalUnread })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.text.muted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.patientList}>
          {visiblePatients.length === 0 ? (
            <Text style={styles.emptyInline}>
              {highlight
                ? t('hospitalPortal.roster.noMatches')
                : t('hospitalPortal.roster.noPatients')}
            </Text>
          ) : (
            visiblePatients.map((p, idx) => (
              <Pressable
                key={p.id}
                onPress={() => onPickPatient(p)}
                style={({ pressed }) => [
                  styles.patientRow,
                  idx !== visiblePatients.length - 1 && styles.patientDivider,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.patientAvatar}>
                  <Ionicons
                    name={
                      p.gender === 'FEMALE'
                        ? 'woman'
                        : p.gender === 'MALE'
                          ? 'man'
                          : 'person'
                    }
                    size={14}
                    color={colors.brand.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName} numberOfLines={1}>
                    {p.fullName ?? p.email}
                  </Text>
                  <Text style={styles.patientMeta} numberOfLines={1}>
                    {formatRelative(p.lastMessageAt, lang) ??
                      t('hospitalPortal.roster.never')}
                  </Text>
                </View>
                {p.unread > 0 ? (
                  <View style={styles.unreadPill}>
                    <Text style={styles.unreadPillText}>{p.unread}</Text>
                  </View>
                ) : null}
                <Ionicons
                  name={isAr ? 'chevron-back' : 'chevron-forward'}
                  size={14}
                  color={colors.text.muted}
                />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.surface.raised },
        loading: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
        },
        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
          gap: spacing.md,
          ...shadow.soft,
        },
        headerTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        backBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerTitle: {
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: '#FFFFFF',
        },
        headerSubtitle: {
          fontSize: typography.size.xs,
          color: 'rgba(255,255,255,0.85)',
          marginTop: 2,
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
        sortBar: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        },
        sortLabel: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          color: colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
        },
        sortPills: {
          gap: spacing.xs,
          paddingLeft: spacing.xs,
          paddingRight: spacing.lg,
        },
        sortPill: {
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.surface.border,
          backgroundColor: colors.surface.base,
        },
        sortPillText: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          color: colors.text.secondary,
        },
        list: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        emptyWrap: {
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.xxl,
        },
        empty: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
        },
        backText: {
          color: colors.brand.primary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
        },
        groupWrap: {
          backgroundColor: colors.surface.base,
          borderRadius: radius.xl,
          overflow: 'hidden',
          ...shadow.soft,
        },
        doctorRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
        },
        avatar: {
          width: 48,
          height: 48,
          borderRadius: radius.lg,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarText: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.brand.primary,
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
        doctorName: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        doctorMeta: {
          fontSize: typography.size.xs,
          color: colors.brand.primary,
          fontWeight: typography.weight.semibold,
          marginTop: 2,
        },
        metaRow: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginTop: spacing.xs,
          flexWrap: 'wrap',
        },
        metaChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          borderRadius: radius.pill,
          backgroundColor: colors.surface.sunken,
        },
        metaChipText: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          fontWeight: typography.weight.semibold,
        },
        patientList: {
          backgroundColor: colors.surface.sunken,
          paddingHorizontal: spacing.md,
        },
        patientRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 2,
        },
        patientDivider: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.surface.border,
        },
        patientAvatar: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.surface.base,
          alignItems: 'center',
          justifyContent: 'center',
        },
        patientName: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
        },
        patientMeta: {
          fontSize: 11,
          color: colors.text.muted,
          marginTop: 1,
        },
        unreadPill: {
          minWidth: 22,
          height: 22,
          paddingHorizontal: 6,
          borderRadius: 11,
          backgroundColor: colors.emergency.base,
          alignItems: 'center',
          justifyContent: 'center',
        },
        unreadPillText: {
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: typography.weight.bold,
        },
        emptyInline: {
          color: colors.text.muted,
          fontSize: typography.size.xs,
          textAlign: 'center',
          paddingVertical: spacing.md,
        },
      }),
    [colors],
  );
}
