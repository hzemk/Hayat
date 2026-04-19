import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { TextField } from '@components/TextField';
import { GradientButton } from '@components/GradientButton';
import { createVaccination } from '@services/api/vaccinations.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, spacing, typography, useTheme } from '@theme/index';

function parseIntOrNull(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}

function validDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v).getTime());
}

export default function NewVaccination() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [doseNumber, setDoseNumber] = useState('');
  const [totalDoses, setTotalDoses] = useState('');
  const [dateGiven, setDateGiven] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [administeredBy, setAdministeredBy] = useState('');
  const [administeredAt, setAdministeredAt] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');

  const createMutation = useMutation({
    mutationFn: createVaccination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      router.back();
    },
    onError: (err) => {
      Alert.alert(
        t('common.error') || 'Error',
        apiErrorMessage(err, 'Could not save'),
      );
    },
  });

  function onSave() {
    if (!name.trim()) {
      Alert.alert('', t('vaccines.nameRequired') || 'Vaccine name is required');
      return;
    }
    if (!validDate(dateGiven)) {
      Alert.alert(
        '',
        t('vaccines.dateInvalid') || 'Date given must be YYYY-MM-DD',
      );
      return;
    }
    if (expiresAt && !validDate(expiresAt)) {
      Alert.alert(
        '',
        t('vaccines.expiryInvalid') || 'Expiry date must be YYYY-MM-DD',
      );
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      manufacturer: manufacturer.trim() || undefined,
      doseNumber: parseIntOrNull(doseNumber),
      totalDoses: parseIntOrNull(totalDoses),
      dateGiven: new Date(dateGiven).toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      batchNumber: batchNumber.trim() || undefined,
      administeredBy: administeredBy.trim() || undefined,
      administeredAt: administeredAt.trim() || undefined,
      certificateNumber: certificateNumber.trim() || undefined,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader
        showBack
        title={t('vaccines.add') || 'Add vaccination'}
        subtitle={t('vaccines.subtitle') || 'Your immunization passport'}
      />
      <View style={styles.body}>
        <Text style={styles.hint}>
          {t('vaccines.addHint') ||
            'Fields marked * are required. Dates must be YYYY-MM-DD.'}
        </Text>

        <TextField
          label={`${t('vaccines.name') || 'Vaccine name'} *`}
          value={name}
          onChangeText={setName}
          placeholder="COVID-19, Yellow Fever..."
        />
        <TextField
          label={t('vaccines.manufacturer') || 'Manufacturer'}
          value={manufacturer}
          onChangeText={setManufacturer}
          placeholder="Pfizer, Sanofi..."
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField
              label={t('vaccines.doseNumber') || 'Dose #'}
              value={doseNumber}
              onChangeText={setDoseNumber}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label={t('vaccines.totalDoses') || 'Total doses'}
              value={totalDoses}
              onChangeText={setTotalDoses}
              keyboardType="number-pad"
              placeholder="3"
            />
          </View>
        </View>
        <TextField
          label={`${t('vaccines.dateGiven') || 'Date given'} *`}
          value={dateGiven}
          onChangeText={setDateGiven}
          placeholder="2024-05-10"
        />
        <TextField
          label={t('vaccines.expiresAt') || 'Expires (optional)'}
          value={expiresAt}
          onChangeText={setExpiresAt}
          placeholder="2034-05-10"
        />
        <TextField
          label={t('vaccines.batchNumber') || 'Batch / Lot number'}
          value={batchNumber}
          onChangeText={setBatchNumber}
        />
        <TextField
          label={t('vaccines.administeredBy') || 'Administered by'}
          value={administeredBy}
          onChangeText={setAdministeredBy}
          placeholder="Clinic / hospital name"
        />
        <TextField
          label={t('vaccines.administeredAt') || 'Location'}
          value={administeredAt}
          onChangeText={setAdministeredAt}
          placeholder="Amman, Jordan"
        />
        <TextField
          label={t('vaccines.certificateNumber') || 'Certificate #'}
          value={certificateNumber}
          onChangeText={setCertificateNumber}
          placeholder="ICVP-..."
        />

        <GradientButton
          label={t('common.save') || 'Save'}
          onPress={onSave}
          loading={createMutation.isPending}
        />
      </View>
    </ScrollView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
}), [colors]);
}
