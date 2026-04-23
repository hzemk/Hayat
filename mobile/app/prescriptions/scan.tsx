import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { GradientButton } from '@components/GradientButton';
import { Button } from '@components/Button';
import {
  createPrescription,
  createRemindersFromPrescription,
  scanPrescription,
  ScanResult,
  ScannedItem,
} from '@services/api/prescriptions.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

type Step = 'pick' | 'review';

function mimeFromAsset(uri: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export default function ScanPrescriptionScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [step, setStep] = useState<Step>('pick');
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ScannedItem[]>([]);

  const scanMutation = useMutation({
    mutationFn: scanPrescription,
    onSuccess: (data: ScanResult) => {
      if (!data.items || data.items.length === 0) {
        Alert.alert(
          '',
          t('prescriptions.scanEmpty') ||
            'No medications detected. Try a clearer photo.',
        );
        return;
      }
      setNotes(data.notes ?? '');
      setItems(data.items);
      setStep('review');
    },
    onError: (err) => {
      Alert.alert(
        t('common.error') || 'Error',
        apiErrorMessage(err, 'Could not scan'),
      );
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { notes?: string; items: ScannedItem[] }) => {
      const prescription = await createPrescription(payload);
      const result = await createRemindersFromPrescription(prescription.id);
      return { prescription, remindersCreated: result.created };
    },
    onSuccess: ({ remindersCreated }) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      Alert.alert(
        '',
        t('prescriptions.addedToReminders', { count: remindersCreated }),
        [{ text: t('common.done') || 'Done', onPress: () => router.back() }],
      );
    },
    onError: (err) => {
      Alert.alert(t('common.error') || 'Error', apiErrorMessage(err));
    },
  });

  async function pickFrom(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        '',
        t('prescriptions.permissionDenied') ||
          'Camera / library permission is required.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            base64: true,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            base64: true,
            allowsEditing: true,
          });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    setPreview(asset.uri);
    scanMutation.mutate({
      imageBase64: asset.base64!,
      mimeType: mimeFromAsset(asset.uri),
    });
  }

  function updateItem(index: number, patch: Partial<ScannedItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function onSave() {
    const cleaned = items
      .map((i) => ({
        ...i,
        medicationName: i.medicationName.trim(),
        dose: i.dose.trim(),
        frequency: i.frequency.trim(),
      }))
      .filter(
        (i) => i.medicationName.length > 0 && i.dose.length > 0 && i.frequency.length > 0,
      );

    if (cleaned.length === 0) {
      Alert.alert(
        '',
        t('prescriptions.noValidItems') ||
          'Add at least one medication with name, dose, and frequency.',
      );
      return;
    }

    saveMutation.mutate({
      notes: notes.trim() || undefined,
      items: cleaned,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <GradientHeader
        showBack
        title={t('prescriptions.scan') || 'Scan prescription'}
        subtitle={
          step === 'pick'
            ? t('prescriptions.scanPick') || 'Take or pick a photo'
            : t('prescriptions.scanReview') || 'Review extracted medications'
        }
      />

      {step === 'pick' ? (
        <View style={styles.body}>
          <Card>
            <Text style={styles.hint}>
              {t('prescriptions.scanHint') ||
                'Place the prescription on a flat surface and take a clear photo. Claude will extract each medication for you to review.'}
            </Text>
          </Card>

          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} />
          ) : null}

          <GradientButton
            label={t('prescriptions.scanCamera') || 'Take photo'}
            onPress={() => pickFrom('camera')}
            loading={scanMutation.isPending}
            leftIcon={
              <Ionicons name="camera" size={18} color={colors.text.inverse} />
            }
          />
          <Button
            label={t('prescriptions.scanLibrary') || 'Pick from gallery'}
            variant="secondary"
            onPress={() => pickFrom('library')}
            loading={scanMutation.isPending}
            leftIcon={
              <Ionicons name="images" size={18} color={colors.brand.primary} />
            }
          />
        </View>
      ) : (
        <View style={styles.body}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.previewSmall} />
          ) : null}

          <TextField
            label={t('prescriptions.notes') || 'Notes'}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Upper respiratory infection"
            multiline
          />

          {items.map((item, index) => (
            <Card key={index}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIndex}>#{index + 1}</Text>
                <Pressable onPress={() => removeItem(index)} hitSlop={12}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.status.error}
                  />
                </Pressable>
              </View>
              <TextField
                label={t('prescriptions.medication') || 'Medication'}
                value={item.medicationName}
                onChangeText={(v) => updateItem(index, { medicationName: v })}
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('prescriptions.dose') || 'Dose'}
                    value={item.dose}
                    onChangeText={(v) => updateItem(index, { dose: v })}
                    placeholder="500mg"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('prescriptions.duration') || 'Duration (days)'}
                    value={
                      item.durationDays !== undefined
                        ? String(item.durationDays)
                        : ''
                    }
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      updateItem(index, {
                        durationDays: isNaN(n) ? undefined : n,
                      });
                    }}
                    keyboardType="number-pad"
                    placeholder="7"
                  />
                </View>
              </View>
              <TextField
                label={t('prescriptions.frequency') || 'Frequency'}
                value={item.frequency}
                onChangeText={(v) => updateItem(index, { frequency: v })}
                placeholder="Twice daily"
              />
              <TextField
                label={t('prescriptions.instructions') || 'Instructions'}
                value={item.instructionsEn ?? ''}
                onChangeText={(v) =>
                  updateItem(index, { instructionsEn: v || undefined })
                }
                placeholder="After meals"
              />
            </Card>
          ))}

          <Button
            label={t('prescriptions.addItem') || 'Add another medication'}
            variant="ghost"
            onPress={() =>
              setItems((prev) => [
                ...prev,
                { medicationName: '', dose: '', frequency: '' },
              ])
            }
            leftIcon={
              <Ionicons name="add" size={18} color={colors.brand.primary} />
            }
          />

          <GradientButton
            label={t('common.done') || 'Done'}
            onPress={onSave}
            loading={saveMutation.isPending}
          />
          <Button
            label={t('prescriptions.rescan') || 'Scan again'}
            variant="ghost"
            onPress={() => {
              setStep('pick');
              setItems([]);
              setNotes('');
            }}
          />
        </View>
      )}
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
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.sunken,
  },
  previewSmall: {
    width: '100%',
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.sunken,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemIndex: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.brand.primary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
}), [colors]);
}
