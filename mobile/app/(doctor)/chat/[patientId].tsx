import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPatientReminder,
  DoctorMessage,
  getDoctorPatient,
  getDoctorThread,
  sendDoctorMessageToPatient,
} from '@services/api/doctor-portal.api';
import { apiErrorMessage } from '@services/api/errors';
import type { ReminderType } from '@services/api/reminders.api';
import { Button } from '@components/Button';
import { TextField } from '@components/TextField';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

const CLUSTER_GAP_MS = 5 * 60 * 1000;

export default function DoctorChatThread() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const threadQuery = useQuery({
    queryKey: ['doctor-thread', patientId],
    queryFn: () => getDoctorThread(patientId!),
    enabled: !!patientId,
    refetchInterval: 5000,
  });

  const patientQuery = useQuery({
    queryKey: ['doctor-patient', patientId],
    queryFn: () => getDoctorPatient(patientId!),
    enabled: !!patientId,
  });

  const [input, setInput] = useState('');
  const [pending, setPending] = useState<DoctorMessage[]>([]);
  const [showReminder, setShowReminder] = useState(false);
  const listRef = useRef<FlatList<DoctorMessage>>(null);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      sendDoctorMessageToPatient(patientId!, { body, kind: 'TEXT' }),
    onSuccess: () => {
      setPending([]);
      queryClient.invalidateQueries({
        queryKey: ['doctor-thread', patientId],
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-threads'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
    },
    onError: () => {
      setPending([]);
    },
  });

  const serverMessages = threadQuery.data?.messages ?? [];
  const messages = useMemo(
    () => [...serverMessages, ...pending],
    [serverMessages, pending],
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  async function onSend() {
    const body = input.trim();
    if (!body || sendMutation.isPending) return;
    setInput('');
    const optimistic: DoctorMessage = {
      id: `local-${Date.now()}`,
      threadId: threadQuery.data?.thread.id ?? '',
      sender: 'DOCTOR',
      kind: 'TEXT',
      body,
      metadata: null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setPending((p) => [...p, optimistic]);
    sendMutation.mutate(body);
  }

  const patientName = patientQuery.data?.fullName;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <LinearGradient
        colors={[...colors.brand.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.text.inverse}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>{t('doctorPortal.chat.role')}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {patientName || t('doctorPortal.chat.patientHeader')}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/(doctor)/rx/${patientId}`)}
          hitSlop={8}
          style={styles.rxBtn}
        >
          <Ionicons name="medical" size={16} color="#fff" />
          <Text style={styles.rxBtnText}>
            {t('doctorPortal.patient.issueRx')}
          </Text>
        </Pressable>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {threadQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => {
              const prev = messages[index - 1];
              const showTime =
                !prev ||
                new Date(item.createdAt).getTime() -
                  new Date(prev.createdAt).getTime() >
                  CLUSTER_GAP_MS;
              return <Bubble message={item} showTime={showTime} />;
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={28}
                  color={colors.text.muted}
                />
                <Text style={styles.emptyBody}>
                  {t('doctorPortal.inbox.noMessages')}
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.actionBar}>
          <Pressable
            onPress={() => router.push(`/(doctor)/rx/${patientId}`)}
            style={({ pressed }) => [
              styles.rxAction,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="medical" size={16} color="#fff" />
            <Text style={styles.rxActionText}>
              {t('doctorPortal.patient.issueRx')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowReminder(true)}
            style={({ pressed }) => [
              styles.reminderAction,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="alarm" size={16} color={colors.brand.primary} />
            <Text style={styles.reminderActionText}>
              {t('doctorPortal.patient.addReminder')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={t('doctorPortal.chat.placeholder')}
            placeholderTextColor={colors.text.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={onSend}
            disabled={!input.trim() || sendMutation.isPending}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || sendMutation.isPending) && styles.sendDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <ReminderSheet
        visible={showReminder}
        patientId={patientId!}
        onClose={() => setShowReminder(false)}
        onCreated={() => {
          setShowReminder(false);
          queryClient.invalidateQueries({
            queryKey: ['doctor-thread', patientId],
          });
          queryClient.invalidateQueries({ queryKey: ['doctor-threads'] });
        }}
      />
    </SafeAreaView>
  );
}

const REMINDER_TYPES: ReminderType[] = [
  'MEDICATION',
  'APPOINTMENT',
  'CHECKUP',
  'OTHER',
];

function reminderTypeIcon(type: ReminderType) {
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

function ReminderSheet({
  visible,
  patientId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  patientId: string;
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
  const [durationDays, setDurationDays] = useState('');

  const createMutation = useMutation({
    mutationFn: () => {
      const hrs = parseFloat(hoursFromNow) || 1;
      const scheduledAt = new Date(
        Date.now() + hrs * 60 * 60 * 1000,
      ).toISOString();
      const dur = parseInt(durationDays, 10);
      return createPatientReminder(patientId, {
        type,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        scheduledAt,
        durationDays: Number.isFinite(dur) && dur > 0 ? dur : undefined,
      });
    },
    onSuccess: () => {
      setTitle('');
      setSubtitle('');
      setHoursFromNow('1');
      setDurationDays('');
      setType('MEDICATION');
      onCreated();
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  function onSave() {
    if (title.trim().length < 1) {
      Alert.alert(
        t('common.error'),
        t('doctorPortal.reminders.titleRequired'),
      );
      return;
    }
    createMutation.mutate();
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
        <Text style={styles.sheetTitle}>
          {t('doctorPortal.reminders.newReminder')}
        </Text>

        <View style={styles.typePicker}>
          {REMINDER_TYPES.map((ty) => {
            const active = type === ty;
            return (
              <Pressable
                key={ty}
                onPress={() => setType(ty)}
                style={[
                  styles.typeChip,
                  active && {
                    backgroundColor: colors.brand.primary,
                    borderColor: colors.brand.primary,
                  },
                ]}
              >
                <Ionicons
                  name={reminderTypeIcon(ty)}
                  size={14}
                  color={active ? '#fff' : colors.text.secondary}
                />
                <Text
                  style={[styles.typeChipText, active && { color: '#fff' }]}
                >
                  {typeLabel[ty]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label={t('reminders.title')}
          value={title}
          onChangeText={setTitle}
          placeholder="Metformin 500mg"
        />
        <TextField
          label={t('doctorPortal.reminders.note')}
          value={subtitle}
          onChangeText={setSubtitle}
          placeholder="After breakfast"
        />
        <TextField
          label={t('doctorPortal.reminders.hoursFromNow')}
          value={hoursFromNow}
          onChangeText={setHoursFromNow}
          keyboardType="decimal-pad"
        />
        <TextField
          label={t('doctorPortal.reminders.durationDays')}
          value={durationDays}
          onChangeText={(v) => setDurationDays(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="7"
        />
        <Button
          label={
            createMutation.isPending
              ? t('doctorPortal.reminders.saving')
              : t('doctorPortal.reminders.save')
          }
          onPress={onSave}
          loading={createMutation.isPending}
        />
      </View>
    </Modal>
  );
}

function Bubble({
  message,
  showTime,
}: {
  message: DoctorMessage;
  showTime: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const mine = message.sender === 'DOCTOR';
  const isSystem = message.sender === 'SYSTEM' || message.kind === 'SYSTEM';
  const isSummary = message.kind === 'SYMPTOM_SUMMARY';

  const when = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSystem) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.body}</Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: spacing.xs }}>
      {showTime ? <Text style={styles.timeLabel}>{when}</Text> : null}
      <View
        style={[
          styles.bubble,
          mine ? styles.mine : styles.theirs,
          isSummary && styles.summary,
        ]}
      >
        {isSummary ? (
          <Text style={styles.summaryLabel}>
            {t('doctors.chat.symptomSummary')}
          </Text>
        ) : null}
        <Text style={[styles.body, mine && { color: '#fff' }]}>
          {message.body}
        </Text>
      </View>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  header: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  rxBtnText: {
    color: '#fff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  headerTitle: {
    color: colors.text.inverse,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.xs,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, gap: spacing.xs },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
  },
  emptyBody: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
  },
  timeLabel: {
    textAlign: 'center',
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginVertical: spacing.sm,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow.soft,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand.primary,
    borderBottomRightRadius: radius.sm,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.base,
    borderBottomLeftRadius: radius.sm,
  },
  summary: {
    backgroundColor: colors.tint.purple.bg,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
  },
  summaryLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.tint.purple.fg,
    marginBottom: 4,
  },
  body: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  systemWrap: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.pill,
    marginVertical: spacing.xs,
  },
  systemText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
    backgroundColor: colors.surface.base,
    borderTopWidth: 1,
    borderColor: colors.surface.border,
  },
  rxAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    ...shadow.soft,
  },
  rxActionText: {
    color: '#fff',
    fontWeight: typography.weight.bold,
    fontSize: typography.size.sm,
  },
  reminderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.teal.bg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  reminderActionText: {
    color: colors.brand.primary,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.sm,
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
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface.base,
    borderTopWidth: 1,
    borderColor: colors.surface.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    color: colors.text.primary,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  sendDisabled: {
    backgroundColor: colors.text.muted,
  },
}), [colors]);
}
