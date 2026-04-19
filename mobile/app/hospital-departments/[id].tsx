import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Card } from '@components/Card';
import { SectionContainer } from '@components/SectionContainer';
import { Button } from '@components/Button';
import {
  DayWindow,
  Weekday,
  WEEKDAYS,
  getHospitalDepartment,
  updateHospitalDepartment,
} from '@services/api/hospital-portal.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

export default function DepartmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const departmentId = String(id);
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const detailQuery = useQuery({
    queryKey: ['hospital-department', departmentId],
    queryFn: () => getHospitalDepartment(departmentId),
    enabled: Boolean(departmentId),
  });

  const [hours, setHours] = useState<DayWindow[]>([]);

  useEffect(() => {
    if (detailQuery.data?.openHours) {
      setHours(detailQuery.data.openHours);
    }
  }, [detailQuery.data?.openHours]);

  const save = useMutation({
    mutationFn: () =>
      updateHospitalDepartment(departmentId, { openHours: hours }),
    onSuccess: (data) => {
      qc.setQueryData(['hospital-department', departmentId], data);
      qc.invalidateQueries({ queryKey: ['hospital-departments'] });
      Alert.alert(t('hospitalPortal.departments.detail.savedHours'));
    },
    onError: (err) =>
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error'))),
  });

  const setDay = (day: Weekday, patch: Partial<DayWindow>) => {
    setHours((prev) =>
      prev.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    );
  };

  const dirty = useMemo(() => {
    const original = detailQuery.data?.openHours ?? [];
    return JSON.stringify(original) !== JSON.stringify(hours);
  }, [detailQuery.data?.openHours, hours]);

  if (detailQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={colors.status.error}
          />
          <Text style={styles.errorText}>
            {apiErrorMessage(detailQuery.error, t('common.error'))}
          </Text>
          <Pressable
            onPress={() => detailQuery.refetch()}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dept = detailQuery.data;
  const name = isAr ? dept.nameAr : dept.nameEn;
  const onlineCount = dept.doctors.filter((d) => d.isAvailable).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={[...colors.brand.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerBtn}
        >
          <Ionicons
            name={isAr ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={colors.text.inverse}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>
            {dept.code} · {t('hospitalPortal.departments.staff', {
              count: dept.doctors.length,
            })}{' '}
            · {t('hospitalPortal.departments.online', { count: onlineCount })}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body}>
        <SectionContainer
          title={t('hospitalPortal.departments.detail.workingHours')}
        >
          <Text style={styles.hint}>
            {t('hospitalPortal.departments.detail.workingHoursHint')}
          </Text>
          <View style={styles.daysWrap}>
            {WEEKDAYS.map((day) => {
              const w = hours.find((h) => h.day === day) ?? {
                day,
                open: null,
                close: null,
              };
              const isOpen = !!(w.open && w.close);
              return (
                <DayRow
                  key={day}
                  isAr={isAr}
                  isOpen={isOpen}
                  window={w}
                  dayLabel={t(`hospitalPortal.departments.weekday.${day}`)}
                  closedLabel={t(
                    'hospitalPortal.departments.detail.closedLabel',
                  )}
                  openLabel={t(
                    'hospitalPortal.departments.detail.openLabel',
                  )}
                  closeLabel={t(
                    'hospitalPortal.departments.detail.closeLabel',
                  )}
                  onToggle={(value) => {
                    if (value) {
                      setDay(day, { open: '08:00', close: '17:00' });
                    } else {
                      setDay(day, { open: null, close: null });
                    }
                  }}
                  onChangeOpen={(v) => setDay(day, { open: v })}
                  onChangeClose={(v) => setDay(day, { close: v })}
                />
              );
            })}
          </View>
          <Button
            label={t('hospitalPortal.departments.detail.saveHours')}
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={!dirty}
          />
        </SectionContainer>

        <SectionContainer
          title={t('hospitalPortal.departments.detail.doctorsTitle')}
        >
          {dept.doctors.length === 0 ? (
            <Card variant="outline" padding="md">
              <Text style={styles.empty}>
                {t('hospitalPortal.departments.detail.doctorsEmpty')}
              </Text>
            </Card>
          ) : (
            dept.doctors.map((d) => (
              <Card
                key={d.id}
                padding="md"
                style={{ marginBottom: spacing.sm }}
              >
                <View style={styles.docRow}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person"
                      size={20}
                      color={colors.brand.primary}
                    />
                    <View
                      style={[
                        styles.presenceDot,
                        {
                          backgroundColor: d.isAvailable
                            ? colors.status.success
                            : colors.text.muted,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {d.user.fullName ?? d.user.email}
                    </Text>
                    <Text style={styles.docSpecialty} numberOfLines={1}>
                      {(isAr && d.specialtyAr) || d.specialty}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: d.isAvailable
                          ? colors.tint.green.bg
                          : colors.tint.gray.bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: d.isAvailable
                            ? colors.tint.green.fg
                            : colors.tint.gray.fg,
                        },
                      ]}
                    >
                      {d.isAvailable
                        ? t('hospitalPortal.departments.detail.online')
                        : t('hospitalPortal.departments.detail.offline')}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </SectionContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function DayRow({
  isAr,
  dayLabel,
  isOpen,
  window: w,
  closedLabel,
  openLabel,
  closeLabel,
  onToggle,
  onChangeOpen,
  onChangeClose,
}: {
  isAr: boolean;
  dayLabel: string;
  isOpen: boolean;
  window: DayWindow;
  closedLabel: string;
  openLabel: string;
  closeLabel: string;
  onToggle: (v: boolean) => void;
  onChangeOpen: (v: string) => void;
  onChangeClose: (v: string) => void;
}) {
  const { colors } = useTheme();
  const dayStyles = useDayStyles(colors);
  return (
    <View style={dayStyles.wrap}>
      <View style={dayStyles.headerRow}>
        <Text style={dayStyles.day}>{dayLabel}</Text>
        <Switch
          value={isOpen}
          onValueChange={onToggle}
          trackColor={{
            false: colors.surface.border,
            true: colors.brand.primary,
          }}
        />
      </View>
      {isOpen ? (
        <View
          style={[
            dayStyles.timesRow,
            isAr && { flexDirection: 'row-reverse' },
          ]}
        >
          <TimeBox
            label={openLabel}
            value={w.open ?? '08:00'}
            onChange={onChangeOpen}
          />
          <TimeBox
            label={closeLabel}
            value={w.close ?? '17:00'}
            onChange={onChangeClose}
          />
        </View>
      ) : (
        <Text style={dayStyles.closed}>{closedLabel}</Text>
      )}
    </View>
  );
}

function TimeBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  const dayStyles = useDayStyles(colors);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(draft)) {
      onChange(draft);
    } else {
      setDraft(value);
    }
  };

  return (
    <View style={dayStyles.timeBox}>
      <Text style={dayStyles.timeLabel}>{label}</Text>
      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          autoFocus
          maxLength={5}
          placeholder="HH:MM"
          keyboardType="numbers-and-punctuation"
          style={dayStyles.input}
        />
      ) : (
        <Pressable onPress={() => setEditing(true)} style={dayStyles.timePill}>
          <Ionicons name="time-outline" size={14} color={colors.brand.primary} />
          <Text style={dayStyles.timeValue}>{value}</Text>
        </Pressable>
      )}
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.raised },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadow.soft,
  },
  headerBtn: { padding: spacing.xs },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  daysWrap: { gap: spacing.sm, marginBottom: spacing.md },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  backText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  empty: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  docName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  docSpecialty: {
    fontSize: typography.size.xs,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
}), [colors]);
}

function useDayStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface.base,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  day: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  closed: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  timesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeBox: {
    flex: 1,
    gap: 4,
  },
  timeLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint.teal.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignSelf: 'flex-start',
  },
  timeValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.brand.primary,
    fontVariant: ['tabular-nums'],
  },
  input: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.base,
  },
}), [colors]);
}
