import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DoctorMessage,
  DoctorThreadWithDoctor,
  listMyThreads,
} from '@services/api/doctors.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

export default function MessagesScreen() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const threadsQuery = useQuery({
    queryKey: ['doctor-threads'],
    queryFn: listMyThreads,
    refetchInterval: 15000,
  });

  const threads = (threadsQuery.data ?? []).filter(
    (th) => th.doctor && ((th.messages && th.messages.length > 0) || th.lastMessageAt),
  );

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
          <Text style={styles.headerTitle}>{t('messages.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('messages.subtitle')}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/doctors')}
          hitSlop={8}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={colors.text.inverse} />
        </Pressable>
      </LinearGradient>

      {threadsQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(th) => th.id}
          contentContainerStyle={
            threads.length === 0 ? styles.emptyWrap : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={threadsQuery.isFetching}
              onRefresh={() =>
                queryClient.invalidateQueries({ queryKey: ['doctor-threads'] })
              }
            />
          }
          ListEmptyComponent={<EmptyState />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <ThreadRow thread={item} isRtl={isRtl} />}
        />
      )}
    </SafeAreaView>
  );
}

function ThreadRow({
  thread,
  isRtl,
}: {
  thread: DoctorThreadWithDoctor;
  isRtl: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const doctor = thread.doctor;
  if (!doctor) return null;
  const specialty = isRtl
    ? doctor.specialtyAr ?? doctor.specialty
    : doctor.specialty;
  const last = thread.messages?.[0] as DoctorMessage | undefined;
  const preview = last ? previewFor(last, t) : t('messages.noMessages');
  const time = last
    ? formatShortTime(last.createdAt)
    : formatShortTime(thread.lastMessageAt ?? thread.createdAt);
  const unread = last && last.sender === 'DOCTOR' && !last.readAt;

  return (
    <Pressable
      onPress={() => router.push(`/doctors/chat/${doctor.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <View>
        {doctor.photoUrl ? (
          <Image source={{ uri: doctor.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={22} color={colors.brand.primary} />
          </View>
        )}
        {doctor.isAvailable ? <View style={styles.onlineDot} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {doctor.user?.fullName ?? doctor.user?.email ?? specialty}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.specialty} numberOfLines={1}>
          {specialty}
        </Text>
        <View style={styles.previewRow}>
          <Text
            style={[styles.preview, unread && styles.previewUnread]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="chatbubbles-outline"
          size={36}
          color={colors.brand.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>{t('messages.emptyTitle')}</Text>
      <Text style={styles.emptySubtitle}>{t('messages.emptySubtitle')}</Text>
      <Pressable
        onPress={() => router.push('/doctors')}
        style={({ pressed }) => [
          styles.findBtn,
          pressed && { opacity: 0.9 },
        ]}
      >
        <Ionicons name="search" size={16} color={colors.text.inverse} />
        <Text style={styles.findBtnText}>{t('messages.findDoctor')}</Text>
      </Pressable>
    </View>
  );
}

function previewFor(
  m: DoctorMessage,
  t: (k: string) => string,
): string {
  if (m.kind === 'RX_REQUEST') return t('doctors.chat.rxRequest');
  if (m.kind === 'RX_ISSUED') return t('doctors.chat.rxIssued');
  if (m.kind === 'SYMPTOM_SUMMARY') return t('doctors.chat.symptomSummary');
  return m.body;
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7)
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingVertical: spacing.sm,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
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
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  findBtnText: {
    color: colors.text.inverse,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.base,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.tint.teal.bg,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.status.success,
    borderWidth: 2,
    borderColor: colors.surface.base,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  time: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  specialty: {
    fontSize: typography.size.xs,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  preview: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  previewUnread: {
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface.border,
    marginLeft: spacing.lg + 52 + spacing.md,
  },
}), [colors]);
}
