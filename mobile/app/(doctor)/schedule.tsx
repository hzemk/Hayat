import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMySchedule,
  setMySchedule,
  type ScheduleDay,
} from '@services/api/doctor-portal.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

const DEFAULT_START = 9 * 60;
const DEFAULT_END = 17 * 60;
const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];

function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

function dayName(t: (k: string) => string, day: number): string {
  return t(`doctorPortal.schedule.days.${day}`);
}

export default function ScheduleScreen() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const scheduleQuery = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: getMySchedule,
  });

  const emptyDays = (): Record<number, ScheduleDay> => {
    const map: Record<number, ScheduleDay> = {};
    for (const d of DAYS_OF_WEEK) {
      map[d] = {
        dayOfWeek: d,
        startMinutes: DEFAULT_START,
        endMinutes: DEFAULT_END,
        isActive: false,
      };
    }
    return map;
  };

  const [days, setDays] = useState<Record<number, ScheduleDay>>(emptyDays);

  useEffect(() => {
    if (!scheduleQuery.data) return;
    setDays((prev) => {
      const map = { ...prev };
      for (const d of DAYS_OF_WEEK) {
        const existing = scheduleQuery.data!.find((x) => x.dayOfWeek === d);
        if (existing) map[d] = { ...existing };
      }
      return map;
    });
  }, [scheduleQuery.data]);

  const mutation = useMutation({
    mutationFn: (payload: ScheduleDay[]) => setMySchedule(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['doctor-schedule'], data);
      Alert.alert(t('doctorPortal.schedule.savedTitle'), t('doctorPortal.schedule.savedBody'));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Save failed';
      Alert.alert(t('doctorPortal.schedule.errorTitle'), msg);
    },
  });

  function toggleDay(day: number, value: boolean) {
    setDays((prev) => ({
      ...prev,
      [day]: { ...prev[day], isActive: value },
    }));
  }

  function bumpTime(day: number, field: 'startMinutes' | 'endMinutes', delta: number) {
    setDays((prev) => {
      const current = prev[day];
      if (!current) return prev;
      const next = Math.max(0, Math.min(1440, current[field] + delta));
      const updated = { ...current, [field]: next };
      // Keep start < end, nudging the other side if needed.
      if (updated.endMinutes <= updated.startMinutes) {
        if (field === 'startMinutes') {
          updated.endMinutes = Math.min(1440, updated.startMinutes + 30);
        } else {
          updated.startMinutes = Math.max(0, updated.endMinutes - 30);
        }
      }
      return { ...prev, [day]: updated };
    });
  }

  function onSave() {
    const payload = DAYS_OF_WEEK.map((d) => days[d]).filter(Boolean);
    mutation.mutate(payload);
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      edges={['top', 'left', 'right']}
    >
      <LinearGradient
        colors={[colors.brand.primaryLight, colors.brand.primary]}
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
            name={isRtl ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={colors.text.inverse}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('doctorPortal.schedule.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('doctorPortal.schedule.subtitle')}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {DAYS_OF_WEEK.map((d) => {
          const row = days[d];
          if (!row) return null;
          return (
            <View key={d} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.dayName}>{dayName(t, d)}</Text>
                <Switch
                  value={row.isActive}
                  onValueChange={(v) => toggleDay(d, v)}
                  trackColor={{
                    false: colors.surface.border,
                    true: colors.brand.primaryLight,
                  }}
                  thumbColor={row.isActive ? colors.brand.primary : '#fff'}
                />
              </View>
              {row.isActive ? (
                <View style={styles.timeRow}>
                  <TimeStepper
                    label={t('doctorPortal.schedule.from')}
                    value={row.startMinutes}
                    onDecrease={() => bumpTime(d, 'startMinutes', -30)}
                    onIncrease={() => bumpTime(d, 'startMinutes', 30)}
                  />
                  <TimeStepper
                    label={t('doctorPortal.schedule.to')}
                    value={row.endMinutes}
                    onDecrease={() => bumpTime(d, 'endMinutes', -30)}
                    onIncrease={() => bumpTime(d, 'endMinutes', 30)}
                  />
                </View>
              ) : (
                <Text style={styles.offHint}>
                  {t('doctorPortal.schedule.off')}
                </Text>
              )}
            </View>
          );
        })}

        <Pressable
          onPress={onSave}
          disabled={mutation.isPending}
          style={({ pressed }) => [
            styles.saveBtn,
            (pressed || mutation.isPending) && { opacity: 0.85 },
          ]}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={colors.text.inverse} />
              <Text style={styles.saveBtnText}>
                {t('doctorPortal.schedule.save')}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimeStepper({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={onDecrease}
          style={({ pressed }) => [
            styles.stepperBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="remove" size={18} color={colors.brand.primary} />
        </Pressable>
        <Text style={styles.stepperValue}>{minutesToLabel(value)}</Text>
        <Pressable
          onPress={onIncrease}
          style={({ pressed }) => [
            styles.stepperBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="add" size={18} color={colors.brand.primary} />
        </Pressable>
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
          backgroundColor: colors.surface.raised,
        },
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
          marginTop: 1,
        },
        list: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
          gap: spacing.md,
        },
        row: {
          backgroundColor: colors.surface.base,
          padding: spacing.md,
          borderRadius: radius.lg,
          ...shadow.soft,
          gap: spacing.sm,
        },
        rowHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        dayName: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        timeRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        offHint: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
          fontStyle: 'italic',
        },
        stepper: {
          flex: 1,
          backgroundColor: colors.surface.raised,
          borderRadius: radius.md,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          gap: 4,
        },
        stepperLabel: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
        },
        stepperRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        stepperBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        stepperValue: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
          fontVariant:
            Platform.OS === 'ios' ? (['tabular-nums'] as const) : undefined,
        },
        saveBtn: {
          marginTop: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: colors.brand.primary,
          paddingVertical: spacing.md,
          borderRadius: radius.pill,
        },
        saveBtnText: {
          color: colors.text.inverse,
          fontWeight: typography.weight.bold,
          fontSize: typography.size.md,
        },
      }),
    [colors],
  );
}
