import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { StatCard } from '@components/StatCard';
import { Card } from '@components/Card';
import { ListItem } from '@components/ListItem';
import {
  getDoctorMe,
  listDoctorPatients,
  listDoctorThreads,
  setDoctorAvailability,
  DoctorThreadRow,
} from '@services/api/doctor-portal.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

export default function DoctorHomeScreen() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const meQuery = useQuery({ queryKey: ['doctor-me'], queryFn: getDoctorMe });
  const patientsQuery = useQuery({
    queryKey: ['doctor-patients'],
    queryFn: listDoctorPatients,
  });
  const threadsQuery = useQuery({
    queryKey: ['doctor-threads'],
    queryFn: listDoctorThreads,
  });

  const availability = useMutation({
    mutationFn: (next: boolean) => setDoctorAvailability(next),
    onSuccess: (updated) => {
      queryClient.setQueryData(['doctor-me'], updated);
    },
  });

  const loading =
    meQuery.isLoading || patientsQuery.isLoading || threadsQuery.isLoading;
  const refreshing =
    meQuery.isFetching || patientsQuery.isFetching || threadsQuery.isFetching;

  async function onRefresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['doctor-me'] }),
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] }),
      queryClient.invalidateQueries({ queryKey: ['doctor-threads'] }),
    ]);
  }

  const doctor = meQuery.data;
  const patients = patientsQuery.data ?? [];
  const threads = threadsQuery.data ?? [];

  const unreadCount = threads.reduce((acc, t) => acc + t.unread, 0);
  const openThreads = threads.filter((t) => (t.lastMessage ? true : false));

  const firstName = useMemo(() => {
    const name = doctor?.user.fullName ?? '';
    return name.replace(/^dr\.?\s*/i, '').split(' ')[0] || name;
  }, [doctor?.user.fullName]);

  const specialty = isAr
    ? doctor?.specialtyAr || doctor?.specialty
    : doctor?.specialty;

  const hospitalName = isAr
    ? doctor?.hospital?.nameAr
    : doctor?.hospital?.nameEn;

  const isOnline = doctor?.isAvailable ?? false;

  if (loading && !doctor) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <GradientHeader size="lg">
        <View style={styles.hero}>
          <Text style={styles.hello}>
            {t('doctorPortal.inbox.greeting', { name: firstName || '—' })}
          </Text>
          {specialty ? (
            <Text style={styles.sub}>
              {specialty}
              {hospitalName ? ` · ${hospitalName}` : ''}
            </Text>
          ) : null}

          <View style={styles.availCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.availRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isOnline
                        ? colors.status.success
                        : colors.text.muted,
                    },
                  ]}
                />
                <Text style={styles.availTitle}>
                  {isOnline
                    ? t('doctorPortal.profile.online')
                    : t('doctorPortal.profile.offline')}
                </Text>
              </View>
              <Text style={styles.availHint}>
                {t('doctorPortal.profile.availability')}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={(v) => availability.mutate(v)}
              disabled={availability.isPending}
              trackColor={{
                false: colors.surface.border,
                true: colors.brand.primaryLight,
              }}
              thumbColor={isOnline ? colors.brand.primary : colors.brand.on}
            />
          </View>
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <StatCard
            label={t('doctorPortal.inbox.unread')}
            value={unreadCount}
            icon="mail-unread"
            tint="red"
          />
          <StatCard
            label={t('doctorPortal.inbox.threads')}
            value={openThreads.length}
            icon="chatbubbles"
            tint="teal"
            onPress={() => router.push('/(doctor)/messages')}
          />
          <StatCard
            label={t('doctorPortal.tabs.patients')}
            value={patients.length}
            icon="people"
            tint="blue"
            onPress={() => router.push('/(doctor)/patients')}
          />
        </View>

        <SectionContainer title={t('doctorPortal.inbox.title')}>
          {threads.length === 0 ? (
            <Card>
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={28}
                  color={colors.text.muted}
                />
                <Text style={styles.emptyTitle}>
                  {t('doctorPortal.inbox.emptyTitle')}
                </Text>
                <Text style={styles.emptyBody}>
                  {t('doctorPortal.inbox.emptyBody')}
                </Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {threads.slice(0, 4).map((thread) => (
                <ThreadRow key={thread.id} thread={thread} />
              ))}
            </View>
          )}
        </SectionContainer>

        <SectionContainer title={t('doctorPortal.patients.title')}>
          {patients.length === 0 ? (
            <Card>
              <Text style={styles.emptyBody}>
                {t('doctorPortal.patients.emptyBody')}
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {patients.slice(0, 4).map((row) => (
                <ListItem
                  key={row.threadId}
                  icon="person"
                  tint="teal"
                  title={row.patient.fullName}
                  subtitle={row.patient.phoneNumber ?? row.patient.email}
                  chevron
                  onPress={() =>
                    router.push(`/(doctor)/chat/${row.patient.id}`)
                  }
                />
              ))}
            </View>
          )}
        </SectionContainer>
      </View>
    </ScrollView>
  );
}

function ThreadRow({ thread }: { thread: DoctorThreadRow }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const preview =
    thread.lastMessage?.body?.slice(0, 80) ??
    t('doctorPortal.inbox.noMessages');
  const when = thread.lastMessageAt
    ? new Date(thread.lastMessageAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  return (
    <Card
      onPress={() => router.push(`/(doctor)/chat/${thread.patient.id}`)}
      padding="md"
    >
      <View style={styles.threadRow}>
        <View style={styles.threadAvatar}>
          <Text style={styles.threadAvatarText}>
            {(thread.patient.fullName || 'P').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.threadHeader}>
            <Text style={styles.threadName} numberOfLines={1}>
              {thread.patient.fullName ||
                t('doctorPortal.inbox.unnamedPatient')}
            </Text>
            <Text style={styles.threadTime}>{when}</Text>
          </View>
          <Text style={styles.threadPreview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        {thread.unread > 0 ? (
          <View style={styles.unreadPill}>
            <Text style={styles.unreadText}>{thread.unread}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
      loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.raised,
      },
  hero: { gap: spacing.xs },
  hello: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  sub: {
    fontSize: typography.size.sm,
    color: colors.brand.onMuted,
  },
  availCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand.overlaySoft,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  availTitle: {
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  availHint: {
    color: colors.brand.onMutedSoft,
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  body: {
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyWrap: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  emptyTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  emptyBody: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  threadAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatarText: {
    color: colors.tint.teal.fg,
    fontWeight: typography.weight.bold,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  threadName: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  threadTime: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  threadPreview: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.emergency.base,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  unreadText: {
    color: colors.emergency.on,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
}), [colors]);
}
