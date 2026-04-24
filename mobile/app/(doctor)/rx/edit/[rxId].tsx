import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  getIssuedPrescription,
  IssueRxItem,
  updateIssuedPrescription,
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

const STATUSES: Array<'ACTIVE' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED'> = [
  'ACTIVE',
  'DISPENSED',
  'EXPIRED',
  'CANCELLED',
];

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

export default function EditRxScreen() {
  const { rxId } = useLocalSearchParams<{ rxId: string }>();
  const id = String(rxId);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const queryClient = useQueryClient();

  const rxQuery = useQuery({
    queryKey: ['doctor-issued', id],
    queryFn: () => getIssuedPrescription(id),
    enabled: !!id,
  });

  const [items, setItems] = useState<FormItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<typeof STATUSES[number]>('ACTIVE');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!rxQuery.data || hydrated) return;
    setItems(
      rxQuery.data.items.map((i) => ({
        medicationName: i.medicationName,
        dose: i.dose,
        frequency: i.frequency,
        durationDays:
          i.durationDays != null ? String(i.durationDays) : '',
        instructionsAr: i.instructionsAr ?? '',
        instructionsEn: i.instructionsEn ?? '',
      })),
    );
    setNotes(rxQuery.data.notes ?? '');
    if (
      rxQuery.data.status === 'ACTIVE' ||
      rxQuery.data.status === 'DISPENSED' ||
      rxQuery.data.status === 'EXPIRED' ||
      rxQuery.data.status === 'CANCELLED'
    ) {
      setStatus(rxQuery.data.status);
    }
    setHydrated(true);
  }, [rxQuery.data, hydrated]);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateIssuedPrescription>[1]) =>
      updateIssuedPrescription(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-issued'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-issued', id] });
      Alert.alert(
        t('doctorPortal.rx.editSavedTitle') || 'Saved',
        t('doctorPortal.rx.editSavedBody') || 'Prescription updated.',
        [{ text: t('common.done'), onPress: () => router.back() }],
        { cancelable: false, onDismiss: () => router.back() },
      );
    },
    onError: () => {
      Alert.alert(
        t('common.error'),
        t('doctorPortal.rx.editErrorBody') || 'Could not update prescription.',
      );
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

  function onSave() {
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
        durationDays:
          Number.isFinite(duration) && duration > 0 ? duration : undefined,
        instructionsAr: it.instructionsAr.trim() || undefined,
        instructionsEn: it.instructionsEn.trim() || undefined,
      });
    }
    mutation.mutate({
      notes: notes.trim() || undefined,
      status,
      items: cleaned,
    });
  }

  if (rxQuery.isLoading || !hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surface.raised }]}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (rxQuery.isError || !rxQuery.data) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surface.raised }]}>
        <Text style={{ color: colors.text.muted }}>{t('common.error')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('doctorPortal.rx.editTitle') || 'Edit prescription'}
        subtitle={rxQuery.data.patient?.fullName ?? ''}
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
          <Card padding="md" style={{ gap: spacing.sm }}>
            <Text style={styles.sectionLabel}>
              {t('doctorPortal.rx.statusLabel') || 'Status'}
            </Text>
            <View style={styles.statusRow}>
              {STATUSES.map((s) => {
                const active = status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {t(`doctorPortal.rx.status.${s}`, {
                        defaultValue: s,
                      })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

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
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('doctorPortal.rx.dose')}
                    value={item.dose}
                    onChangeText={(v) => updateItem(index, { dose: v })}
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
                  />
                </View>
              </View>
              <TextField
                label={t('doctorPortal.rx.frequency')}
                value={item.frequency}
                onChangeText={(v) => updateItem(index, { frequency: v })}
              />
              <TextField
                label={t('doctorPortal.rx.instructions')}
                value={item.instructionsEn}
                onChangeText={(v) => updateItem(index, { instructionsEn: v })}
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
              multiline
              style={styles.multiline}
            />
          </Card>

          <GradientButton
            label={
              mutation.isPending
                ? t('doctorPortal.rx.savingEdit') || 'Saving…'
                : t('doctorPortal.rx.saveEdit') || 'Save changes'
            }
            loading={mutation.isPending}
            onPress={onSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        loading: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
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
        sectionLabel: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
          color: colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        statusRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
        },
        chip: {
          paddingVertical: 6,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.surface.border,
          backgroundColor: colors.surface.base,
        },
        chipActive: {
          backgroundColor: colors.brand.primary,
          borderColor: colors.brand.primary,
        },
        chipText: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          color: colors.text.secondary,
        },
        chipTextActive: {
          color: colors.text.inverse,
        },
      }),
    [colors],
  );
}
