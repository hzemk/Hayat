import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { GradientHeader } from '@components/GradientHeader';
import { GradientButton } from '@components/GradientButton';
import { Card } from '@components/Card';
import { LifeTree } from '@components/LifeTree';
import {
  deriveQuitSmoking,
  useQuitSmokingStore,
} from '@stores/quitSmoking';
import {
  dailyMessage,
  HEALTH_MILESTONES,
  HealthMilestone,
  lastReachedMilestone,
  nextMilestone,
  nextStageInfo,
  STAGE_THRESHOLDS,
  TreeStage,
} from '@services/quitSmoking';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useTheme,
} from '@theme/index';



const STAGE_LABEL_EN: Record<TreeStage, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  plant: 'Small plant',
  young: 'Young tree',
  full: 'Full tree',
};
const STAGE_LABEL_AR: Record<TreeStage, string> = {
  seed: 'بذرة',
  sprout: 'برعم',
  plant: 'نبتة صغيرة',
  young: 'شجرة يافعة',
  full: 'شجرة وارفة',
};

export default function QuitSmokingScreen() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language === 'en' ? 'en' : 'ar') as 'ar' | 'en';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const isHydrated = useQuitSmokingStore((s) => s.isHydrated);
  const setup = useQuitSmokingStore((s) => s.setup);
  const slips = useQuitSmokingStore((s) => s.slips);
  const lastCheckIn = useQuitSmokingStore((s) => s.lastCheckIn);
  const checkInToday = useQuitSmokingStore((s) => s.checkInToday);
  const recordSlip = useQuitSmokingStore((s) => s.recordSlip);
  const reset = useQuitSmokingStore((s) => s.reset);

  const derived = useMemo(
    () => deriveQuitSmoking(setup, slips, lastCheckIn),
    [setup, slips, lastCheckIn],
  );

  // Bounce to setup once hydration finishes if there's no setup yet.
  useEffect(() => {
    if (isHydrated && !setup) {
      router.replace(('/quit-smoking/setup' as never));
    }
  }, [isHydrated, setup]);

  if (!isHydrated || !setup || !derived) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.raised,
        }}
      >
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const stageLabel =
    locale === 'ar' ? STAGE_LABEL_AR[derived.stage] : STAGE_LABEL_EN[derived.stage];
  const next = nextStageInfo(derived.effectiveDays);
  const nextLabel = next.next
    ? locale === 'ar'
      ? STAGE_LABEL_AR[next.next]
      : STAGE_LABEL_EN[next.next]
    : null;
  const message = dailyMessage(derived.effectiveDays, locale);
  const hasRecentSlip = slips.length > 0
    ? (() => {
        const last = new Date(slips[0]);
        const ageDays = (Date.now() - last.getTime()) / 86400000;
        return ageDays < 3;
      })()
    : false;

  function onStayed() {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    void checkInToday();
  }

  function onSlipped() {
    Alert.alert(
      t('quit.slip.title', { defaultValue: 'Record a slip?' }),
      t('quit.slip.body', {
        defaultValue:
          'Your tree will lose a little ground — but not all of it. Tomorrow is a fresh start.',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('quit.slip.confirm', { defaultValue: 'Yes, I slipped' }),
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            ).catch(() => undefined);
            void recordSlip();
          },
        },
      ],
    );
  }

  function onReset() {
    Alert.alert(
      t('quit.reset.title', { defaultValue: 'Start over?' }),
      t('quit.reset.body', {
        defaultValue:
          'This wipes your streak, slips, and saved settings. Your account is not affected.',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('quit.reset.confirm', { defaultValue: 'Reset' }),
          style: 'destructive',
          onPress: () => {
            void reset();
            router.replace(('/quit-smoking/setup' as never));
          },
        },
      ],
    );
  }

  const lastMilestone = lastReachedMilestone(derived.effectiveDays);
  const upcoming = nextMilestone(derived.effectiveDays);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <GradientHeader
        title={t('quit.title', { defaultValue: 'Life Tree' })}
        subtitle={stageLabel}
        showBack
        right={
          <Pressable
            onPress={onReset}
            hitSlop={8}
            style={styles.iconBtn}
            accessibilityLabel={t('quit.reset.title', {
              defaultValue: 'Reset',
            })}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={colors.text.inverse}
            />
          </Pressable>
        }
      />

      <View style={styles.body}>
        {/* Tree centerpiece */}
        <View style={styles.treeWrap}>
          <LifeTree stage={derived.stage} hasRecentSlip={hasRecentSlip} />
          <Text style={styles.streak}>{derived.effectiveDays}</Text>
          <Text style={styles.streakLabel}>
            {t('quit.daysClean', {
              defaultValue:
                derived.effectiveDays === 1
                  ? '{{count}} day smoke-free'
                  : '{{count}} days smoke-free',
              count: derived.effectiveDays,
            })}
          </Text>
          {nextLabel && next.daysLeft != null ? (
            <Text style={styles.nextLine}>
              {t('quit.nextStage', {
                defaultValue: '{{count}} day to {{label}}',
                count: next.daysLeft,
                label: nextLabel,
              })}
            </Text>
          ) : (
            <Text style={styles.nextLine}>
              {t('quit.fullStage', {
                defaultValue: '🌳 Full tree reached — keep going strong.',
              })}
            </Text>
          )}
        </View>

        {/* Daily message */}
        <Card padding="md" style={{ gap: spacing.xs }}>
          <View style={styles.row}>
            <Ionicons name="sparkles" size={16} color={colors.brand.primary} />
            <Text style={styles.cardTitle}>
              {t('quit.todaysMessage', {
                defaultValue: 'Today',
              })}
            </Text>
          </View>
          <Text style={styles.message}>{message}</Text>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card padding="md" style={styles.statCard}>
            <Text style={styles.statValue}>
              {derived.moneySavedTotal.toFixed(2)}
              <Text style={styles.statCurrency}> {setup.currency}</Text>
            </Text>
            <Text style={styles.statLabel}>
              {t('quit.moneySaved', { defaultValue: 'Money saved' })}
            </Text>
          </Card>
          <Card padding="md" style={styles.statCard}>
            <Text style={styles.statValue}>
              {derived.cigarettesAvoidedTotal}
            </Text>
            <Text style={styles.statLabel}>
              {t('quit.cigsAvoided', {
                defaultValue: 'Cigarettes avoided',
              })}
            </Text>
          </Card>
        </View>

        {/* Health */}
        <Card padding="md" style={{ gap: spacing.md }}>
          <View style={styles.row}>
            <Ionicons name="heart" size={16} color={colors.tint.red.fg} />
            <Text style={styles.cardTitle}>
              {t('quit.health', { defaultValue: 'Health recovery' })}
            </Text>
          </View>
          {lastMilestone ? (
            <View style={styles.milestoneCurrent}>
              <Text style={styles.milestoneTitle}>
                ✓ {lastMilestone.title[locale]}
              </Text>
              <Text style={styles.milestoneBody}>
                {lastMilestone.body[locale]}
              </Text>
            </View>
          ) : (
            <Text style={styles.muted}>
              {t('quit.healthEarly', {
                defaultValue: 'Recovery starts in your first 20 minutes.',
              })}
            </Text>
          )}
          {upcoming ? (
            <View style={styles.milestoneNext}>
              <Text style={styles.milestoneNextLabel}>
                {t('quit.next', { defaultValue: 'Next' })}
              </Text>
              <Text style={styles.milestoneTitle}>
                {upcoming.title[locale]}
              </Text>
              <Text style={styles.milestoneBody}>
                {upcoming.body[locale]}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Action buttons */}
        <View style={{ gap: spacing.sm }}>
          <GradientButton
            label={
              derived.hasCheckedInToday
                ? t('quit.actions.checkedIn', {
                    defaultValue: '✓ Checked in for today',
                  })
                : t('quit.actions.stayed', {
                    defaultValue: 'I stayed smoke-free today',
                  })
            }
            onPress={onStayed}
            disabled={derived.hasCheckedInToday}
          />
          <Pressable
            onPress={onSlipped}
            style={({ pressed }) => [
              styles.slipBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name="leaf-outline"
              size={16}
              color={colors.text.muted}
            />
            <Text style={styles.slipText}>
              {t('quit.actions.slipped', {
                defaultValue: 'I slipped',
              })}
            </Text>
          </Pressable>
        </View>

        {/* Slip history (only if any) */}
        {slips.length > 0 ? (
          <Card padding="md" style={{ gap: spacing.xs }}>
            <Text style={styles.cardTitle}>
              {t('quit.slipHistory', {
                defaultValue: 'Recent slips',
              })}
            </Text>
            {slips.slice(0, 5).map((s) => (
              <Text key={s} style={styles.slipRow}>
                · {s}
              </Text>
            ))}
          </Card>
        ) : null}

        {/* All milestones — passive reference */}
        <Card padding="md" style={{ gap: spacing.sm }}>
          <Text style={styles.cardTitle}>
            {t('quit.timeline', { defaultValue: 'Recovery timeline' })}
          </Text>
          {HEALTH_MILESTONES.map((m) => {
            const reached = derived.effectiveDays * 24 >= m.hours;
            return <MilestoneRow key={m.id} m={m} reached={reached} locale={locale} />;
          })}
        </Card>

        {/* Stage scale — bottom */}
        <Card padding="md" variant="outline" style={{ gap: spacing.xs }}>
          <Text style={styles.cardTitle}>
            {t('quit.stages', { defaultValue: 'Tree stages' })}
          </Text>
          {STAGE_THRESHOLDS.map((t2) => {
            const label =
              locale === 'ar'
                ? STAGE_LABEL_AR[t2.stage]
                : STAGE_LABEL_EN[t2.stage];
            const active = derived.stage === t2.stage;
            return (
              <View key={t2.stage} style={styles.stageRow}>
                <Text
                  style={[
                    styles.stageLabel,
                    active && { color: colors.brand.primary, fontWeight: '700' },
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.stageDay,
                    active && { color: colors.brand.primary, fontWeight: '700' },
                  ]}
                >
                  {t2.fromDay === 0
                    ? t('quit.day0', { defaultValue: 'Day 0' })
                    : t('quit.dayN', {
                        defaultValue: 'Day {{n}}+',
                        n: t2.fromDay,
                      })}
                </Text>
              </View>
            );
          })}
        </Card>
      </View>
    </ScrollView>
  );
}

function MilestoneRow({
  m,
  reached,
  locale,
}: {
  m: HealthMilestone;
  reached: boolean;
  locale: 'ar' | 'en';
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.timelineRow}>
      <View
        style={[
          styles.timelineDot,
          {
            backgroundColor: reached
              ? colors.tint.green.fg
              : colors.surface.border,
          },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.timelineTitle,
            !reached && { color: colors.text.muted },
          ]}
        >
          {m.title[locale]}
        </Text>
        <Text style={styles.timelineBody}>{m.body[locale]}</Text>
      </View>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        body: {
          padding: spacing.lg,
          gap: spacing.md,
        },
        treeWrap: {
          alignItems: 'center',
          paddingVertical: spacing.md,
        },
        streak: {
          marginTop: spacing.xs,
          fontSize: 56,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
          lineHeight: 60,
        },
        streakLabel: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          fontWeight: typography.weight.semibold,
          marginTop: 2,
        },
        nextLine: {
          marginTop: spacing.xs,
          fontSize: typography.size.xs,
          color: colors.text.muted,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        },
        cardTitle: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        message: {
          fontSize: typography.size.md,
          color: colors.text.primary,
          lineHeight: 22,
        },
        statsRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        statCard: {
          flex: 1,
          alignItems: 'center',
          gap: spacing.xs,
        },
        statValue: {
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        statCurrency: {
          fontSize: typography.size.sm,
          color: colors.text.muted,
          fontWeight: typography.weight.semibold,
        },
        statLabel: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          textAlign: 'center',
        },
        milestoneCurrent: {
          backgroundColor: colors.tint.green.bg,
          borderRadius: radius.md,
          padding: spacing.md,
          gap: 4,
        },
        milestoneNext: {
          borderTopWidth: 1,
          borderTopColor: colors.surface.border,
          paddingTop: spacing.sm,
          gap: 4,
        },
        milestoneNextLabel: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          textTransform: 'uppercase',
          fontWeight: typography.weight.bold,
          letterSpacing: 0.6,
        },
        milestoneTitle: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        milestoneBody: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          lineHeight: 20,
        },
        muted: {
          fontSize: typography.size.sm,
          color: colors.text.muted,
        },
        slipBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.sm,
        },
        slipText: {
          fontSize: typography.size.sm,
          color: colors.text.muted,
          fontWeight: typography.weight.semibold,
        },
        slipRow: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
        },
        timelineRow: {
          flexDirection: 'row',
          gap: spacing.md,
          paddingVertical: spacing.xs,
        },
        timelineDot: {
          width: 12,
          height: 12,
          borderRadius: 6,
          marginTop: 5,
        },
        timelineTitle: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
        },
        timelineBody: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          marginTop: 1,
        },
        stageRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 4,
        },
        stageLabel: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
        },
        stageDay: {
          fontSize: typography.size.sm,
          color: colors.text.muted,
        },
        iconBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors],
  );
}
