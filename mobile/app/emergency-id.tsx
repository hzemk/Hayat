import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { useAuthStore } from '@stores/auth';
import {
  createMedicalIdShareToken,
  getMyMedicalRecord,
  medicalIdShareUrl,
  type Allergy,
  type Condition,
  type Medication,
} from '@services/api/medicalRecord.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

type SeverityLevel = 'high' | 'medium' | 'low' | 'unknown';

const HIGH_SEVERITY = ['severe', 'critical', 'anaphylaxis', 'life-threatening'];
const MEDIUM_SEVERITY = ['moderate', 'medium'];

function classifySeverity(raw: string | null | undefined): SeverityLevel {
  if (!raw) return 'unknown';
  const v = raw.toLowerCase();
  if (HIGH_SEVERITY.some((s) => v.includes(s))) return 'high';
  if (MEDIUM_SEVERITY.some((s) => v.includes(s))) return 'medium';
  if (v.includes('mild') || v.includes('low')) return 'low';
  return 'unknown';
}

function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function formatDob(dob: string | null | undefined, locale: string): string {
  if (!dob) return '—';
  try {
    return new Date(dob).toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dob;
  }
}

export default function EmergencyIdScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { data: record } = useQuery({
    queryKey: ['medical-record'],
    queryFn: getMyMedicalRecord,
  });

  // Short-lived share token the QR points to — a 24h link to a backend page
  // that renders the full medical ID in the browser (what paramedics see).
  // Refetches every 12h so a code left open overnight doesn't expire mid-use.
  const { data: shareToken } = useQuery({
    queryKey: ['medical-id-share-token'],
    queryFn: createMedicalIdShareToken,
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: 12 * 60 * 60 * 1000,
  });

  const allergies = record?.allergies ?? [];
  const conditions = record?.conditions ?? [];
  const medications = record?.medications ?? [];
  const contacts = record?.emergencyContacts ?? [];

  const age = calcAge(user?.dateOfBirth);
  const gender = user?.gender ?? null;

  const shareUrl = shareToken ? medicalIdShareUrl(shareToken.path) : null;

  const hasCriticalAllergy = allergies.some(
    (a) => classifySeverity(a.severity) === 'high',
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader showBack size="lg">
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="medkit" size={28} color={colors.text.inverse} />
          </View>
          <Text style={styles.heroTitle}>{t('emergencyId.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('emergencyId.subtitle')}</Text>
        </View>
      </GradientHeader>

      <View style={styles.body}>
        {hasCriticalAllergy && (
          <View style={styles.criticalBanner}>
            <Ionicons name="warning" size={18} color={colors.status.error} />
            <Text style={styles.criticalText}>
              {t('emergencyId.criticalAllergyBanner')}
            </Text>
          </View>
        )}

        <Card>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <View style={styles.qrBox}>
              {shareUrl ? (
                <QRCode
                  value={shareUrl}
                  size={200}
                  color={colors.text.primary}
                  backgroundColor={colors.surface.base}
                />
              ) : (
                <View style={styles.qrLoading}>
                  <Text style={styles.qrLoadingText}>
                    {t('common.loading')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.qrHint}>{t('emergencyId.qrHint')}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>{user?.fullName ?? '—'}</Text>
          <Text style={styles.cardSubtitle}>
            {[
              age !== null ? t('emergencyId.ageValue', { age }) : null,
              gender ? t(`emergencyId.gender.${gender.toLowerCase()}`) : null,
              record?.bloodType ? `${record.bloodType} ${t('emergencyId.blood')}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </Text>

          <View style={styles.statsRow}>
            <StatBox
              icon="water"
              tint={colors.status.error}
              label={t('emergencyId.bloodType')}
              value={record?.bloodType ?? '—'}
            />
            <StatBox
              icon="resize"
              tint={colors.brand.primary}
              label={t('emergencyId.height')}
              value={record?.heightCm ? `${record.heightCm} cm` : '—'}
            />
            <StatBox
              icon="barbell"
              tint={colors.brand.primary}
              label={t('emergencyId.weight')}
              value={record?.weightKg ? `${record.weightKg} kg` : '—'}
            />
          </View>

          <View style={styles.divider} />

          <IdRow
            label={t('emergencyId.dob')}
            value={formatDob(user?.dateOfBirth, i18n.language)}
            icon="calendar-outline"
          />
          <Divider />
          <IdRow
            label={t('emergencyId.phone')}
            value={user?.phoneNumber ?? '—'}
            icon="call-outline"
          />
        </Card>

        <AllergySection allergies={allergies} />
        <ConditionSection conditions={conditions} />
        <MedicationSection medications={medications} />

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>{t('emergencyId.contacts')}</Text>
          {contacts.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>{t('emergencyId.noContacts')}</Text>
            </Card>
          ) : (
            contacts.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => Linking.openURL(`tel:${c.phoneNumber}`)}
              >
                <Card>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="call" size={18} color={colors.brand.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{c.name}</Text>
                      <Text style={styles.contactMeta}>
                        {c.relationship} · {c.phoneNumber}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.text.muted}
                    />
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function AllergySection({ allergies }: { allergies: Allergy[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Card>
      <SectionHeader
        icon="alert-circle"
        tint={colors.tint.red}
        title={t('emergencyId.allergies')}
        count={allergies.length}
      />
      {allergies.length === 0 ? (
        <Text style={styles.emptyText}>{t('emergencyId.noAllergies')}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {allergies.map((a) => {
            const sev = classifySeverity(a.severity);
            return (
              <View key={a.id} style={styles.detailItem}>
                <View style={styles.detailHeaderRow}>
                  <Text style={styles.detailTitle}>{a.substance}</Text>
                  {a.severity && <SeverityPill level={sev} label={a.severity} />}
                </View>
                {a.reaction && (
                  <Text style={styles.detailMeta}>
                    {t('emergencyId.reaction')}: {a.reaction}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function ConditionSection({ conditions }: { conditions: Condition[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Card>
      <SectionHeader
        icon="pulse"
        tint={colors.tint.yellow}
        title={t('emergencyId.conditions')}
        count={conditions.length}
      />
      {conditions.length === 0 ? (
        <Text style={styles.emptyText}>{t('emergencyId.noConditions')}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {conditions.map((c) => (
            <View key={c.id} style={styles.detailItem}>
              <View style={styles.detailHeaderRow}>
                <Text style={styles.detailTitle}>{c.name}</Text>
                {c.status && <StatusPill label={c.status} />}
              </View>
              {c.notes && <Text style={styles.detailMeta}>{c.notes}</Text>}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function MedicationSection({ medications }: { medications: Medication[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Card>
      <SectionHeader
        icon="medical"
        tint={colors.tint.teal}
        title={t('emergencyId.medications')}
        count={medications.length}
      />
      {medications.length === 0 ? (
        <Text style={styles.emptyText}>{t('emergencyId.noMedications')}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {medications.map((m) => {
            const parts = [m.dose, m.frequency].filter(Boolean).join(' · ');
            return (
              <View key={m.id} style={styles.detailItem}>
                <Text style={styles.detailTitle}>{m.name}</Text>
                {parts ? (
                  <Text style={styles.detailMeta}>{parts}</Text>
                ) : null}
                {m.notes ? (
                  <Text style={styles.detailMetaSubtle}>{m.notes}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function SectionHeader({
  icon,
  tint,
  title,
  count,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: { bg: string; fg: string };
  title: string;
  count: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.bulletHeader}>
      <View style={[styles.bulletIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={16} color={tint.fg} />
      </View>
      <Text style={styles.bulletTitle}>{title}</Text>
      {count > 0 && (
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function SeverityPill({ level, label }: { level: SeverityLevel; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const style =
    level === 'high'
      ? { bg: 'rgba(239,68,68,0.12)', fg: colors.status.error }
      : level === 'medium'
        ? { bg: 'rgba(234,179,8,0.14)', fg: '#A16207' }
        : level === 'low'
          ? { bg: 'rgba(16,185,129,0.12)', fg: '#047857' }
          : { bg: colors.surface.raised, fg: colors.text.secondary };
  return (
    <View style={[styles.pill, { backgroundColor: style.bg }]}>
      <Text style={[styles.pillText, { color: style.fg }]}>{label}</Text>
    </View>
  );
}

function StatusPill({ label }: { label: string }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface.raised }]}>
      <Text style={[styles.pillText, { color: colors.text.secondary }]}>
        {label}
      </Text>
    </View>
  );
}

function StatBox({
  icon,
  tint,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={16} color={tint} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function IdRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.idRow}>
      <Ionicons name={icon} size={18} color={colors.text.secondary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.idLabel}>{label}</Text>
        <Text style={styles.idValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return <View style={styles.divider} />;
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  heroTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  criticalText: {
    flex: 1,
    color: colors.status.error,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  qrBox: {
    padding: spacing.md,
    backgroundColor: colors.surface.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  qrLoading: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoadingText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  qrHint: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surface.raised,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  idLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  idValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface.border,
    marginVertical: spacing.xs,
  },
  bulletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulletIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletTitle: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  detailItem: {
    paddingVertical: spacing.xs,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailTitle: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  detailMeta: {
    marginTop: 2,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  detailMetaSubtle: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  contactMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
}), [colors]);
}
