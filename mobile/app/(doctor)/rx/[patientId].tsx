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
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { GradientButton } from '@components/GradientButton';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import {
  getDoctorPatient,
  issuePrescription,
  IssueRxItem,
} from '@services/api/doctor-portal.api';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

interface FormItem {
  medicationName: string;
  dose: string;
  frequency: string;
  durationDays: string;
  instructionsAr: string;
  instructionsEn: string;
}

function emptyItem(): FormItem {
  return {
    medicationName: '',
    dose: '',
    frequency: '',
    durationDays: '',
    instructionsAr: '',
    instructionsEn: '',
  };
}

export default function IssueRxScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const queryClient = useQueryClient();
  const patientQuery = useQuery({
    queryKey: ['doctor-patient', patientId],
    queryFn: () => getDoctorPatient(patientId!),
    enabled: !!patientId,
  });

  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: issuePrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-issued'] });
      queryClient.invalidateQueries({
        queryKey: ['doctor-thread', patientId],
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-threads'] });

      const goToChat = () => {
        if (!patientId) return;
        // Defer so Alert finishes dismissing before navigation swaps the tab;
        // on iOS, navigating during Alert dismissal can no-op silently.
        setTimeout(() => {
          router.navigate({
            pathname: '/(doctor)/chat/[patientId]',
            params: { patientId },
          });
        }, 80);
      };

      Alert.alert(
        t('doctorPortal.rx.successTitle'),
        t('doctorPortal.rx.successBody'),
        [{ text: t('common.done'), onPress: goToChat }],
        { cancelable: false, onDismiss: goToChat },
      );
    },
    onError: () => {
      Alert.alert(t('common.error'), t('doctorPortal.rx.errorBody'));
    },
  });

  function updateItem(index: number, patch: Partial<FormItem>) {
    setItems((list) =>
      list.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  function addItem() {
    setItems((list) => [...list, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((list) =>
      list.length === 1 ? list : list.filter((_, i) => i !== index),
    );
  }

  function onSubmit() {
    const cleaned: IssueRxItem[] = [];
    for (const it of items) {
      const name = it.medicationName.trim();
      const dose = it.dose.trim();
      const freq = it.frequency.trim();
      if (!name || !dose || !freq) {
        Alert.alert(t('common.error'), t('doctorPortal.rx.missingFields'));
        return;
      }
      const duration = Number.parseInt(it.durationDays, 10);
      cleaned.push({
        medicationName: name,
        dose,
        frequency: freq,
        durationDays: Number.isFinite(duration) && duration > 0 ? duration : undefined,
        instructionsAr: it.instructionsAr.trim() || undefined,
        instructionsEn: it.instructionsEn.trim() || undefined,
      });
    }
    if (!patientId) return;
    mutation.mutate({
      patientId,
      notes: notes.trim() || undefined,
      items: cleaned,
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('doctorPortal.rx.title')}
        subtitle={patientQuery.data?.fullName}
        showBack
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, index) => (
            <Card key={index} padding="md" style={{ gap: spacing.md }}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>
                  {t('doctorPortal.rx.item', { n: index + 1 })}
                </Text>
                {items.length > 1 ? (
                  <Pressable
                    onPress={() => removeItem(index)}
                    hitSlop={8}
                    style={styles.removeBtn}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={colors.status.error}
                    />
                  </Pressable>
                ) : null}
              </View>

              <TextField
                label={t('doctorPortal.rx.medName')}
                value={item.medicationName}
                onChangeText={(v) => updateItem(index, { medicationName: v })}
                placeholder="Amoxicillin 500mg"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('doctorPortal.rx.dose')}
                    value={item.dose}
                    onChangeText={(v) => updateItem(index, { dose: v })}
                    placeholder="500 mg"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('doctorPortal.rx.durationDays')}
                    value={item.durationDays}
                    onChangeText={(v) =>
                      updateItem(index, {
                        durationDays: v.replace(/[^0-9]/g, ''),
                      })
                    }
                    keyboardType="number-pad"
                    placeholder="7"
                  />
                </View>
              </View>
              <TextField
                label={t('doctorPortal.rx.frequency')}
                value={item.frequency}
                onChangeText={(v) => updateItem(index, { frequency: v })}
                placeholder="3× per day"
              />
              <TextField
                label={t('doctorPortal.rx.instructions')}
                value={item.instructionsEn}
                onChangeText={(v) => updateItem(index, { instructionsEn: v })}
                placeholder="Take with food"
                multiline
                style={styles.multiline}
              />
            </Card>
          ))}

          <Pressable onPress={addItem} style={styles.addBtn}>
            <Ionicons name="add" size={18} color={colors.brand.primary} />
            <Text style={styles.addBtnText}>
              {t('doctorPortal.rx.addMedication')}
            </Text>
          </Pressable>

          <Card padding="md" style={{ gap: spacing.sm }}>
            <TextField
              label={t('doctorPortal.rx.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder="—"
              multiline
              style={styles.multiline}
            />
          </Card>

          <GradientButton
            label={
              mutation.isPending
                ? t('doctorPortal.rx.issuing')
                : t('doctorPortal.rx.issue')
            }
            loading={mutation.isPending}
            onPress={onSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.tint.red.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  multiline: {
    height: 88,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.tint.teal.bg,
  },
  addBtnText: {
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
  },
}), [colors]);
}
