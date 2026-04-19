import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
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
  DoctorMessage,
  getDoctorPatient,
  getDoctorThread,
  sendDoctorMessageToPatient,
} from '@services/api/doctor-portal.api';
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
    </SafeAreaView>
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
