import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import {
  listDoctorThreads,
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

export default function DoctorMessagesScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['doctor-threads'],
    queryFn: listDoctorThreads,
  });
  const threads = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('doctorPortal.inbox.title')}
        subtitle={`${threads.length} ${t('doctorPortal.inbox.threads')}`}
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name="chatbubbles-outline"
            size={40}
            color={colors.text.muted}
          />
          <Text style={styles.emptyTitle}>
            {t('doctorPortal.inbox.emptyTitle')}
          </Text>
          <Text style={styles.emptyBody}>
            {t('doctorPortal.inbox.emptyBody')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() =>
                queryClient.invalidateQueries({
                  queryKey: ['doctor-threads'],
                })
              }
            />
          }
          renderItem={({ item }) => <Row thread={item} />}
        />
      )}
    </View>
  );
}

function Row({ thread }: { thread: DoctorThreadRow }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const when = thread.lastMessageAt
    ? new Date(thread.lastMessageAt).toLocaleString([], {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const preview =
    thread.lastMessage?.body?.slice(0, 120) ??
    t('doctorPortal.inbox.noMessages');
  const kind = thread.lastMessage?.kind;
  return (
    <Card
      onPress={() => router.push(`/(doctor)/chat/${thread.patient.id}`)}
      padding="md"
    >
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(thread.patient.fullName || 'P').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {thread.patient.fullName ||
                t('doctorPortal.inbox.unnamedPatient')}
            </Text>
            <Text style={styles.time}>{when}</Text>
          </View>
          {kind && kind !== 'TEXT' ? (
            <View style={styles.kindPill}>
              <Text style={styles.kindText}>{pillLabel(kind, t)}</Text>
            </View>
          ) : null}
          <Text style={styles.preview} numberOfLines={2}>
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

function pillLabel(
  kind: NonNullable<DoctorThreadRow['lastMessage']>['kind'],
  t: (k: string) => string,
): string {
  switch (kind) {
    case 'SYMPTOM_SUMMARY':
      return t('doctors.chat.symptomSummary');
    case 'RX_REQUEST':
      return t('doctors.chat.rxRequest');
    case 'RX_ISSUED':
      return t('doctors.chat.rxIssued');
    default:
      return '';
  }
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  list: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.tint.teal.fg,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  time: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  kindPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.purple.bg,
  },
  kindText: {
    fontSize: typography.size.xs,
    color: colors.tint.purple.fg,
    fontWeight: typography.weight.semibold,
  },
  preview: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 4,
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
