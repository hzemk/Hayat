import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { ListItem } from '@components/ListItem';
import { Card } from '@components/Card';
import { FloatingChatButton } from '@components/FloatingChatButton';
import { useAuthStore } from '@stores/auth';
import {
  listUpcomingReminders,
  Reminder,
} from '@services/api/reminders.api';
import { listAppointments, Appointment } from '@services/api/appointments.api';
import { getUnreadCount } from '@services/api/doctors.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  Tint,
  useTheme,
} from '@theme/index';

function formatRelative(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) {
    return minutes >= 0 ? `in ${minutes}m` : `${-minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return hours >= 0 ? `in ${hours}h` : `${-hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return days >= 0 ? `in ${days}d` : `${-days}d ago`;
}

function reminderIcon(type: Reminder['type']) {
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

function reminderTint(type: Reminder['type']): Tint {
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

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const user = useAuthStore((s) => s.user);
  const name = user?.fullName?.split(' ')[0] ?? '';
  const { width } = useWindowDimensions();
  const tileWidth = (width - spacing.lg * 2 - spacing.md) / 2;
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data: reminders } = useQuery({
    queryKey: ['reminders', 'upcoming'],
    queryFn: () => listUpcomingReminders(3),
  });

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: listAppointments,
  });

  const { data: unread } = useQuery({
    queryKey: ['doctor-unread'],
    queryFn: getUnreadCount,
    refetchInterval: 15000,
  });

  const nextAppointment: Appointment | undefined = appointments?.find(
    (a) =>
      (a.status === 'CONFIRMED' || a.status === 'PENDING') &&
      new Date(a.scheduledAt).getTime() > Date.now(),
  );

  const tiles: {
    key: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: Tint;
    onPress: () => void;
    badge?: number;
  }[] = [
    {
      key: 'messages',
      title: t('home.messages') || 'Messages',
      icon: 'chatbubbles',
      tint: 'teal',
      onPress: () => router.push('/messages'),
      badge: unread ?? 0,
    },
    {
      key: 'booking',
      title: t('home.bookAppointment'),
      icon: 'calendar',
      tint: 'blue',
      onPress: () => router.push('/booking'),
    },
    {
      key: 'family',
      title: t('home.family'),
      icon: 'people',
      tint: 'rose',
      onPress: () => router.push('/family'),
    },
    {
      key: 'prescriptions',
      title: t('home.myPrescriptions'),
      icon: 'document-text',
      tint: 'purple',
      onPress: () => router.push('/prescriptions'),
    },
    {
      key: 'record',
      title: t('home.medicalRecord'),
      icon: 'medkit',
      tint: 'green',
      onPress: () => router.push('/(tabs)/records'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl + spacing.xl }}
    >
      <GradientHeader
        subtitle={t('home.welcomeBack')}
        title={name ? t('home.greeting', { name }) : t('app.name')}
        right={
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}
          >
            <Ionicons name="person" size={22} color={colors.text.inverse} />
          </Pressable>
        }
      >
        <Pressable
          onPress={() => router.push('/emergency')}
          style={({ pressed }) => [
            styles.sosCard,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View style={styles.sosIcon}>
            <Ionicons name="alert" size={22} color={colors.emergency.base} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>{t('home.urgentCare')}</Text>
            <Text style={styles.sosSubtitle}>{t('home.urgentCaseDesc')}</Text>
          </View>
          <View style={styles.sosPill}>
            <Text style={styles.sosPillText}>{t('home.sos')}</Text>
          </View>
        </Pressable>
      </GradientHeader>

      <View style={styles.body}>
        <SectionContainer title={t('home.quickAccess')}>
          <View style={styles.grid}>
            {tiles.map((tile) => {
              const palette = colors.tint[tile.tint];
              return (
                <Card
                  key={tile.key}
                  onPress={tile.onPress}
                  style={[styles.tile, { width: tileWidth }]}
                  padding="lg"
                >
                  <View
                    style={[
                      styles.iconBubble,
                      { backgroundColor: palette.bg },
                    ]}
                  >
                    <Ionicons name={tile.icon} size={20} color={palette.fg} />
                    {tile.badge && tile.badge > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {tile.badge > 9 ? '9+' : tile.badge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.tileText} numberOfLines={2}>
                    {tile.title}
                  </Text>
                </Card>
              );
            })}
          </View>
        </SectionContainer>

        {nextAppointment ? (
          <SectionContainer title={t('home.nextAppointment')}>
            <ListItem
              icon="calendar"
              tint="blue"
              title={
                isRtl
                  ? nextAppointment.department.nameAr
                  : nextAppointment.department.nameEn
              }
              subtitle={
                isRtl
                  ? nextAppointment.hospital.nameAr
                  : nextAppointment.hospital.nameEn
              }
              chevron
              onPress={() =>
                router.push(`/appointments/${nextAppointment.id}`)
              }
              trailing={
                <Text style={styles.trailingTime}>
                  {formatRelative(nextAppointment.scheduledAt)}
                </Text>
              }
            />
          </SectionContainer>
        ) : null}

        <SectionContainer
          title={t('home.todaysReminders')}
          action={{
            label: t('home.upcoming'),
            onPress: () => router.push('/(tabs)/reminders'),
          }}
        >
          {reminders && reminders.length > 0 ? (
            reminders.map((r) => (
              <ListItem
                key={r.id}
                icon={reminderIcon(r.type)}
                tint={reminderTint(r.type)}
                title={r.title}
                subtitle={r.subtitle ?? undefined}
                onPress={() => router.push('/(tabs)/reminders')}
                chevron
                trailing={
                  <Text style={styles.trailingTime}>
                    {formatRelative(r.scheduledAt)}
                  </Text>
                }
              />
            ))
          ) : (
            <Card variant="outline" padding="md">
              <Text style={styles.empty}>{t('home.noReminders')}</Text>
            </Card>
          )}
        </SectionContainer>
      </View>
    </ScrollView>
    <FloatingChatButton />
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.base,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.raised,
  },
  sosIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.tint.red.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  sosSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sosPill: {
    backgroundColor: colors.emergency.base,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  sosPillText: {
    color: '#fff',
    fontWeight: typography.weight.bold,
    fontSize: typography.size.sm,
  },
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    gap: spacing.md,
    minHeight: 120,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.emergency.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface.base,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
  tileText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  trailingTime: {
    fontSize: typography.size.xs,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
  },
  empty: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
  },
}), [colors]);
}
