import { useMemo, useState } from 'react';
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
  deletePatientVaccination,
  getDoctorPatient,
  issueVaccinationForPatient,
  listPatientVaccinations,
  PatientVaccinationRow,
  updatePatientVaccination,
} from '@services/api/doctor-portal.api';
import { apiErrorMessage } from '@services/api/errors';
import {
  AppColors,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidIso(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export default function IssueVaccinationScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const id = String(patientId);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const queryClient = useQueryClient();

  const patientQuery = useQuery({
    queryKey: ['doctor-patient', id],
    queryFn: () => getDoctorPatient(id),
    enabled: !!id,
  });

  const vaccinesQuery = useQuery({
    queryKey: ['doctor-patient-vaccines', id],
    queryFn: () => listPatientVaccinations(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: (vaccinationId: string) =>
      deletePatientVaccination(id, vaccinationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['doctor-patient-vaccines', id],
      });
      // The patient's own vaccines list will refresh next time they fetch.
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
    },
    onError: (err) => {
      Alert.alert(
        t('common.error'),
        apiErrorMessage(
          err,
          t('doctorPortal.vaccine.deleteError', {
            defaultValue: 'Could not remove this vaccination.',
          }),
        ),
      );
    },
  });

  function confirmDelete(row: PatientVaccinationRow) {
    Alert.alert(
      t('doctorPortal.vaccine.deleteTitle', {
        defaultValue: 'Remove vaccination?',
      }),
      `${row.name}${row.manufacturer ? ` · ${row.manufacturer}` : ''}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(row.id),
        },
      ],
    );
  }

  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [doseNumber, setDoseNumber] = useState('');
  const [totalDoses, setTotalDoses] = useState('');
  const [dateGiven, setDateGiven] = useState(todayISO());
  const [expiresAt, setExpiresAt] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [notes, setNotes] = useState('');
  // When set, the form is editing an existing row instead of creating one.
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm() {
    setName('');
    setManufacturer('');
    setDoseNumber('');
    setTotalDoses('');
    setDateGiven(todayISO());
    setExpiresAt('');
    setBatchNumber('');
    setCertificateNumber('');
    setNotes('');
    setEditingId(null);
  }

  function loadIntoForm(row: PatientVaccinationRow) {
    setEditingId(row.id);
    setName(row.name);
    setManufacturer(row.manufacturer ?? '');
    setDoseNumber(row.doseNumber != null ? String(row.doseNumber) : '');
    setTotalDoses(row.totalDoses != null ? String(row.totalDoses) : '');
    setDateGiven(row.dateGiven.slice(0, 10));
    setExpiresAt(row.expiresAt ? row.expiresAt.slice(0, 10) : '');
    setBatchNumber(row.batchNumber ?? '');
    setCertificateNumber(row.certificateNumber ?? '');
    setNotes(row.notes ?? '');
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        manufacturer: manufacturer.trim() || undefined,
        doseNumber: doseNumber ? Number.parseInt(doseNumber, 10) : undefined,
        totalDoses: totalDoses ? Number.parseInt(totalDoses, 10) : undefined,
        dateGiven,
        expiresAt: expiresAt || undefined,
        batchNumber: batchNumber.trim() || undefined,
        certificateNumber: certificateNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      return editingId
        ? updatePatientVaccination(id, editingId, payload)
        : issueVaccinationForPatient(id, payload);
    },
    onSuccess: () => {
      const wasEditing = !!editingId;
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      queryClient.invalidateQueries({
        queryKey: ['doctor-patient-vaccines', id],
      });
      Alert.alert(
        wasEditing
          ? t('doctorPortal.vaccine.updatedTitle', {
              defaultValue: 'Vaccination updated',
            })
          : t('doctorPortal.vaccine.successTitle', {
              defaultValue: 'Vaccination recorded',
            }),
        wasEditing
          ? t('doctorPortal.vaccine.updatedBody', {
              defaultValue: 'Changes saved.',
            })
          : t('doctorPortal.vaccine.successBody', {
              defaultValue: 'The patient will see it in their vaccine passport.',
            }),
        [{ text: t('common.done'), onPress: resetForm }],
      );
    },
    onError: (err) => {
      Alert.alert(
        t('common.error'),
        apiErrorMessage(
          err,
          t('doctorPortal.vaccine.errorBody', {
            defaultValue: 'Could not save this vaccination.',
          }),
        ),
      );
    },
  });

  function onSubmit() {
    if (!name.trim()) {
      Alert.alert(
        t('common.error'),
        t('doctorPortal.vaccine.nameRequired', {
          defaultValue: 'Vaccine name is required.',
        }),
      );
      return;
    }
    if (!isValidIso(dateGiven)) {
      Alert.alert(
        t('common.error'),
        t('doctorPortal.vaccine.invalidDate', {
          defaultValue: 'Date given must be YYYY-MM-DD.',
        }),
      );
      return;
    }
    if (expiresAt && !isValidIso(expiresAt)) {
      Alert.alert(
        t('common.error'),
        t('doctorPortal.vaccine.invalidExpires', {
          defaultValue: 'Expiry date must be YYYY-MM-DD.',
        }),
      );
      return;
    }
    mutation.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={
          editingId
            ? t('doctorPortal.vaccine.editTitle', {
                defaultValue: 'Edit vaccination',
              })
            : t('doctorPortal.vaccine.title', {
                defaultValue: 'Record vaccination',
              })
        }
        subtitle={patientQuery.data?.fullName ?? ''}
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
            <View style={styles.existingHeader}>
              <Text style={styles.sectionLabel}>
                {t('doctorPortal.vaccine.existingTitle', {
                  defaultValue: 'On file',
                })}
              </Text>
              {vaccinesQuery.isFetching ? (
                <ActivityIndicator
                  size="small"
                  color={colors.text.muted}
                />
              ) : null}
            </View>
            {vaccinesQuery.data && vaccinesQuery.data.length > 0 ? (
              vaccinesQuery.data.map((row, idx) => {
                const isLast = idx === (vaccinesQuery.data?.length ?? 0) - 1;
                const issuer =
                  row.administeredByDoctor?.user.fullName ?? null;
                const meta = [
                  row.dateGiven.slice(0, 10),
                  row.manufacturer,
                  issuer,
                ]
                  .filter(Boolean)
                  .join(' · ');
                const removing =
                  deleteMutation.isPending &&
                  deleteMutation.variables === row.id;
                const beingEdited = editingId === row.id;
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => loadIntoForm(row)}
                    style={({ pressed }) => [
                      styles.existingRow,
                      !isLast && styles.existingDivider,
                      beingEdited && styles.existingRowActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.existingName}>{row.name}</Text>
                      {meta ? (
                        <Text style={styles.existingMeta}>{meta}</Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => loadIntoForm(row)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityLabel={t('doctorPortal.vaccine.edit', {
                        defaultValue: 'Edit',
                      })}
                    >
                      <Ionicons
                        name="create"
                        size={16}
                        color={colors.brand.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(row)}
                      disabled={removing}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      {removing ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.status.error}
                        />
                      ) : (
                        <Ionicons
                          name="trash"
                          size={16}
                          color={colors.status.error}
                        />
                      )}
                    </Pressable>
                  </Pressable>
                );
              })
            ) : (
              <Text style={styles.muted}>
                {t('doctorPortal.vaccine.noneOnFile', {
                  defaultValue: 'No vaccinations recorded yet.',
                })}
              </Text>
            )}
          </Card>

          {editingId ? (
            <Pressable
              onPress={resetForm}
              style={({ pressed }) => [
                styles.cancelEditRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.text.muted}
              />
              <Text style={styles.cancelEditText}>
                {t('doctorPortal.vaccine.cancelEdit', {
                  defaultValue: 'Cancel edit · start a new vaccination',
                })}
              </Text>
            </Pressable>
          ) : null}

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.sectionLabel}>
              {t('doctorPortal.vaccine.section.basics', {
                defaultValue: 'Vaccine',
              })}
            </Text>
            <TextField
              label={t('doctorPortal.vaccine.name', {
                defaultValue: 'Vaccine name',
              })}
              value={name}
              onChangeText={setName}
              placeholder="COVID-19, Influenza, MMR…"
            />
            <TextField
              label={t('doctorPortal.vaccine.manufacturer', {
                defaultValue: 'Manufacturer',
              })}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Pfizer, Sanofi, GSK…"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('doctorPortal.vaccine.doseNumber', {
                    defaultValue: 'Dose #',
                  })}
                  value={doseNumber}
                  onChangeText={(v) =>
                    setDoseNumber(v.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="number-pad"
                  placeholder="1"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('doctorPortal.vaccine.totalDoses', {
                    defaultValue: 'Of total',
                  })}
                  value={totalDoses}
                  onChangeText={(v) =>
                    setTotalDoses(v.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="number-pad"
                  placeholder="3"
                />
              </View>
            </View>
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.sectionLabel}>
              {t('doctorPortal.vaccine.section.dates', {
                defaultValue: 'Dates',
              })}
            </Text>
            <TextField
              label={t('doctorPortal.vaccine.dateGiven', {
                defaultValue: 'Date given (YYYY-MM-DD)',
              })}
              value={dateGiven}
              onChangeText={setDateGiven}
              placeholder="2026-04-25"
              autoCapitalize="none"
            />
            <TextField
              label={t('doctorPortal.vaccine.expiresAt', {
                defaultValue: 'Valid until (optional)',
              })}
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="2027-04-25"
              autoCapitalize="none"
            />
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.sectionLabel}>
              {t('doctorPortal.vaccine.section.refs', {
                defaultValue: 'Identifiers',
              })}
            </Text>
            <TextField
              label={t('doctorPortal.vaccine.batchNumber', {
                defaultValue: 'Batch / lot number',
              })}
              value={batchNumber}
              onChangeText={setBatchNumber}
            />
            <TextField
              label={t('doctorPortal.vaccine.certificateNumber', {
                defaultValue: 'Certificate # (optional)',
              })}
              value={certificateNumber}
              onChangeText={setCertificateNumber}
            />
            <TextField
              label={t('doctorPortal.vaccine.notes', {
                defaultValue: 'Notes',
              })}
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.multiline}
            />
          </Card>

          <View style={styles.hint}>
            <Ionicons
              name="information-circle"
              size={16}
              color={colors.brand.primary}
            />
            <Text style={styles.hintText}>
              {t('doctorPortal.vaccine.hint', {
                defaultValue:
                  'You will be saved as the administering doctor and your hospital as the location.',
              })}
            </Text>
          </View>

          <GradientButton
            label={
              mutation.isPending
                ? t('doctorPortal.vaccine.saving', {
                    defaultValue: 'Saving…',
                  })
                : editingId
                  ? t('doctorPortal.vaccine.update', {
                      defaultValue: 'Update vaccination',
                    })
                  : t('doctorPortal.vaccine.save', {
                      defaultValue: 'Record vaccination',
                    })
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
  return useMemo(
    () =>
      StyleSheet.create({
        body: {
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.xxxl,
        },
        sectionLabel: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
          color: colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        row: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        multiline: {
          height: 80,
          paddingTop: spacing.sm,
          textAlignVertical: 'top',
        },
        hint: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
        },
        hintText: {
          flex: 1,
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          lineHeight: 18,
        },
        existingHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        existingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
        },
        existingDivider: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.surface.border,
        },
        existingName: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
        },
        existingMeta: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          marginTop: 2,
        },
        removeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.tint.red.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        iconBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 6,
        },
        existingRowActive: {
          backgroundColor: colors.tint.teal.bg,
          borderRadius: 8,
          paddingHorizontal: 8,
        },
        cancelEditRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
        },
        cancelEditText: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          fontWeight: typography.weight.semibold,
        },
        lockedBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: colors.surface.sunken,
        },
        lockedText: {
          fontSize: 10,
          fontWeight: typography.weight.semibold,
          color: colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        },
        muted: {
          fontSize: typography.size.sm,
          color: colors.text.muted,
        },
      }),
    [colors],
  );
}
