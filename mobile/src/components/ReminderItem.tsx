import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ListItem } from '@components/ListItem';
import { Reminder, ReminderType } from '@services/api/reminders.api';
import {
  AppColors,
  radius,
  spacing,
  typography,
  Tint,
  useTheme,
} from '@theme/index';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function typeIcon(type: ReminderType) {
  switch (type) {
    case 'MEDICATION':
      return 'medical' as const;
    case 'APPOINTMENT':
      return 'calendar' as const;
    case 'CHECKUP':
      return 'pulse' as const;
    default:
      return 'notifications' as const;
  }
}

function typeTint(type: ReminderType): Tint {
  switch (type) {
    case 'MEDICATION':
      return 'teal';
    case 'APPOINTMENT':
      return 'blue';
    case 'CHECKUP':
      return 'green';
    default:
      return 'gray';
  }
}

export function ReminderItem({
  reminder,
  finished = false,
}: {
  reminder: Reminder;
  finished?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const fromRx = reminder.source === 'PRESCRIPTION';

  const parts: string[] = [];
  if (reminder.subtitle) parts.push(reminder.subtitle);
  if (reminder.endsAt) {
    parts.push(
      `${formatDate(reminder.scheduledAt)} → ${formatDate(reminder.endsAt)}`,
    );
  } else {
    parts.push(formatDateTime(reminder.scheduledAt));
  }
  if (fromRx) parts.push(t('reminders.fromPrescription'));
  const subtitle = parts.join(' · ');

  return (
    <View style={finished ? { opacity: 0.5 } : undefined}>
      <ListItem
        icon={typeIcon(reminder.type)}
        tint={typeTint(reminder.type)}
        title={reminder.title}
        subtitle={subtitle}
        trailing={
          finished ? (
            <View style={styles.finishedBadge}>
              <Ionicons
                name="checkmark-done"
                size={12}
                color={colors.text.muted}
              />
              <Text style={styles.finishedBadgeText}>
                {t('reminders.finished')}
              </Text>
            </View>
          ) : fromRx ? (
            <View style={styles.rxBadge}>
              <Ionicons
                name="lock-closed"
                size={10}
                color={colors.tint.teal.fg}
              />
              <Text style={styles.rxBadgeText}>Rx</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        rxBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.sm,
          backgroundColor: colors.tint.teal.bg,
        },
        rxBadgeText: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
          color: colors.tint.teal.fg,
          letterSpacing: 0.5,
        },
        finishedBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.sm,
          backgroundColor: colors.surface.sunken,
        },
        finishedBadgeText: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          color: colors.text.muted,
        },
      }),
    [colors],
  );
}
