import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  DoctorMessage,
  DoctorMessageKind,
  getDoctor,
  getMyDoctorRating,
  listMessages,
  rateDoctor,
  sendMessage,
} from '@services/api/doctors.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

const CLUSTER_GAP_MS = 5 * 60 * 1000;

export default function DoctorChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const doctorQuery = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => getDoctor(id!),
    enabled: !!id,
  });

  const messagesQuery = useQuery({
    queryKey: ['doctor-messages', id],
    queryFn: () => listMessages(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const ratingQuery = useQuery({
    queryKey: ['doctor-rating', id],
    queryFn: () => getMyDoctorRating(id!),
    enabled: !!id,
  });

  const [ratingDraft, setRatingDraft] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingExpanded, setRatingExpanded] = useState(false);

  const rateMutation = useMutation({
    mutationFn: (payload: { stars: number; comment?: string }) =>
      rateDoctor(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-rating', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor', id] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setRatingExpanded(false);
    },
  });

  const [input, setInput] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const listRef = useRef<FlatList<FeedItem>>(null);

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      clientId: string;
      body: string;
      kind?: DoctorMessageKind;
      metadata?: Record<string, unknown>;
    }) => {
      const { clientId, ...rest } = payload;
      return { clientId, message: await sendMessage(id!, rest) };
    },
    onSuccess: ({ clientId }) => {
      setPending((p) => p.filter((m) => m.clientId !== clientId));
      queryClient.invalidateQueries({ queryKey: ['doctor-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor-threads'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-unread'] });
    },
    onError: (_e, variables) => {
      setPending((p) =>
        p.map((m) =>
          m.clientId === variables.clientId ? { ...m, failed: true } : m,
        ),
      );
    },
  });

  const doctor = doctorQuery.data;
  const messages = messagesQuery.data?.messages ?? [];

  const feed = useMemo(
    () => buildFeed(messages, pending, t),
    [messages, pending, t],
  );

  useEffect(() => {
    if (feed.length > 0) {
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
    }
  }, [feed.length]);

  const sendBody = useCallback(
    (body: string, kind: DoctorMessageKind = 'TEXT', metadata?: Record<string, unknown>) => {
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setPending((p) => [
        ...p,
        { clientId, body, kind, createdAt: new Date().toISOString(), failed: false },
      ]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      sendMutation.mutate({ clientId, body, kind, metadata });
    },
    [sendMutation],
  );

  const onSend = useCallback(() => {
    const body = input.trim();
    if (!body) return;
    setInput('');
    sendBody(body, 'TEXT');
  }, [input, sendBody]);

  const onRequestRx = useCallback(() => {
    setAttachOpen(false);
    sendBody(t('doctors.chat.rxRequestBody'), 'RX_REQUEST');
  }, [sendBody, t]);

  const headerName = doctor?.user.fullName ?? t('doctors.chat.title');
  const headerSpecialty = doctor
    ? isRtl
      ? doctor.specialtyAr ?? doctor.specialty
      : doctor.specialty
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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
        <Pressable
          onPress={() => router.push(`/doctors/${id}`)}
          style={styles.headerIdentity}
        >
          <View style={styles.avatarRing}>
            {doctor?.photoUrl ? (
              <Image source={{ uri: doctor.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons
                  name="person"
                  size={18}
                  color={colors.brand.primary}
                />
              </View>
            )}
            {doctor?.isAvailable ? (
              <View style={styles.onlineDot} />
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {headerName}
            </Text>
            <Text style={styles.headerSpecialty} numberOfLines={1}>
              {doctor?.isAvailable
                ? t('doctors.available')
                : headerSpecialty}
            </Text>
          </View>
        </Pressable>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messagesQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : feed.length === 0 ? (
          <EmptyState
            title={t('doctors.chat.emptyTitle')}
            subtitle={t('doctors.chat.emptySubtitle')}
            doctorName={doctor?.user.fullName ?? ''}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={feed}
            keyExtractor={(it) => it.key}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.type === 'separator') {
                return <DateSeparator label={item.label} />;
              }
              return (
                <MessageBubble
                  item={item}
                  doctorPhoto={doctor?.photoUrl ?? null}
                />
              );
            }}
          />
        )}

        <RatingCard
          existing={ratingQuery.data}
          hasDoctorReply={messages.some((m) => m.sender === 'DOCTOR')}
          expanded={ratingExpanded}
          draftStars={ratingDraft}
          comment={ratingComment}
          submitting={rateMutation.isPending}
          onExpand={() => {
            setRatingExpanded(true);
            if (ratingQuery.data) {
              setRatingDraft(ratingQuery.data.stars);
              setRatingComment(ratingQuery.data.comment ?? '');
            }
          }}
          onCollapse={() => setRatingExpanded(false)}
          onPickStars={setRatingDraft}
          onChangeComment={setRatingComment}
          onSubmit={() => {
            if (ratingDraft < 1) return;
            rateMutation.mutate({
              stars: ratingDraft,
              comment: ratingComment.trim() || undefined,
            });
          }}
        />

        <View style={styles.composer}>
          <Pressable
            onPress={() => setAttachOpen(true)}
            style={({ pressed }) => [
              styles.attachBtn,
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="add" size={24} color={colors.brand.primary} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('doctors.chat.inputPlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={onSend}
            style={({ pressed }) => [
              styles.sendBtn,
              !input.trim() && { backgroundColor: colors.surface.sunken },
              pressed && { opacity: 0.8 },
            ]}
            disabled={!input.trim()}
          >
            <Ionicons
              name="send"
              size={18}
              color={
                input.trim() ? colors.text.inverse : colors.text.muted
              }
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AttachSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onRx={onRequestRx}
      />
    </SafeAreaView>
  );
}

interface PendingMessage {
  clientId: string;
  body: string;
  kind: DoctorMessageKind;
  createdAt: string;
  failed: boolean;
}

type BubbleItem = {
  type: 'bubble';
  key: string;
  sender: 'PATIENT' | 'DOCTOR' | 'SYSTEM';
  kind: DoctorMessageKind;
  body: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  isFirstInCluster: boolean;
  isLastInCluster: boolean;
  pending?: boolean;
  failed?: boolean;
};

type FeedItem =
  | { type: 'separator'; key: string; label: string }
  | BubbleItem;

function buildFeed(
  messages: DoctorMessage[],
  pending: PendingMessage[],
  t: (k: string) => string,
): FeedItem[] {
  const combined: Array<
    | { kind: 'real'; msg: DoctorMessage }
    | { kind: 'pending'; msg: PendingMessage }
  > = [
    ...messages.map((m) => ({ kind: 'real' as const, msg: m })),
    ...pending.map((p) => ({ kind: 'pending' as const, msg: p })),
  ].sort((a, b) =>
    a.msg.createdAt < b.msg.createdAt
      ? -1
      : a.msg.createdAt > b.msg.createdAt
      ? 1
      : 0,
  );

  const out: FeedItem[] = [];
  let lastDay = '';
  for (let i = 0; i < combined.length; i++) {
    const cur = combined[i];
    const prev = i > 0 ? combined[i - 1] : null;
    const next = i < combined.length - 1 ? combined[i + 1] : null;

    const curSender =
      cur.kind === 'real' ? cur.msg.sender : 'PATIENT';
    const prevSender =
      prev?.kind === 'real' ? prev.msg.sender : prev ? 'PATIENT' : null;
    const nextSender =
      next?.kind === 'real' ? next.msg.sender : next ? 'PATIENT' : null;

    const curTime = new Date(cur.msg.createdAt).getTime();
    const prevTime = prev ? new Date(prev.msg.createdAt).getTime() : 0;
    const nextTime = next ? new Date(next.msg.createdAt).getTime() : 0;

    const day = new Date(cur.msg.createdAt).toDateString();
    if (day !== lastDay) {
      out.push({
        type: 'separator',
        key: `sep-${day}`,
        label: formatDayLabel(cur.msg.createdAt, t),
      });
      lastDay = day;
    }

    const sameAsPrev =
      prev &&
      prevSender === curSender &&
      curTime - prevTime < CLUSTER_GAP_MS &&
      day === new Date(prev.msg.createdAt).toDateString();
    const sameAsNext =
      next &&
      nextSender === curSender &&
      nextTime - curTime < CLUSTER_GAP_MS &&
      day === new Date(next.msg.createdAt).toDateString();

    const base: Omit<BubbleItem, 'type'> = cur.kind === 'real'
      ? {
          key: cur.msg.id,
          sender: cur.msg.sender,
          kind: cur.msg.kind,
          body: cur.msg.body,
          createdAt: cur.msg.createdAt,
          metadata: cur.msg.metadata,
          readAt: cur.msg.readAt,
          isFirstInCluster: !sameAsPrev,
          isLastInCluster: !sameAsNext,
        }
      : {
          key: cur.msg.clientId,
          sender: 'PATIENT',
          kind: cur.msg.kind,
          body: cur.msg.body,
          createdAt: cur.msg.createdAt,
          isFirstInCluster: !sameAsPrev,
          isLastInCluster: !sameAsNext,
          pending: !cur.msg.failed,
          failed: cur.msg.failed,
        };

    out.push({ type: 'bubble', ...base });
  }
  return out;
}

function formatDayLabel(iso: string, t: (k: string) => string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return t('doctors.chat.todayPill');
  if (d.toDateString() === yest.toDateString())
    return t('doctors.chat.yesterdayPill');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DateSeparator({ label }: { label: string }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.separatorWrap}>
      <View style={styles.separatorPill}>
        <Text style={styles.separatorText}>{label}</Text>
      </View>
    </View>
  );
}

function EmptyState({
  title,
  subtitle,
  doctorName,
}: {
  title: string;
  subtitle: string;
  doctorName: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="chatbubbles"
          size={36}
          color={colors.brand.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>
        {subtitle}
        {doctorName ? ` — ${doctorName}` : ''}
      </Text>
    </View>
  );
}

function MessageBubble({
  item,
  doctorPhoto,
}: {
  item: BubbleItem;
  doctorPhoto: string | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const mine = item.sender === 'PATIENT';
  const isSystem = item.sender === 'SYSTEM' || item.kind === 'SYSTEM';

  if (isSystem) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{item.body}</Text>
      </View>
    );
  }

  const isRx = item.kind === 'RX_REQUEST' || item.kind === 'RX_ISSUED';
  const isSymptom = item.kind === 'SYMPTOM_SUMMARY';

  const bubbleShape = getBubbleShape(mine, item.isFirstInCluster, item.isLastInCluster);

  return (
    <View
      style={[
        styles.bubbleRow,
        mine && styles.bubbleRowMine,
        !item.isLastInCluster && styles.bubbleRowTight,
      ]}
    >
      {!mine ? (
        item.isLastInCluster ? (
          <DoctorAvatar photo={doctorPhoto} />
        ) : (
          <View style={styles.rowAvatar} />
        )
      ) : null}
      <View
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          bubbleShape,
          (isRx || isSymptom) && styles.bubbleSpecial,
          item.failed && styles.bubbleFailed,
        ]}
      >
        {(isRx || isSymptom) && (
          <View style={styles.specialHeader}>
            <Ionicons
              name={isRx ? 'medkit' : 'document-text'}
              size={14}
              color={mine ? colors.text.inverse : colors.brand.primary}
            />
            <Text
              style={[
                styles.specialLabel,
                { color: mine ? colors.text.inverse : colors.brand.primary },
              ]}
            >
              {isRx
                ? item.kind === 'RX_ISSUED'
                  ? t('doctors.chat.rxIssued')
                  : t('doctors.chat.rxRequest')
                : t('doctors.chat.symptomSummary')}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.bubbleText,
            { color: mine ? colors.text.inverse : colors.text.primary },
          ]}
        >
          {item.body}
        </Text>
        {item.isLastInCluster ? (
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.metaText,
                { color: mine ? 'rgba(255,255,255,0.75)' : colors.text.muted },
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
            {mine ? (
              item.failed ? (
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={colors.status.error}
                />
              ) : item.pending ? (
                <Ionicons
                  name="time-outline"
                  size={13}
                  color="rgba(255,255,255,0.75)"
                />
              ) : (
                <Ionicons
                  name={item.readAt ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.readAt ? '#B9F5EC' : 'rgba(255,255,255,0.75)'}
                />
              )
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function getBubbleShape(mine: boolean, first: boolean, last: boolean) {
  const tight = 6;
  const round = 18;
  if (mine) {
    return {
      borderTopLeftRadius: round,
      borderTopRightRadius: first ? round : tight,
      borderBottomLeftRadius: round,
      borderBottomRightRadius: last ? 4 : tight,
    };
  }
  return {
    borderTopLeftRadius: first ? round : tight,
    borderTopRightRadius: round,
    borderBottomLeftRadius: last ? 4 : tight,
    borderBottomRightRadius: round,
  };
}

function DoctorAvatar({ photo }: { photo: string | null }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  if (photo) {
    return <Image source={{ uri: photo }} style={styles.rowAvatar} />;
  }
  return (
    <View style={[styles.rowAvatar, styles.avatarFallback]}>
      <Ionicons name="person" size={14} color={colors.brand.primary} />
    </View>
  );
}

function RatingCard({
  existing,
  hasDoctorReply,
  expanded,
  draftStars,
  comment,
  submitting,
  onExpand,
  onCollapse,
  onPickStars,
  onChangeComment,
  onSubmit,
}: {
  existing: { stars: number; comment: string | null } | null | undefined;
  hasDoctorReply: boolean;
  expanded: boolean;
  draftStars: number;
  comment: string;
  submitting: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onPickStars: (n: number) => void;
  onChangeComment: (s: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  if (!hasDoctorReply && !existing) return null;

  if (!expanded) {
    if (existing) {
      return (
        <Pressable
          onPress={onExpand}
          style={({ pressed }) => [
            styles.ratingPill,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="star" size={14} color={colors.status.warning} />
          <Text style={styles.ratingPillText}>
            {t('doctors.chat.yourRating', { stars: existing.stars })}
          </Text>
          <Ionicons name="pencil" size={12} color={colors.text.muted} />
        </Pressable>
      );
    }
    return (
      <Pressable
        onPress={onExpand}
        style={({ pressed }) => [
          styles.ratingPrompt,
          pressed && { opacity: 0.92 },
        ]}
      >
        <View style={styles.ratingPromptIcon}>
          <Ionicons name="star" size={18} color={colors.status.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ratingPromptTitle}>
            {t('doctors.chat.ratePromptTitle')}
          </Text>
          <Text style={styles.ratingPromptSubtitle}>
            {t('doctors.chat.ratePromptSubtitle')}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.text.muted}
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.ratingCard}>
      <View style={styles.ratingCardHeader}>
        <Text style={styles.ratingCardTitle}>
          {existing
            ? t('doctors.chat.updateRatingTitle')
            : t('doctors.chat.ratePromptTitle')}
        </Text>
        <Pressable onPress={onCollapse} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.text.muted} />
        </Pressable>
      </View>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onPickStars(n)}
            hitSlop={6}
            style={styles.starBtn}
          >
            <Ionicons
              name={n <= draftStars ? 'star' : 'star-outline'}
              size={32}
              color={
                n <= draftStars ? colors.status.warning : colors.text.muted
              }
            />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={onChangeComment}
        placeholder={t('doctors.chat.ratingCommentPlaceholder')}
        placeholderTextColor={colors.text.muted}
        style={styles.ratingInput}
        multiline
        maxLength={500}
      />
      <Pressable
        onPress={onSubmit}
        disabled={submitting || draftStars < 1}
        style={({ pressed }) => [
          styles.ratingSubmit,
          (submitting || draftStars < 1) && { opacity: 0.5 },
          pressed && { opacity: 0.88 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={colors.text.inverse} />
        ) : (
          <>
            <Ionicons name="send" size={14} color={colors.text.inverse} />
            <Text style={styles.ratingSubmitText}>
              {existing
                ? t('doctors.chat.updateRating')
                : t('doctors.chat.submitRating')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function AttachSheet({
  visible,
  onClose,
  onRx,
}: {
  visible: boolean;
  onClose: () => void;
  onRx: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Pressable style={styles.sheetRow} onPress={onRx}>
            <View
              style={[
                styles.sheetIcon,
                { backgroundColor: colors.tint.teal.bg },
              ]}
            >
              <Ionicons name="medkit" size={20} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>
                {t('doctors.chat.requestRx')}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {t('doctors.chat.requestRxSubtitle')}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.text.muted}
            />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
    paddingVertical: spacing.sm,
    ...shadow.soft,
  },
  headerBtn: { padding: spacing.xs },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarRing: {
    position: 'relative',
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.base,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.status.success,
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  headerName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  headerSpecialty: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  separatorWrap: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  separatorPill: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  separatorText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.3,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginBottom: 6,
  },
  bubbleRowTight: { marginBottom: 2 },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  rowAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tint.teal.bg,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  bubbleMine: {
    backgroundColor: colors.brand.primary,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface.base,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  bubbleSpecial: {
    minWidth: '55%',
  },
  bubbleFailed: {
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  bubbleText: {
    fontSize: typography.size.md,
    lineHeight: 22,
  },
  specialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  specialLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  metaText: {
    fontSize: 10,
    color: colors.text.muted,
  },
  systemWrap: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.sunken,
  },
  systemText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    backgroundColor: colors.surface.base,
  },
  ratingPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.base,
    borderWidth: 1,
    borderColor: colors.tint.yellow.bg,
    ...shadow.soft,
  },
  ratingPromptIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.tint.yellow.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPromptTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  ratingPromptSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 1,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.yellow.bg,
  },
  ratingPillText: {
    fontSize: typography.size.xs,
    color: colors.tint.yellow.fg,
    fontWeight: typography.weight.bold,
  },
  ratingCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.base,
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing.sm,
    ...shadow.soft,
  },
  ratingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingCardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  starBtn: {
    padding: 4,
  },
  ratingInput: {
    minHeight: 44,
    maxHeight: 80,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface.sunken,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  ratingSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  ratingSubmitText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.sm,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.sunken,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.base,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.soft,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface.border,
    marginBottom: spacing.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  sheetSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
}), [colors]);
}
