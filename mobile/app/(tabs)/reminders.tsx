import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { ListItem } from '@components/ListItem';
import { StatCard } from '@components/StatCard';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { Button } from '@components/Button';
import {
  createReminder,
  deleteReminder,
  listReminders,
  Reminder,
  ReminderType,
  updateReminder,
} from '@services/api/reminders.api';
import { apiErrorMessage } from '@services/api/errors';
import { syncReminderNotifications } from '@services/notifications';
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

export default function RemindersScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: listReminders,
  });

  useEffect(() => {
    if (reminders) {
      syncReminderNotifications(reminders).catch(() => undefined);
    }
  }, [reminders]);

  const [showCreate, setShowCreate] = useState(false);

  const markDone = useMutation({
    mutationFn: (r: Reminder) =>
      updateReminder(r.id, {
        status: r.status === 'DONE' ? 'PENDING' : 'DONE',
      }),
    onMutate: async (r) => {
      await qc.cancelQueries({ queryKey: ['reminders'] });
      const previous = qc.getQueryData<Reminder[]>(['reminders']);
      if (previous) {
        const nextStatus: Reminder['status'] =
          r.status === 'DONE' ? 'PENDING' : 'DONE';
        qc.setQueryData<Reminder[]>(
          ['reminders'],
          previous.map((p) =>
            p.id === r.id
              ? {
                  ...p,
                  status: nextStatus,
                  completedAt:
                    nextStatus === 'DONE' ? new Date().toISOString() : null,
                }
              : p,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['reminders'], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  const isToday = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };
  const todays = (reminders ?? []).filter((r) => isToday(r.scheduledAt));
  const pending = todays.filter((r) => r.status === 'PENDING');
  const completed = todays.filter((r) => r.status !== 'PENDING');

  const confirmDelete = (r: Reminder) => {
    if (r.source === 'PRESCRIPTION') {
      Alert.alert(
        t('reminders.fromDoctorTitle'),
        t('reminders.fromDoctorMessage'),
        [{ text: t('common.done') }],
      );
      return;
    }
    Alert.alert(t('common.delete'), r.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => remove.mutate(r.id),
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <GradientHeader
        title={t('reminders.title')}
        right={
          <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={colors.text.inverse} />
          </Pressable>
        }
      >
        <View style={styles.statsRow}>
          <StatCard
            label={t('reminders.pending')}
            value={pending.length}
            icon="time"
            tint="yellow"
          />
          <StatCard
            label={t('reminders.done')}
            value={completed.length}
            icon="checkmark-done"
            tint="green"
          />
        </View>
      </GradientHeader>

      <View style={styles.body}>
        {isLoading ? (
          <Card variant="outline">
            <Text style={styles.empty}>{t('common.loading')}</Text>
          </Card>
        ) : pending.length === 0 && completed.length === 0 ? (
          <Card variant="outline">
            <Text style={styles.empty}>{t('reminders.emptyToday')}</Text>
          </Card>
        ) : (
          <>
            {pending.length > 0 ? (
              <SectionContainer title={t('reminders.todayPending')}>
                {pending.map((r) => (
                  <ReminderItem
                    key={r.id}
                    reminder={r}
                    onToggle={() => markDone.mutate(r)}
                    onDelete={() => confirmDelete(r)}
                  />
                ))}
              </SectionContainer>
            ) : null}

            {completed.length > 0 ? (
              <SectionContainer title={t('reminders.todayDone')}>
                {completed.map((r) => (
                  <ReminderItem
                    key={r.id}
                    reminder={r}
                    onToggle={() => markDone.mutate(r)}
                    onDelete={() => confirmDelete(r)}
                  />
                ))}
              </SectionContainer>
            ) : null}
          </>
        )}
      </View>

      <CreateReminderSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['reminders'] });
          qc.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
          setShowCreate(false);
        }}
      />
    </ScrollView>
  );
}

function ReminderItem({
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

const TYPES: { key: ReminderType }[] = [
  { key: 'MEDICATION' },
  { key: 'APPOINTMENT' },
  { key: 'CHECKUP' },
  { key: 'OTHER' },
];

function CreateReminderSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [type, setType] = useState<ReminderType>('MEDICATION');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [hoursFromNow, setHoursFromNow] = useState('1');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (title.trim().length < 1) {
      Alert.alert(t('common.error'), t('reminders.title'));
      return;
    }
    const hrs = parseFloat(hoursFromNow) || 1;
    const scheduledAt = new Date(
      Date.now() + hrs * 60 * 60 * 1000,
    ).toISOString();
    setSaving(true);
    try {
      await createReminder({
        type,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        scheduledAt,
      });
      setTitle('');
      setSubtitle('');
      setHoursFromNow('1');
      setType('MEDICATION');
      onCreated();
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  const typeLabel: Record<ReminderType, string> = {
    MEDICATION: t('reminders.medication'),
    APPOINTMENT: t('reminders.appointment'),
    CHECKUP: t('reminders.checkup'),
    OTHER: t('reminders.other'),
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{t('reminders.addReminder')}</Text>

        <View style={styles.typePicker}>
          {TYPES.map((ty) => {
            const active = type === ty.key;
            return (
              <Pressable
                key={ty.key}
                onPress={() => setType(ty.key)}
                style={[
                  styles.typeChip,
                  active && {
                    backgroundColor: colors.brand.primary,
                    borderColor: colors.brand.primary,
                  },
                ]}
              >
                <Ionicons
                  name={typeIcon(ty.key)}
                  size={14}
                  color={active ? '#fff' : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    active && { color: '#fff' },
                  ]}
                >
                  {typeLabel[ty.key]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label={t('reminders.title')}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Metformin 500mg"
        />
        <TextField
          label="Note"
          value={subtitle}
          onChangeText={setSubtitle}
          placeholder="After breakfast"
        />
        <TextField
          label="In how many hours?"
          value={hoursFromNow}
          onChangeText={setHoursFromNow}
          keyboardType="decimal-pad"
        />
        <Button
          label={t('common.save')}
          onPress={onSave}
          loading={saving}
        />
      </View>
    </Modal>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.base,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
    gap: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface.border,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  typePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.raised,
  },
  typeChipText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
}), [colors]);
}
