import { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  PatientCare,
  PatientCarePrescription,
  getPatientCare,
} from '@services/api/hospital-portal.api';
import { InsuranceCardVisual } from '@components/InsuranceCardVisual';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

type Props = {
  visible: boolean;
  doctorId: string | null;
  patientId: string | null;
  patientName?: string | null;
  onClose: () => void;
};

function formatIssued(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-JO' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(
  status: string,
  t: (k: string) => string,
): { text: string; tone: 'active' | 'muted' | 'danger' } {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') {
    return { text: t('hospitalPortal.roster.care.active'), tone: 'active' };
  }
  if (s === 'EXPIRED') {
    return { text: t('hospitalPortal.roster.care.expired'), tone: 'muted' };
  }
  if (s === 'CANCELLED' || s === 'CANCELED') {
    return { text: t('hospitalPortal.roster.care.cancelled'), tone: 'danger' };
  }
  return { text: status, tone: 'muted' };
}

export function PatientCareSheet({
  visible,
  doctorId,
  patientId,
  patientName,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const query = useQuery<PatientCare>({
    queryKey: ['patient-care', doctorId, patientId],
    queryFn: () => getPatientCare(doctorId!, patientId!),
    enabled: visible && !!doctorId && !!patientId,
  });

  const data = query.data;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <LinearGradient
          colors={[...colors.brand.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {patientName ?? data?.patient.fullName ?? data?.patient.email ?? t('hospitalPortal.roster.care.title')}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {t('hospitalPortal.roster.care.subtitle')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </LinearGradient>

        {query.isLoading || !data ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {data.latestSymptom ? (
              <Section
                icon="pulse"
                tint={colors.tint.yellow}
                title={t('hospitalPortal.roster.care.symptoms')}
              >
                <Text style={styles.freeText}>{data.latestSymptom.body}</Text>
                <Text style={styles.caption}>
                  {formatIssued(data.latestSymptom.createdAt, i18n.language)}
                </Text>
              </Section>
            ) : null}

            <Section
              icon="card"
              tint={colors.tint.blue}
              title={t('hospitalPortal.roster.care.insurance')}
            >
              {data.insuranceCard ? (
                <InsuranceCardVisual card={data.insuranceCard} compact />
              ) : (
                <Text style={styles.emptyText}>
                  {t('hospitalPortal.roster.care.noInsurance')}
                </Text>
              )}
            </Section>

            <Section
              icon="medical"
              tint={colors.tint.red}
              title={t('hospitalPortal.roster.care.conditions')}
            >
              {data.conditions.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('hospitalPortal.roster.care.noConditions')}
                </Text>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {data.conditions.map((c) => (
                    <View key={c.id} style={styles.itemRow}>
                      <View style={styles.itemBullet} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.itemHeaderRow}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{c.status}</Text>
                          </View>
                        </View>
                        {c.notes ? (
                          <Text style={styles.itemMeta}>{c.notes}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Section>

            <Section
              icon="alert-circle"
              tint={colors.tint.rose}
              title={t('hospitalPortal.roster.care.allergies')}
            >
              {data.allergies.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('hospitalPortal.roster.care.noAllergies')}
                </Text>
              ) : (
                <View style={styles.chipsWrap}>
                  {data.allergies.map((a) => (
                    <View key={a.id} style={styles.allergyChip}>
                      <Text style={styles.allergyChipText}>
                        {a.substance}
                        {a.severity ? ` · ${a.severity}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Section>

            <Section
              icon="medkit"
              tint={colors.tint.teal}
              title={t('hospitalPortal.roster.care.medications')}
            >
              {data.medications.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('hospitalPortal.roster.care.noMedications')}
                </Text>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {data.medications.map((m) => (
                    <View key={m.id} style={styles.itemRow}>
                      <View style={styles.itemBullet} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{m.name}</Text>
                        {[m.dose, m.frequency].filter(Boolean).length > 0 ? (
                          <Text style={styles.itemMeta}>
                            {[m.dose, m.frequency].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Section>

            <Section
              icon="document-text"
              tint={colors.tint.purple}
              title={t('hospitalPortal.roster.care.prescriptions')}
            >
              {data.prescriptions.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('hospitalPortal.roster.care.noPrescriptions')}
                </Text>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {data.prescriptions.map((rx) => (
                    <PrescriptionCard key={rx.id} rx={rx} isAr={isAr} />
                  ))}
                </View>
              )}
            </Section>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function Section({
  icon,
  tint,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: { bg: string; fg: string };
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: tint.bg }]}>
          <Ionicons name={icon} size={14} color={tint.fg} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function PrescriptionCard({
  rx,
  isAr,
}: {
  rx: PatientCarePrescription;
  isAr: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const status = statusLabel(rx.status, t);
  const toneBg =
    status.tone === 'active'
      ? colors.tint.green.bg
      : status.tone === 'danger'
        ? colors.tint.red.bg
        : colors.surface.sunken;
  const toneFg =
    status.tone === 'active'
      ? colors.tint.green.fg
      : status.tone === 'danger'
        ? colors.tint.red.fg
        : colors.text.secondary;

  return (
    <View style={styles.rxCard}>
      <View style={styles.rxHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rxKicker}>
            {t('hospitalPortal.roster.care.issued', {
              when: formatIssued(rx.issuedAt, i18n.language),
            })}
          </Text>
          <Text style={styles.rxTitle}>
            {t('hospitalPortal.roster.care.items', { count: rx.items.length })}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: toneBg }]}>
          <Text style={[styles.statusPillText, { color: toneFg }]}>
            {status.text}
          </Text>
        </View>
      </View>
      {rx.notes ? (
        <Text style={styles.rxNotes} numberOfLines={3}>
          {rx.notes}
        </Text>
      ) : null}
      <View style={styles.rxItems}>
        {rx.items.map((item, idx) => {
          const instructions = isAr
            ? item.instructionsAr || item.instructionsEn
            : item.instructionsEn || item.instructionsAr;
          return (
            <View
              key={item.id}
              style={[
                styles.rxItem,
                idx !== rx.items.length - 1 && styles.rxItemDivider,
              ]}
            >
              <View style={styles.rxPillBullet}>
                <Ionicons
                  name="ellipse"
                  size={6}
                  color={colors.brand.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rxItemName}>{item.medicationName}</Text>
                <Text style={styles.rxItemMeta}>
                  {[item.dose, item.frequency].filter(Boolean).join(' · ')}
                  {item.durationDays
                    ? ` · ${t('hospitalPortal.roster.care.days', {
                        count: item.durationDays,
                      })}`
                    : ''}
                </Text>
                {instructions ? (
                  <Text style={styles.rxItemInstructions}>{instructions}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.5)',
        },
        sheet: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '92%',
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          backgroundColor: colors.surface.raised,
          overflow: 'hidden',
          ...shadow.raised,
        },
        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
        },
        grabber: {
          alignSelf: 'center',
          width: 42,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.55)',
          marginBottom: spacing.md,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        title: {
          fontSize: typography.size.lg,
          fontWeight: typography.weight.bold,
          color: '#FFFFFF',
        },
        subtitle: {
          fontSize: typography.size.xs,
          color: 'rgba(255,255,255,0.85)',
          marginTop: 2,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        loading: {
          padding: spacing.xxl,
          alignItems: 'center',
        },
        body: {
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        section: {
          gap: spacing.sm,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        sectionIcon: {
          width: 26,
          height: 26,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sectionTitle: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        sectionBody: {
          backgroundColor: colors.surface.base,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.surface.border,
        },
        emptyText: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
        },
        freeText: {
          color: colors.text.primary,
          fontSize: typography.size.sm,
          lineHeight: 20,
        },
        caption: {
          color: colors.text.muted,
          fontSize: 11,
          marginTop: spacing.xs,
        },
        itemRow: {
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'flex-start',
        },
        itemBullet: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.brand.primary,
          marginTop: 8,
        },
        itemHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        itemTitle: {
          flex: 1,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
        },
        itemMeta: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: 2,
        },
        badge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: radius.pill,
          backgroundColor: colors.tint.gray.bg,
        },
        badgeText: {
          fontSize: 10,
          fontWeight: typography.weight.bold,
          color: colors.tint.gray.fg,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        chipsWrap: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
        },
        allergyChip: {
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: 6,
          borderRadius: radius.pill,
          backgroundColor: colors.tint.rose.bg,
        },
        allergyChipText: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          color: colors.tint.rose.fg,
        },
        rxCard: {
          backgroundColor: colors.surface.raised,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.surface.border,
        },
        rxHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        rxKicker: {
          fontSize: 10,
          fontWeight: typography.weight.bold,
          color: colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        rxTitle: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
          marginTop: 2,
        },
        rxNotes: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          fontStyle: 'italic',
        },
        statusPill: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.pill,
        },
        statusPillText: {
          fontSize: 10,
          fontWeight: typography.weight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        rxItems: {
          gap: 0,
        },
        rxItem: {
          flexDirection: 'row',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          alignItems: 'flex-start',
        },
        rxItemDivider: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.surface.border,
        },
        rxPillBullet: {
          width: 16,
          height: 16,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.tint.teal.bg,
          marginTop: 2,
        },
        rxItemName: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        rxItemMeta: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: 2,
        },
        rxItemInstructions: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          marginTop: 2,
          fontStyle: 'italic',
        },
      }),
    [colors],
  );
}
