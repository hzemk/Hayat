import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { StatCard } from '@components/StatCard';
import { Card } from '@components/Card';
import { ReminderItem } from '@components/ReminderItem';
import { listReminders, Reminder } from '@services/api/reminders.api';
import { syncReminderNotifications } from '@services/notifications';
import { AppColors, spacing, typography, useTheme } from '@theme/index';

type Bucket = 'upcoming' | 'active' | 'finished';

function bucketFor(r: Reminder, nowMs: number): Bucket {
  const start = new Date(r.scheduledAt).getTime();
  const end = r.endsAt ? new Date(r.endsAt).getTime() : null;
  if (end != null) {
    if (nowMs < start) return 'upcoming';
    if (nowMs >= end) return 'finished';
    return 'active';
  }
  // No duration: single-shot. Upcoming until fire time, then finished.
  return nowMs < start ? 'upcoming' : 'finished';
}

export default function RemindersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: listReminders,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (reminders) {
      syncReminderNotifications(reminders).catch(() => undefined);
    }
  }, [reminders]);

  const grouped = useMemo(() => {
    const nowMs = Date.now();
    const buckets: Record<Bucket, Reminder[]> = {
      upcoming: [],
      active: [],
      finished: [],
    };
    for (const r of reminders ?? []) buckets[bucketFor(r, nowMs)].push(r);
    return buckets;
  }, [reminders]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <GradientHeader title={t('reminders.title')}>
        <View style={styles.statsRow}>
          <StatCard
            label={t('reminders.active')}
            value={grouped.active.length}
            icon="heart"
            tint="green"
          />
          <StatCard
            label={t('reminders.upcoming')}
            value={grouped.upcoming.length}
            icon="time"
            tint="yellow"
          />
          <StatCard
            label={t('reminders.finished')}
            value={grouped.finished.length}
            icon="checkmark-done"
            tint="gray"
          />
        </View>
      </GradientHeader>

      <View style={styles.body}>
        {isLoading ? (
          <Card variant="outline">
            <Text style={styles.empty}>{t('common.loading')}</Text>
          </Card>
        ) : grouped.upcoming.length === 0 &&
          grouped.active.length === 0 &&
          grouped.finished.length === 0 ? (
          <Card variant="outline">
            <Text style={styles.empty}>{t('reminders.emptyTodayDoctor')}</Text>
          </Card>
        ) : (
          <>
            {grouped.active.length > 0 ? (
              <SectionContainer title={t('reminders.activeSection')}>
                {grouped.active.map((r) => (
                  <ReminderItem key={r.id} reminder={r} />
                ))}
              </SectionContainer>
            ) : null}

            {grouped.upcoming.length > 0 ? (
              <SectionContainer title={t('reminders.upcomingSection')}>
                {grouped.upcoming.map((r) => (
                  <ReminderItem key={r.id} reminder={r} />
                ))}
              </SectionContainer>
            ) : null}

            {grouped.finished.length > 0 ? (
              <SectionContainer title={t('reminders.finishedSection')}>
                {grouped.finished.map((r) => (
                  <ReminderItem key={r.id} reminder={r} finished />
                ))}
              </SectionContainer>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        statsRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        body: {
          paddingTop: spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.xl,
        },
        empty: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
        },
      }),
    [colors],
  );
}
