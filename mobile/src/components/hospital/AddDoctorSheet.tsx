import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TextField } from '@components/TextField';
import { Button } from '@components/Button';
import {
  createHospitalDoctor,
  CreateHospitalDoctorPayload,
  listHospitalDepartments,
} from '@services/api/hospital-portal.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const DOCTOR_EMAIL = /^dr\.[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function AddDoctorSheet({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const departmentsQuery = useQuery({
    queryKey: ['hospital-departments'],
    queryFn: listHospitalDepartments,
    enabled: visible,
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [specialtyAr, setSpecialtyAr] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!visible) {
      setFullName('');
      setEmail('');
      setPhone('');
      setLicenseNumber('');
      setSpecialty('');
      setSpecialtyAr('');
      setYearsExperience('');
      setDepartmentId(null);
      setPassword('');
    }
  }, [visible]);

  const create = useMutation({
    mutationFn: (payload: CreateHospitalDoctorPayload) =>
      createHospitalDoctor(payload),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['hospital-doctors'] });
      qc.invalidateQueries({ queryKey: ['hospital-stats'] });
      qc.invalidateQueries({ queryKey: ['hospital-departments'] });
      const name = created.fullName ?? created.email;
      const body = created.tempPassword
        ? t('hospitalPortal.doctors.add.createdBody', {
            name,
            email: created.email,
            password: created.tempPassword,
          })
        : t('hospitalPortal.doctors.add.createdBodyNoPassword', { name });
      Alert.alert(t('hospitalPortal.doctors.add.createdTitle'), body);
      onClose();
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  function onSubmit() {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanLicense = licenseNumber.trim();
    const cleanSpecialty = specialty.trim();

    if (cleanName.length < 2) {
      Alert.alert(
        t('common.error'),
        t('hospitalPortal.doctors.add.errors.nameRequired'),
      );
      return;
    }
    if (!DOCTOR_EMAIL.test(cleanEmail)) {
      Alert.alert(
        t('common.error'),
        t('hospitalPortal.doctors.add.errors.emailFormat'),
      );
      return;
    }
    if (cleanLicense.length < 2) {
      Alert.alert(
        t('common.error'),
        t('hospitalPortal.doctors.add.errors.licenseRequired'),
      );
      return;
    }
    if (cleanSpecialty.length < 2) {
      Alert.alert(
        t('common.error'),
        t('hospitalPortal.doctors.add.errors.specialtyRequired'),
      );
      return;
    }

    const yrs = parseInt(yearsExperience, 10);
    create.mutate({
      fullName: cleanName,
      email: cleanEmail,
      licenseNumber: cleanLicense,
      specialty: cleanSpecialty,
      specialtyAr: specialtyAr.trim() || undefined,
      phoneNumber: phone.trim() || undefined,
      yearsExperience: Number.isFinite(yrs) && yrs > 0 ? yrs : undefined,
      departmentId: departmentId ?? undefined,
      password: password.trim().length >= 8 ? password.trim() : undefined,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {t('hospitalPortal.doctors.add.title')}
              </Text>
              <Text style={styles.subtitle}>
                {t('hospitalPortal.doctors.add.subtitle')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 520 }}
            contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}
            keyboardShouldPersistTaps="handled"
          >
            <TextField
              label={t('hospitalPortal.doctors.add.fullName')}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <TextField
              label={t('hospitalPortal.doctors.add.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="dr.name@hayat.jo"
            />
            <Text style={styles.hint}>
              {t('hospitalPortal.doctors.add.emailHint')}
            </Text>
            <TextField
              label={t('hospitalPortal.doctors.add.license')}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder={t(
                'hospitalPortal.doctors.add.licensePlaceholder',
              )}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextField
              label={t('hospitalPortal.doctors.add.specialty')}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="Cardiology"
            />
            <TextField
              label={t('hospitalPortal.doctors.add.specialtyAr')}
              value={specialtyAr}
              onChangeText={setSpecialtyAr}
              placeholder="أمراض القلب"
            />
            <TextField
              label={t('hospitalPortal.doctors.add.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+9627XXXXXXXX"
            />
            <TextField
              label={t('hospitalPortal.doctors.add.yearsExperience')}
              value={yearsExperience}
              onChangeText={setYearsExperience}
              keyboardType="number-pad"
              placeholder="5"
            />
            <TextField
              label={t('hospitalPortal.doctors.add.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            <Text style={styles.hint}>
              {t('hospitalPortal.doctors.add.passwordHint')}
            </Text>

            <Text style={styles.sectionLabel}>
              {t('hospitalPortal.doctors.add.department')}
            </Text>
            <View style={styles.deptRow}>
              <DeptChip
                label={t('hospitalPortal.doctors.add.noDepartment')}
                active={departmentId === null}
                onPress={() => setDepartmentId(null)}
              />
              {(departmentsQuery.data ?? []).map((d) => (
                <DeptChip
                  key={d.id}
                  label={isAr ? d.nameAr : d.nameEn}
                  active={departmentId === d.id}
                  onPress={() => setDepartmentId(d.id)}
                />
              ))}
            </View>
          </ScrollView>

          <Button
            label={t('hospitalPortal.doctors.add.submit')}
            onPress={onSubmit}
            loading={create.isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DeptChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: colors.brand.primary,
          borderColor: colors.brand.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          active && { color: '#fff' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.4)',
        },
        kbWrap: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.surface.base,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          padding: spacing.xl,
          paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
          gap: spacing.md,
          ...shadow.raised,
        },
        handle: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.surface.border,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
        },
        title: {
          fontSize: typography.size.lg,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        subtitle: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          marginTop: 2,
        },
        hint: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          marginTop: -spacing.xs,
        },
        sectionLabel: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          color: colors.text.secondary,
          marginTop: spacing.sm,
        },
        deptRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
        },
        chip: {
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.surface.border,
          backgroundColor: colors.surface.raised,
        },
        chipText: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          fontWeight: typography.weight.medium,
        },
      }),
    [colors],
  );
}
