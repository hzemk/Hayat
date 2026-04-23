import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { TintedSection } from '@components/TintedSection';
import { Card } from '@components/Card';
import { ListItem } from '@components/ListItem';
import { InfoChip } from '@components/InfoChip';
import { StatCard } from '@components/StatCard';
import { Reminder } from '@services/api/reminders.api';
import { findPreviewMember } from '@services/api/family.preview';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

function ageFrom(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(age, 0);
}

function formatClock(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(iso: string, locale: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return '';
  return d.toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

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

function reminderIcon(type: Reminder['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'MEDICATION':
      return 'medical';
    case 'APPOINTMENT':
      return 'calendar';
    case 'CHECKUP':
      return 'pulse';
    default:
      return 'notifications';
  }
}

export default function FamilyMemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const member = id ? findPreviewMember(id) : undefined;

  const sortedReminders = useMemo(
    () =>
      [...(member?.reminders ?? [])].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime(),
      ),
    [member],
  );

  const initials = useMemo(() => {
    if (!member) return '';
    return member.fullName
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [member]);

  if (!member) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface.raised }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <GradientHeader showBack title={t('family.title')} />
        <View style={styles.body}>
          <Card>
            <Text style={{ color: colors.text.muted }}>
              {t('family.notFound')}
            </Text>
          </Card>
        </View>
      </ScrollView>
    );
  }

  const age = ageFrom(member.dateOfBirth);
  const medicationReminders = sortedReminders.filter(
    (r) => r.type === 'MEDICATION',
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <GradientHeader showBack size="lg">
        <View style={styles.heroBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <Text style={styles.name}>{member.fullName}</Text>
          <Text style={styles.meta}>
            {t('family.yearsOld', { age })} ·{' '}
            {t(`family.relation.${member.relationship}`, {
              defaultValue: member.relationship,
            })}
          </Text>
          {member.sanadSubject ? (
            <View style={styles.sanadPill}>
              <Text style={styles.sanadPillText}>
                سند · {t('family.linkedViaSanad')}
              </Text>
            </View>
          ) : null}
        </View>
      </GradientHeader>

      <View style={styles.body}>
        {member.needsUrgentCare ? (
          <TintedSection
            title={t('family.urgentBanner')}
            tint="red"
            icon="alert-circle"
          >
            <Text style={styles.urgentBody}>
              {member.urgentCareNote ?? t('family.urgentDefault')}
            </Text>
          </TintedSection>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard
            label={t('records.bloodType')}
            value={member.bloodType ?? '—'}
            icon="water"
            tint="red"
          />
          <StatCard
            label={t('family.allergiesCount')}
            value={String(member.allergies.length)}
            icon="warning"
            tint="yellow"
          />
          <StatCard
            label={t('family.medsCount')}
            value={String(member.medications.length)}
            icon="medical"
            tint="teal"
          />
        </View>

        {medicationReminders.length > 0 ? (
          <SectionContainer title={t('family.medicationSchedule')}>
            {medicationReminders.map((r) => (
              <View key={r.id} style={styles.scheduleRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeText}>
                    {formatClock(r.scheduledAt, i18n.language)}
                  </Text>
                  <Text style={styles.dayText}>
                    {formatDay(r.scheduledAt, i18n.language) ||
                      t('family.today')}
                  </Text>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  {r.subtitle ? (
                    <Text style={styles.scheduleSubtitle} numberOfLines={2}>
                      {r.subtitle}
                    </Text>
                  ) : null}
                  <Text style={styles.scheduleRelative}>
                    {formatRelative(r.scheduledAt)}
                  </Text>
                </View>
              </View>
            ))}
          </SectionContainer>
        ) : null}

        {member.allergies.length > 0 ? (
          <TintedSection
            title={t('records.allergies')}
            tint="yellow"
            icon="warning"
          >
            <View style={styles.chipRow}>
              {member.allergies.map((a) => (
                <InfoChip key={a} label={a} tint="yellow" icon="warning" />
              ))}
            </View>
          </TintedSection>
        ) : null}

        {member.conditions.length > 0 ? (
          <TintedSection
            title={t('records.conditions')}
            tint="rose"
            icon="fitness"
          >
            <View style={styles.chipRow}>
              {member.conditions.map((c) => (
                <InfoChip key={c} label={c} tint="rose" />
              ))}
            </View>
          </TintedSection>
        ) : null}

        <SectionContainer title={t('records.medications')}>
          {member.medications.length === 0 ? (
            <Card variant="outline" padding="md">
              <Text style={styles.emptyText}>{t('family.noMedications')}</Text>
            </Card>
          ) : (
            member.medications.map((m) => (
              <ListItem
                key={m.id}
                icon="medical"
                tint="teal"
                title={m.name}
                subtitle={[m.dose, m.frequency].filter(Boolean).join(' · ')}
              />
            ))
          )}
        </SectionContainer>

        {sortedReminders.filter((r) => r.type !== 'MEDICATION').length > 0 ? (
          <SectionContainer title={t('family.upcomingReminders')}>
            {sortedReminders
              .filter((r) => r.type !== 'MEDICATION')
              .map((r) => (
                <ListItem
                  key={r.id}
                  icon={reminderIcon(r.type)}
                  tint="blue"
                  title={r.title}
                  subtitle={r.subtitle ?? undefined}
                  trailing={
                    <Text style={styles.trailingTime}>
                      {formatRelative(r.scheduledAt)}
                    </Text>
                  }
                />
              ))}
          </SectionContainer>
        ) : null}
      </View>
    </ScrollView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  heroBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    backgroundColor: colors.brand.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brand.overlayStrong,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  avatarText: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  name: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  meta: {
    color: colors.brand.onMuted,
    fontSize: typography.size.sm,
  },
  sanadPill: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand.sanad.bg,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  sanadPillText: {
    color: colors.brand.sanad.fg,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  urgentBody: {
    fontSize: typography.size.sm,
    color: colors.tint.red.fg,
    fontWeight: typography.weight.medium,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.base,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.soft,
  },
  timeBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  timeText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.brand.primary,
  },
  dayText: {
    fontSize: 10,
    color: colors.text.muted,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  scheduleDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.surface.border,
  },
  scheduleTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  scheduleSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  scheduleRelative: {
    fontSize: typography.size.xs,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    marginTop: 4,
  },
  trailingTime: {
    fontSize: typography.size.xs,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
  },
}), [colors]);
}
