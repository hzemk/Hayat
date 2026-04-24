import { useMemo } from 'react';
import {
  ActivityIndicator,
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
import { InfoChip } from '@components/InfoChip';
import { FamilyMember, listFamilyMembers } from '@services/api/family.api';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

function ageFrom(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(age, 0);
}

function relationshipIcon(relationship: string): keyof typeof Ionicons.glyphMap {
  switch (relationship.toLowerCase()) {
    case 'daughter':
    case 'girl':
      return 'happy';
    case 'son':
    case 'boy':
      return 'happy-outline';
    default:
      return 'person';
  }
}

export default function FamilyListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { data, isLoading } = useQuery({
    queryKey: ['family-members'],
    queryFn: listFamilyMembers,
  });
  const members = data ?? [];
  const urgent = members.filter((m) => m.needsUrgentCare);
  const regular = members.filter((m) => !m.needsUrgentCare);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface.raised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <GradientHeader
        showBack
        subtitle={t('family.subtitle')}
        title={t('family.title')}
      />

      <View style={styles.body}>
        {urgent.length > 0 ? (
          <SectionContainer title={t('family.urgentSection')}>
            {urgent.map((m) => (
              <MemberRow key={m.id} member={m} urgent />
            ))}
          </SectionContainer>
        ) : null}

        <SectionContainer title={t('family.childrenSection')}>
          {regular.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </SectionContainer>
      </View>
    </ScrollView>
  );
}

function MemberRow({
  member,
  urgent,
}: {
  member: FamilyMember;
  urgent?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const age = ageFrom(member.dateOfBirth);
  const medCount = member.medications.length;
  const icon = relationshipIcon(member.relationship);

  return (
    <Pressable
      onPress={() => router.push(`/family/${member.id}`)}
      style={({ pressed }) => [
        styles.memberCard,
        urgent && styles.memberCardUrgent,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View
        style={[
          styles.avatar,
          urgent ? styles.avatarUrgent : styles.avatarNormal,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={urgent ? colors.status.error : colors.brand.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.fullName}
          </Text>
          {urgent ? (
            <InfoChip label={t('family.urgent')} tint="red" size="sm" />
          ) : null}
        </View>
        <Text style={styles.memberMeta} numberOfLines={1}>
          {t('family.yearsOld', { age })} ·{' '}
          {t(`family.relation.${member.relationship}`, {
            defaultValue: member.relationship,
          })}
          {medCount > 0
            ? ` · ${t('family.medicationCount', { count: medCount })}`
            : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
    </Pressable>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.base,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.soft,
  },
  memberCardUrgent: {
    borderWidth: 1,
    borderColor: colors.tint.red.fg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarNormal: {
    backgroundColor: colors.tint.teal.bg,
  },
  avatarUrgent: {
    backgroundColor: colors.tint.red.bg,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: {
    flexShrink: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  memberMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
}), [colors]);
}
