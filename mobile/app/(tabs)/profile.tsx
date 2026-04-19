import { useMemo } from 'react';
import {
  Alert,
  I18nManager,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { useAuthStore } from '@stores/auth';
import { updateMe } from '@services/api/users.api';
import {
  getMyMedicalRecord,
  type Allergy,
  type Condition,
  type Medication,
  type EmergencyContact,
} from '@services/api/medicalRecord.api';
import { applyRtl, Locale } from '@i18n/index';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme();
  const styles = useStyles(colors);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const { data: record } = useQuery({
    queryKey: ['medical-record'],
    queryFn: getMyMedicalRecord,
  });

  async function onLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  async function setLanguage(next: Locale) {
    if (!user || i18n.language === next) return;
    const directionWillFlip = (next === 'ar') !== I18nManager.isRTL;
    await i18n.changeLanguage(next);
    await applyRtl(next);
    try {
      await updateMe({ preferredLocale: next });
      setUser({ ...user, preferredLocale: next });
    } catch {
      // non-fatal
    }
    if (directionWillFlip) {
      Alert.alert(
        t('profile.languageChanged'),
        t('profile.restartForRtl'),
        [{ text: t('common.done') }],
      );
    }
  }

  const initials = (user?.fullName ?? user?.email ?? '')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const conditions = record?.conditions ?? [];
  const allergies = record?.allergies ?? [];
  const medications = record?.medications ?? [];
  const contacts = record?.emergencyContacts ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <GradientHeader size="lg">
        <View style={styles.heroBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'H'}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName ?? '—'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.authProvider === 'SANAD' ? (
            <View style={styles.sanadPill}>
              <Text style={styles.sanadPillText}>
                سند · {t('profile.linkedWithSanad')}
              </Text>
            </View>
          ) : null}
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <SectionContainer title={t('profile.healthSummary')}>
          <Card>
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
          </Card>
        </SectionContainer>

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
              {allergies.map((a) => (
                <AllergyRow key={a.id} allergy={a} />
              ))}
            </View>
          )}
        </Card>

        <Card>
          <SectionHeader
            icon="pulse"
            tint={colors.tint.yellow}
            title={t('emergencyId.conditions')}
            count={conditions.length}
          />
          {conditions.length === 0 ? (
            <Text style={styles.emptyText}>
              {t('emergencyId.noConditions')}
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {conditions.map((c) => (
                <ConditionRow key={c.id} condition={c} />
              ))}
            </View>
          )}
        </Card>

        <Card>
          <SectionHeader
            icon="medical"
            tint={colors.tint.teal}
            title={t('emergencyId.medications')}
            count={medications.length}
          />
          {medications.length === 0 ? (
            <Text style={styles.emptyText}>
              {t('emergencyId.noMedications')}
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {medications.map((m) => (
                <MedicationRow key={m.id} medication={m} />
              ))}
            </View>
          )}
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>{t('emergencyId.contacts')}</Text>
          {contacts.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
                {t('emergencyId.noContacts')}
              </Text>
            </Card>
          ) : (
            contacts.map((c) => <ContactCard key={c.id} contact={c} />)
          )}
        </View>

        <ListItem
          icon="medkit"
          tint="red"
          title={t('profile.openEmergencyId')}
          chevron
          onPress={() => router.push('/emergency-id')}
        />

        <SectionContainer title={t('profile.personalInfo')}>
          <Card>
            <View style={{ gap: spacing.md }}>
              <InfoRow
                icon="mail"
                label={t('auth.email')}
                value={user?.email ?? '—'}
              />
              <InfoRow
                icon="call"
                label={t('auth.phoneNumber')}
                value={user?.phoneNumber ?? '—'}
              />
              <InfoRow
                icon="person"
                label={t('auth.fullName')}
                value={user?.fullName ?? '—'}
              />
              <InfoRow
                icon="male-female"
                label={t('emergencyId.genderLabel')}
                value={
                  user?.gender === 'MALE'
                    ? t('emergencyId.gender.male')
                    : user?.gender === 'FEMALE'
                      ? t('emergencyId.gender.female')
                      : '—'
                }
              />
              <InfoRow
                icon="calendar"
                label={t('emergencyId.dob')}
                value={user?.dateOfBirth ?? '—'}
              />
            </View>
          </Card>
        </SectionContainer>

        <SectionContainer title={t('profile.preferences')}>
          <Card>
            <View style={styles.langHeader}>
              <View style={styles.langIcon}>
                <Ionicons
                  name="language"
                  size={16}
                  color={colors.brand.primary}
                />
              </View>
              <Text style={styles.langTitle}>{t('profile.language')}</Text>
            </View>
            <View style={styles.langSegment}>
              {(['ar', 'en'] as const).map((code) => {
                const active = i18n.language === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setLanguage(code)}
                    style={[
                      styles.langOption,
                      active && styles.langOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        active && styles.langOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {code === 'ar' ? 'العربية' : 'English'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card>
            <View style={styles.langHeader}>
              <View style={styles.langIcon}>
                <Ionicons
                  name={themeMode === 'dark' ? 'moon' : 'sunny'}
                  size={16}
                  color={colors.brand.primary}
                />
              </View>
              <Text style={styles.langTitle}>{t('profile.appearance')}</Text>
            </View>
            <View style={styles.langSegment}>
              {(['light', 'dark'] as const).map((m) => {
                const active = themeMode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setThemeMode(m)}
                    style={[
                      styles.langOption,
                      active && styles.langOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        active && styles.langOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {m === 'light' ? t('profile.lightMode') : t('profile.darkMode')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <ListItem
            icon="log-out"
            tint="red"
            title={t('profile.signOut')}
            danger
            chevron
            onPress={onLogout}
          />
        </SectionContainer>
      </View>
    </ScrollView>
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

function AllergyRow({ allergy }: { allergy: Allergy }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailHeaderRow}>
        <Text style={styles.detailTitle}>{allergy.substance}</Text>
        {allergy.severity ? (
          <View style={[styles.pill, { backgroundColor: colors.tint.red.bg }]}>
            <Text style={[styles.pillText, { color: colors.tint.red.fg }]}>
              {allergy.severity}
            </Text>
          </View>
        ) : null}
      </View>
      {allergy.reaction ? (
        <Text style={styles.detailMeta}>
          {t('emergencyId.reaction')}: {allergy.reaction}
        </Text>
      ) : null}
    </View>
  );
}

function ConditionRow({ condition }: { condition: Condition }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailHeaderRow}>
        <Text style={styles.detailTitle}>{condition.name}</Text>
        {condition.status ? (
          <View
            style={[styles.pill, { backgroundColor: colors.surface.raised }]}
          >
            <Text style={[styles.pillText, { color: colors.text.secondary }]}>
              {condition.status}
            </Text>
          </View>
        ) : null}
      </View>
      {condition.notes ? (
        <Text style={styles.detailMeta}>{condition.notes}</Text>
      ) : null}
    </View>
  );
}

function MedicationRow({ medication }: { medication: Medication }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const parts = [medication.dose, medication.frequency].filter(Boolean).join(' · ');
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailTitle}>{medication.name}</Text>
      {parts ? <Text style={styles.detailMeta}>{parts}</Text> : null}
      {medication.notes ? (
        <Text style={styles.detailMetaSubtle}>{medication.notes}</Text>
      ) : null}
    </View>
  );
}

function ContactCard({ contact }: { contact: EmergencyContact }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Pressable onPress={() => Linking.openURL(`tel:${contact.phoneNumber}`)}>
      <Card>
        <View style={styles.contactRow}>
          <View style={styles.contactIcon}>
            <Ionicons name="call" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactMeta}>
              {contact.relationship} · {contact.phoneNumber}
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
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
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
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
  email: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.sm,
  },
  sanadPill: {
    marginTop: spacing.sm,
    backgroundColor: '#000',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  sanadPillText: {
    color: '#fff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  infoValue: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  langIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  langSegment: {
    flexDirection: 'row',
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  langOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  langOptionActive: {
    backgroundColor: colors.surface.base,
    ...shadow.soft,
  },
  langOptionText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },
  langOptionTextActive: {
    color: colors.brand.primary,
  },
}), [colors]);
}
