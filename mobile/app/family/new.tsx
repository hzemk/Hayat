import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { GradientButton } from '@components/GradientButton';
import { createFamilyMember, Gender } from '@services/api/family.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

const RELATIONSHIPS: { key: string; label: string }[] = [
  { key: 'son', label: 'family.relation.son' },
  { key: 'daughter', label: 'family.relation.daughter' },
  { key: 'child', label: 'family.relation.child' },
];

export default function NewFamilyMemberScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [relationship, setRelationship] = useState<string>('son');
  const [gender, setGender] = useState<Gender>('MALE');
  const [bloodType, setBloodType] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');

  const create = useMutation({
    mutationFn: createFamilyMember,
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
      router.replace(`/family/${member.id}`);
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  function submit() {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('family.errors.nameRequired'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      Alert.alert(t('common.error'), t('family.errors.dobFormat'));
      return;
    }
    const allergies = allergiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const conditions = conditionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    create.mutate({
      fullName: fullName.trim(),
      dateOfBirth,
      gender,
      relationship,
      bloodType: bloodType.trim() || undefined,
      allergies,
      conditions,
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <GradientHeader
          showBack
          subtitle={t('family.subtitle')}
          title={t('family.addChild')}
        />
        <View style={styles.body}>
          <SectionContainer title={t('family.basicInfo')}>
            <Card>
              <View style={{ gap: spacing.md }}>
                <TextField
                  label={t('family.fullName')}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t('family.fullNamePlaceholder')}
                />
                <TextField
                  label={t('family.dateOfBirth')}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />

                <Text style={styles.segmentLabel}>
                  {t('family.relationshipLabel')}
                </Text>
                <View style={styles.segment}>
                  {RELATIONSHIPS.map((r) => {
                    const active = relationship === r.key;
                    return (
                      <Pressable
                        key={r.key}
                        onPress={() => {
                          setRelationship(r.key);
                          if (r.key === 'daughter') setGender('FEMALE');
                          else if (r.key === 'son') setGender('MALE');
                        }}
                        style={[
                          styles.segmentOption,
                          active && styles.segmentOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            active && styles.segmentTextActive,
                          ]}
                        >
                          {t(r.label)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextField
                  label={t('family.bloodTypeLabel')}
                  value={bloodType}
                  onChangeText={setBloodType}
                  placeholder="O+"
                  autoCapitalize="characters"
                />
              </View>
            </Card>
          </SectionContainer>

          <SectionContainer title={t('family.medicalInfo')}>
            <Card>
              <View style={{ gap: spacing.md }}>
                <TextField
                  label={t('family.allergiesInput')}
                  value={allergiesText}
                  onChangeText={setAllergiesText}
                  placeholder={t('family.commaSeparated')}
                />
                <TextField
                  label={t('family.conditionsInput')}
                  value={conditionsText}
                  onChangeText={setConditionsText}
                  placeholder={t('family.commaSeparated')}
                />
              </View>
            </Card>
          </SectionContainer>

          <GradientButton
            label={t('family.saveChild')}
            onPress={submit}
            loading={create.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  segmentLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  segmentOptionActive: {
    backgroundColor: colors.surface.base,
  },
  segmentText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },
  segmentTextActive: {
    color: colors.brand.primary,
  },
}), [colors]);
}
