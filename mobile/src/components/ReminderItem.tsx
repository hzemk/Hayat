import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const isDone = reminder.status === 'DONE';
  const fromRx = reminder.source === 'PRESCRIPTION';
  const baseSubtitle = reminder.subtitle
    ? `${reminder.subtitle} · ${formatWhen(reminder.scheduledAt)}`
    : formatWhen(reminder.scheduledAt);
  const subtitle = fromRx
    ? `${baseSubtitle} · ${t('reminders.fromPrescription')}`
    : baseSubtitle;

  return (
    <View style={isDone ? { opacity: 0.55 } : undefined}>
      <ListItem
        icon={typeIcon(reminder.type)}
        tint={typeTint(reminder.type)}
        title={reminder.title}
        subtitle={subtitle}
        trailing={
          <View style={styles.trailingRow}>
            <Pressable
              onPress={onToggle}
              hitSlop={8}
              style={styles.checkBtn}
              accessibilityLabel={
                isDone ? t('reminders.undoTaken') : t('reminders.markTaken')
              }
            >
              <View
                style={[
                  styles.checkCircle,
                  isDone && {
                    backgroundColor: colors.status.success,
                    borderColor: colors.status.success,
                  },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
            </Pressable>
            {fromRx ? (
              <View style={styles.rxBadge}>
                <Ionicons
                  name="lock-closed"
                  size={10}
                  color={colors.tint.teal.fg}
                />
                <Text style={styles.rxBadgeText}>Rx</Text>
              </View>
            ) : (
              <Pressable
                onPress={onDelete}
                hitSlop={8}
                accessibilityLabel={t('common.delete')}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.text.muted}
                />
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        trailingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        checkBtn: { padding: 2 },
        checkCircle: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: colors.status.success,
          alignItems: 'center',
          justifyContent: 'center',
        },
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
      }),
    [colors],
  );
}
