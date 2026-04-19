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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  sendChatMessage,
  type ChatSummary,
  type SuggestedDoctor,
} from '@services/api/ai.api';
import { sendMessage as sendDoctorMessage } from '@services/api/doctors.api';
import { apiErrorMessage } from '@services/api/errors';
import { useAuthStore } from '@stores/auth';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

interface Bubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  redFlag?: boolean;
}

function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}

export default function ChatScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [suggestedDoctors, setSuggestedDoctors] = useState<SuggestedDoctor[]>([]);
  const [forwardingDoctorId, setForwardingDoctorId] = useState<string | null>(
    null,
  );
  const [forwardedDoctorId, setForwardedDoctorId] = useState<string | null>(null);
  const [handoffState, setHandoffState] = useState<
    'idle' | 'sending' | 'sent'
  >('idle');
  const listRef = useRef<FlatList<Bubble>>(null);

  // Guard: chat is only meaningful for signed-in users. If someone deep-links
  // here without a session (or expo-router restored this route), bounce them
  // to login.
  useEffect(() => {
    if (isHydrated && !user) router.replace('/(auth)/login');
  }, [isHydrated, user]);

  if (!user) {
    return (
      <View style={styles.gateLoader}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const assistantTurns = messages.filter((m) => m.role === 'assistant').length;
  const summaryReady = !!summary;
  const canHandoff =
    userTurns >= 1 && assistantTurns >= 1 && handoffState !== 'sent';

  const suggestedPrompts: string[] = [
    t('ai.suggestions.headache') || 'I have a headache since this morning',
    t('ai.suggestions.fever') || 'My child has a fever of 38.5°C',
    t('ai.suggestions.cough') || 'Persistent dry cough for 3 days',
  ];

  async function forwardToDoctor(doctor: SuggestedDoctor) {
    if (!summary || forwardingDoctorId) return;
    setForwardingDoctorId(doctor.id);
    try {
      const body = `${summary.text}\n\n— Suggested specialty: ${summary.specialty}`;
      await sendDoctorMessage(doctor.id, {
        body,
        kind: 'SYMPTOM_SUMMARY',
        metadata: { conversationId, specialty: summary.specialty },
      });
      setForwardedDoctorId(doctor.id);
      setTimeout(() => router.push(`/doctors/chat/${doctor.id}`), 400);
    } catch {
      setForwardingDoctorId(null);
    }
  }

  async function onHandoff() {
    if (!user?.defaultDoctorId) {
      router.push('/doctors');
      return;
    }
    setHandoffState('sending');
    try {
      const body = summary
        ? `${summary.text}\n\n— Suggested specialty: ${summary.specialty}`
        : messages
            .slice(-6)
            .map(
              (m) =>
                `${m.role === 'user' ? 'Me' : 'AI'}: ${m.content.trim()}`,
            )
            .join('\n');
      await sendDoctorMessage(user.defaultDoctorId, {
        body,
        kind: 'SYMPTOM_SUMMARY',
        metadata: {
          conversationId,
          ...(summary ? { specialty: summary.specialty } : {}),
        },
      });
      setHandoffState('sent');
      setTimeout(
        () => router.push(`/doctors/chat/${user.defaultDoctorId}`),
        400,
      );
    } catch {
      setHandoffState('idle');
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: Bubble = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await sendChatMessage({ conversationId, message: trimmed });
      setConversationId(res.conversationId);
      if (res.summary) setSummary(res.summary);
      if (res.suggestedDoctors && res.suggestedDoctors.length > 0) {
        setSuggestedDoctors(res.suggestedDoctors);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          redFlag: res.action === 'CALL_EMERGENCY',
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: apiErrorMessage(err, t('common.error')),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  const initial =
    user?.fullName?.trim()?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    '•';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[...colors.brand.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable
          onPress={goBackOrHome}
          hitSlop={12}
          style={styles.headerIconBtn}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={22}
            color={colors.text.inverse}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color={colors.text.inverse} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('ai.title')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {t('ai.disclaimer')}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={8}
          style={styles.profileBtn}
          accessibilityLabel={t('profile.title')}
        >
          <Text style={styles.profileInitial}>{initial}</Text>
        </Pressable>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="chatbubble-ellipses"
                size={28}
                color={colors.brand.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {t('ai.empty.title') || 'How can I help today?'}
            </Text>
            <Text style={styles.emptyHint}>
              {t('ai.empty.hint') ||
                'Describe your symptoms and I\u2019ll suggest next steps. Tap a prompt or type your own.'}
            </Text>

            <View style={styles.promptList}>
              {suggestedPrompts.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => send(p)}
                  style={({ pressed }) => [
                    styles.promptChip,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={colors.brand.primary}
                  />
                  <Text style={styles.promptText}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              sending ? (
                <View style={[styles.bubble, styles.assistant, styles.typing]}>
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                  />
                  <Text style={styles.typingText}>
                    {t('ai.thinking') || 'Thinking…'}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.user : styles.assistant,
                  item.redFlag && styles.redFlag,
                ]}
              >
                {item.role === 'assistant' && !item.redFlag ? (
                  <View style={styles.assistantTag}>
                    <Ionicons
                      name="sparkles"
                      size={10}
                      color={colors.brand.primary}
                    />
                    <Text style={styles.assistantTagText}>
                      {t('ai.title')}
                    </Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.bubbleText,
                    item.role === 'user' && { color: '#fff' },
                  ]}
                >
                  {item.content}
                </Text>
              </View>
            )}
          />
        )}

        {suggestedDoctors.length > 0 && summary ? (
          <View style={styles.suggestWrap}>
            <Text style={styles.suggestTitle}>
              {(t('ai.suggestDoctors.title') ||
                'Suggested doctors for {{specialty}}').replace(
                '{{specialty}}',
                summary.specialty,
              )}
            </Text>
            {suggestedDoctors.map((d) => {
              const isSent = forwardedDoctorId === d.id;
              const isSending = forwardingDoctorId === d.id;
              const otherSent = !!forwardedDoctorId && !isSent;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => forwardToDoctor(d)}
                  disabled={isSending || !!forwardedDoctorId}
                  style={({ pressed }) => [
                    styles.doctorCard,
                    otherSent && { opacity: 0.5 },
                    pressed && !forwardedDoctorId && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.doctorAvatar}>
                    <Ionicons
                      name="medkit"
                      size={18}
                      color={colors.brand.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doctorName} numberOfLines={1}>
                      {d.fullName}
                    </Text>
                    <Text style={styles.doctorMeta} numberOfLines={1}>
                      {(isRTL && d.specialtyAr) || d.specialty}
                      {d.rating ? ` · ★ ${d.rating.toFixed(1)}` : ''}
                      {d.yearsExperience
                        ? ` · ${d.yearsExperience}${
                            isRTL ? ' سنة' : 'y'
                          }`
                        : ''}
                    </Text>
                  </View>
                  {isSent ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.brand.primary}
                    />
                  ) : isSending ? (
                    <ActivityIndicator
                      color={colors.brand.primary}
                      size="small"
                    />
                  ) : (
                    <Ionicons
                      name="paper-plane"
                      size={18}
                      color={colors.brand.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {canHandoff && suggestedDoctors.length === 0 ? (
          <Pressable
            onPress={onHandoff}
            disabled={handoffState === 'sending'}
            style={({ pressed }) => [
              styles.handoffBar,
              pressed && { opacity: 0.9 },
            ]}
          >
            {handoffState === 'sending' ? (
              <ActivityIndicator color={colors.brand.primary} size="small" />
            ) : (
              <Ionicons
                name="paper-plane"
                size={16}
                color={colors.brand.primary}
              />
            )}
            <Text style={styles.handoffText} numberOfLines={2}>
              {handoffState === 'sending'
                ? t('ai.handoff.sending') || 'Sending to your doctor…'
                : summaryReady
                ? `${t('ai.handoff.ready') || 'Send summary to doctor'} · ${summary!.specialty}`
                : t('ai.handoff.cta') || 'Send summary to your doctor'}
            </Text>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color={colors.brand.primary}
            />
          </Pressable>
        ) : null}

        <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('ai.inputPlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={() => send(input)}
            style={({ pressed }) => [
              styles.sendBtn,
              (sending || !input.trim()) && styles.sendBtnDisabled,
              pressed && !sending && input.trim() && { opacity: 0.85 },
            ]}
            disabled={sending || !input.trim()}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={colors.text.inverse}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.raised },
  gateLoader: {
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text.inverse,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.xs,
    marginTop: 1,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: colors.text.inverse,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  promptList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.base,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  promptText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size.sm,
  },

  list: { padding: spacing.lg, gap: spacing.sm },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand.primary,
    borderBottomRightRadius: spacing.xs,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.base,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderBottomLeftRadius: spacing.xs,
  },
  assistantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  assistantTagText: {
    fontSize: 10,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  redFlag: {
    backgroundColor: '#FEF3F2',
    borderColor: colors.status.error,
  },
  bubbleText: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typingText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    backgroundColor: colors.surface.base,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.sunken,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.text.muted,
  },
  handoffBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.tint.teal.bg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  suggestWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  suggestTitle: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.base,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    marginBottom: spacing.xs,
  },
  doctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  doctorMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  handoffText: {
    flex: 1,
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
}), [colors]);
}
