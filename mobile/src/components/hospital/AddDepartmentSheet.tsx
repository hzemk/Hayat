import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TextField } from '@components/TextField';
import { Button } from '@components/Button';
import {
  CreateDepartmentPayload,
  createHospitalDepartment,
} from '@services/api/hospital-portal.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddDepartmentSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [code, setCode] = useState('');
  const { colors } = useTheme();
  const styles = useStyles(colors);

  useEffect(() => {
    if (!visible) {
      setNameEn('');
      setNameAr('');
      setCode('');
    }
  }, [visible]);

  const create = useMutation({
    mutationFn: (payload: CreateDepartmentPayload) =>
      createHospitalDepartment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital-departments'] });
      qc.invalidateQueries({ queryKey: ['hospital-stats'] });
      onClose();
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  function onSubmit() {
    const en = nameEn.trim();
    const ar = nameAr.trim();
    if (en.length < 2 || ar.length < 2) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }
    create.mutate({
      nameEn: en,
      nameAr: ar,
      code: code.trim() || undefined,
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
                {t('hospitalPortal.departments.add.title')}
              </Text>
              <Text style={styles.subtitle}>
                {t('hospitalPortal.departments.add.subtitle')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          <TextField
            label={t('hospitalPortal.departments.add.nameEn')}
            value={nameEn}
            onChangeText={setNameEn}
            placeholder="Cardiology"
          />
          <TextField
            label={t('hospitalPortal.departments.add.nameAr')}
            value={nameAr}
            onChangeText={setNameAr}
            placeholder="أمراض القلب"
          />
          <TextField
            label={t('hospitalPortal.departments.add.code')}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="CARDIO"
          />
          <Text style={styles.hint}>
            {t('hospitalPortal.departments.add.codeHint')}
          </Text>

          <Button
            label={t('hospitalPortal.departments.add.submit')}
            onPress={onSubmit}
            loading={create.isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.scrim.base,
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
      }),
    [colors],
  );
}
