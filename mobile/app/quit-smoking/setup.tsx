import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientHeader } from '@components/GradientHeader';
import { GradientButton } from '@components/GradientButton';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { useQuitSmokingStore } from '@stores/quitSmoking';
import { scheduleQuitSmokingDailyCheckIn } from '@services/notifications';
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

export default function QuitSmokingSetupScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const begin = useQuitSmokingStore((s) => s.begin);

  const [quitDate, setQuitDate] = useState(todayISO());
  const [cigarettesPerDay, setCigarettesPerDay] = useState('20');
  const [pricePerPack, setPricePerPack] = useState('3');
  const [cigarettesPerPack, setCigarettesPerPack] = useState('20');
  const [currency, setCurrency] = useState('JOD');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onStart() {
    setError(null);
    const cpd = Number.parseInt(cigarettesPerDay, 10);
    const ppp = Number.parseFloat(pricePerPack);
    const cpp = Number.parseInt(cigarettesPerPack, 10);
    if (!isValidIso(quitDate)) {
      setError(
        t('quit.errors.invalidDate', {
          defaultValue: 'Quit date must be YYYY-MM-DD.',
        }),
      );
      return;
    }
    if (!Number.isFinite(cpd) || cpd < 0) {
      setError(
        t('quit.errors.invalidCpd', {
          defaultValue: 'Cigarettes per day must be a positive number.',
        }),
      );
      return;
    }
    if (!Number.isFinite(ppp) || ppp < 0) {
      setError(
        t('quit.errors.invalidPrice', {
          defaultValue: 'Price per pack must be a positive number.',
        }),
      );
      return;
    }
    if (!Number.isFinite(cpp) || cpp <= 0) {
      setError(
        t('quit.errors.invalidPerPack', {
          defaultValue: 'Cigarettes per pack must be greater than zero.',
        }),
      );
      return;
    }
    setSubmitting(true);
    await begin({
      quitDate,
      cigarettesPerDay: cpd,
      pricePerPack: ppp,
      cigarettesPerPack: cpp,
      currency: currency.trim().toUpperCase() || 'JOD',
    });
    // Best-effort daily check-in. If the user denies notif perms, we just
    // skip silently — the feature still works without nagging.
    void scheduleQuitSmokingDailyCheckIn({
      locale: i18n.language === 'ar' ? 'ar' : 'en',
    });
    setSubmitting(false);
    router.replace(('/quit-smoking' as never));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.raised }}>
      <GradientHeader
        title={t('quit.setup.title', {
          defaultValue: 'Plant your tree',
        })}
        subtitle={t('quit.setup.subtitle', {
          defaultValue: 'Tell us a bit about your smoking — we\'ll grow with you.',
        })}
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
          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.sectionLabel}>
              {t('quit.setup.section.when', { defaultValue: 'When' })}
            </Text>
            <TextField
              label={t('quit.setup.quitDate', {
                defaultValue: 'Quit date (YYYY-MM-DD)',
              })}
              value={quitDate}
              onChangeText={setQuitDate}
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              {t('quit.setup.quitDateHint', {
                defaultValue:
                  'Today is fine — or backdate it if you\'ve already started.',
              })}
            </Text>
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.sectionLabel}>
              {t('quit.setup.section.habit', { defaultValue: 'Your habit' })}
            </Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('quit.setup.cpd', {
                    defaultValue: 'Cigarettes / day',
                  })}
                  value={cigarettesPerDay}
                  onChangeText={(v) =>
                    setCigarettesPerDay(v.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('quit.setup.cpp', {
                    defaultValue: 'Cigarettes / pack',
                  })}
                  value={cigarettesPerPack}
                  onChangeText={(v) =>
                    setCigarettesPerPack(v.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <TextField
                  label={t('quit.setup.price', {
                    defaultValue: 'Price per pack',
                  })}
                  value={pricePerPack}
                  onChangeText={(v) =>
                    setPricePerPack(v.replace(/[^0-9.]/g, ''))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('quit.setup.currency', {
                    defaultValue: 'Currency',
                  })}
                  value={currency}
                  onChangeText={(v) => setCurrency(v.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
            label={t('quit.setup.start', {
              defaultValue: 'Plant my tree',
            })}
            onPress={onStart}
            loading={submitting}
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
        hint: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
        },
        error: {
          color: colors.status.error,
          fontSize: typography.size.sm,
          textAlign: 'center',
        },
      }),
    [colors],
  );
}
