import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
  listDoctorPatients,
  DoctorPatientRow,
} from '@services/api/doctor-portal.api';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

export default function DoctorPatientsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['doctor-patients'],
    queryFn: listDoctorPatients,
  });
  const patients = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('doctorPortal.patients.title')}
        subtitle={t('doctorPortal.patients.subtitle')}
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name="people-outline"
            size={40}
            color={colors.text.muted}
          />
          <Text style={styles.emptyTitle}>
            {t('doctorPortal.patients.emptyTitle')}
          </Text>
          <Text style={styles.emptyBody}>
            {t('doctorPortal.patients.emptyBody')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(i) => i.threadId}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() =>
                queryClient.invalidateQueries({
                  queryKey: ['doctor-patients'],
                })
              }
            />
          }
          renderItem={({ item }) => <Row row={item} />}
        />
      )}
    </View>
  );
}

function Row({ row }: { row: DoctorPatientRow }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { patient } = row;
  const age = calcAge(patient.dateOfBirth);
  const genderLabel = patient.gender
    ? t(`doctorPortal.patients.gender.${patient.gender.toLowerCase()}`)
    : '';
  const meta = [
    age != null ? t('doctorPortal.patients.ageValue', { age }) : null,
    genderLabel || null,
    patient.phoneNumber,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card padding="md" style={{ gap: spacing.sm }}>
      <Pressable
        onPress={() => router.push(`/(doctor)/chat/${patient.id}`)}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(patient.fullName || 'P').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {patient.fullName}
            </Text>
            {meta ? (
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
          {row.unread > 0 ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{row.unread}</Text>
            </View>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.text.muted}
            />
          )}
        </View>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => router.push(`/(doctor)/chat/${patient.id}`)}
          style={({ pressed }) => [
            styles.action,
            styles.actionGhost,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={16}
            color={colors.brand.primary}
          />
          <Text style={styles.actionGhostText}>
            {t('doctorPortal.patient.chat')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(doctor)/rx/${patient.id}`)}
          style={({ pressed }) => [
            styles.action,
            styles.actionPrimary,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="medical" size={16} color={colors.brand.on} />
          <Text style={styles.actionPrimaryText}>
            {t('doctorPortal.patient.issueRx')}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
  return years >= 0 ? years : null;
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
  list: { padding: spacing.lg },
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
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 40,
    borderRadius: radius.lg,
  },
  actionGhost: {
    backgroundColor: colors.tint.teal.bg,
  },
  actionGhostText: {
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
  },
  actionPrimary: {
    backgroundColor: colors.brand.primary,
  },
  actionPrimaryText: {
    color: colors.brand.on,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.sm,
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
