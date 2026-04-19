import { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { ListItem } from '@components/ListItem';
import { StatCard } from '@components/StatCard';
import { InfoChip } from '@components/InfoChip';
import { Card } from '@components/Card';
import {
  getMyMedicalRecord,
  Allergy,
  Condition,
  EmergencyContact,
  Medication,
  MedicalRecord,
} from '@services/api/medicalRecord.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

const PREVIEW_RECORD: MedicalRecord = {
  id: 'preview',
  bloodType: 'O+',
  heightCm: 176,
  weightKg: 82,
  conditions: [
    {
      id: 'p-c1',
      name: 'Type 2 Diabetes',
      status: 'active',
      notes: 'Diagnosed 2020 · diet-controlled',
      diagnosedAt: null,
    },
    {
      id: 'p-c2',
      name: 'Hypertension',
      status: 'active',
      notes: 'Stable on medication',
      diagnosedAt: null,
    },
  ],
  medications: [
    {
      id: 'p-m1',
      name: 'Metformin',
      dose: '500 mg',
      frequency: 'Twice daily',
      notes: null,
    },
    {
      id: 'p-m2',
      name: 'Lisinopril',
      dose: '10 mg',
      frequency: 'Once daily',
      notes: null,
    },
  ],
  allergies: [],
  emergencyContacts: [
    {
      id: 'p-e1',
      name: 'Sara Al-Ali',
      relationship: 'Spouse',
      phoneNumber: '+962797654321',
    },
  ],
};

type Filter = 'all' | 'conditions' | 'medications' | 'allergies' | 'contacts';

export default function RecordsScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['medical-record'],
    queryFn: getMyMedicalRecord,
  });

  const data = useMemo(() => {
    if (!apiData) return apiData;
    const isEmpty =
      apiData.conditions.length === 0 &&
      apiData.medications.length === 0 &&
      apiData.allergies.length === 0 &&
      apiData.emergencyContacts.length === 0;
    return isEmpty
      ? { ...PREVIEW_RECORD, id: apiData.id, bloodType: apiData.bloodType ?? PREVIEW_RECORD.bloodType, heightCm: apiData.heightCm ?? PREVIEW_RECORD.heightCm, weightKg: apiData.weightKg ?? PREVIEW_RECORD.weightKg }
      : apiData;
  }, [apiData]);

  const q = search.trim().toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);

  const conditions = useMemo<Condition[]>(
    () => (data?.conditions ?? []).filter((c) => match(c.name)),
    [data, q],
  );
  const medications = useMemo<Medication[]>(
    () =>
      (data?.medications ?? []).filter(
        (m) => match(m.name) || match(m.dose ?? '') || match(m.frequency ?? ''),
      ),
    [data, q],
  );
  const allergies = useMemo<Allergy[]>(
    () =>
      (data?.allergies ?? []).filter(
        (a) => match(a.substance) || match(a.reaction ?? ''),
      ),
    [data, q],
  );
  const contacts = useMemo<EmergencyContact[]>(
    () =>
      (data?.emergencyContacts ?? []).filter(
        (c) => match(c.name) || match(c.relationship),
      ),
    [data, q],
  );

  const showSection = (key: Filter) => filter === 'all' || filter === key;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('records.filterAll') },
    { key: 'conditions', label: t('records.filterConditions') },
    { key: 'medications', label: t('records.filterMedications') },
    { key: 'allergies', label: t('records.filterAllergies') },
    { key: 'contacts', label: t('records.filterContacts') },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <GradientHeader title={t('records.title')}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('records.searchPlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.text.muted}
              />
            </Pressable>
          ) : null}
        </View>
      </GradientHeader>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                active && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.body}>
        {isLoading || !data ? (
          <Card>
            <Text style={{ color: colors.text.muted }}>
              {t('common.loading')}
            </Text>
          </Card>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard
                label={t('records.bloodType')}
                value={data.bloodType ?? '—'}
                icon="water"
                tint="red"
              />
              <StatCard
                label={t('records.height')}
                value={data.heightCm ? `${data.heightCm} cm` : '—'}
                icon="resize"
                tint="blue"
              />
              <StatCard
                label={t('records.weight')}
                value={data.weightKg ? `${data.weightKg} kg` : '—'}
                icon="barbell"
                tint="green"
              />
            </View>

            {showSection('conditions') ? (
              <SectionContainer title={t('records.conditions')}>
                {conditions.length === 0 ? (
                  <EmptyRow label={t('records.empty')} icon="fitness-outline" />
                ) : (
                  conditions.map((c) => (
                    <ListItem
                      key={c.id}
                      icon="fitness"
                      tint="yellow"
                      title={c.name}
                      subtitle={c.notes ?? undefined}
                      trailing={
                        <InfoChip
                          label={c.status}
                          tint={c.status === 'active' ? 'green' : 'gray'}
                          size="sm"
                        />
                      }
                    />
                  ))
                )}
              </SectionContainer>
            ) : null}

            {showSection('medications') ? (
              <SectionContainer title={t('records.medications')}>
                {medications.length === 0 ? (
                  <EmptyRow label={t('records.empty')} icon="medical-outline" />
                ) : (
                  medications.map((m) => (
                    <ListItem
                      key={m.id}
                      icon="medical"
                      tint="teal"
                      title={m.name}
                      subtitle={[m.dose, m.frequency]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  ))
                )}
              </SectionContainer>
            ) : null}

            {showSection('allergies') ? (
              <SectionContainer title={t('records.allergies')}>
                {allergies.length === 0 ? (
                  <EmptyRow
                    label={t('records.noAllergies')}
                    icon="happy-outline"
                  />
                ) : (
                  allergies.map((a) => (
                    <ListItem
                      key={a.id}
                      icon="alert-circle"
                      tint="red"
                      title={a.substance}
                      subtitle={a.reaction ?? undefined}
                      trailing={
                        a.severity ? (
                          <InfoChip
                            label={a.severity}
                            tint={a.severity === 'severe' ? 'red' : 'yellow'}
                            size="sm"
                          />
                        ) : undefined
                      }
                    />
                  ))
                )}
              </SectionContainer>
            ) : null}

            {showSection('contacts') ? (
              <SectionContainer title={t('records.emergencyContacts')}>
                {contacts.length === 0 ? (
                  <EmptyRow
                    label={t('records.empty')}
                    icon="people-outline"
                  />
                ) : (
                  contacts.map((c) => (
                    <ListItem
                      key={c.id}
                      icon="call"
                      tint="red"
                      title={c.name}
                      subtitle={`${c.relationship} · ${c.phoneNumber}`}
                      chevron
                      onPress={() => Linking.openURL(`tel:${c.phoneNumber}`)}
                    />
                  ))
                )}
              </SectionContainer>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function EmptyRow({
  label,
  icon,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={22} color={colors.text.muted} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
      searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.base,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        height: 44,
        ...shadow.soft,
      },
      searchInput: {
        flex: 1,
        fontSize: typography.size.md,
        color: colors.text.primary,
        paddingVertical: 0,
      },
      filterRow: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.xs,
      },
      filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: colors.surface.base,
        borderWidth: 1,
        borderColor: colors.surface.border,
        marginRight: spacing.xs,
      },
      filterChipActive: {
        backgroundColor: colors.brand.primary,
        borderColor: colors.brand.primary,
      },
      filterChipText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
      },
      filterChipTextActive: {
        color: colors.text.inverse,
      },
      body: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        gap: spacing.xl,
      },
      statsRow: { flexDirection: 'row', gap: spacing.sm },
      emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        gap: spacing.xs,
      },
      emptyText: {
        color: colors.text.muted,
        fontSize: typography.size.sm,
        textAlign: 'center',
      },
    }), [colors]);
}
