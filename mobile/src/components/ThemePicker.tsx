import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '@components/Card';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

export function ThemePicker() {
  const { t } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const styles = useStyles(colors);

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons
            name={mode === 'dark' ? 'moon' : 'sunny'}
            size={16}
            color={colors.brand.primary}
          />
        </View>
        <Text style={styles.title}>{t('profile.appearance')}</Text>
      </View>
      <View style={styles.segment}>
        {(['light', 'dark'] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text
                style={[
                  styles.optionText,
                  active && styles.optionTextActive,
                ]}
                numberOfLines={1}
              >
                {m === 'light' ? t('profile.lightMode') : t('profile.darkMode')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        icon: {
          width: 32,
          height: 32,
          borderRadius: radius.md,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
        },
        segment: {
          flexDirection: 'row',
          backgroundColor: colors.surface.sunken,
          borderRadius: radius.lg,
          padding: 4,
          gap: 4,
        },
        option: {
          flex: 1,
          paddingVertical: spacing.sm + 2,
          alignItems: 'center',
          borderRadius: radius.md,
        },
        optionActive: {
          backgroundColor: colors.surface.base,
          ...shadow.soft,
        },
        optionText: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          color: colors.text.muted,
        },
        optionTextActive: {
          color: colors.brand.primary,
        },
      }),
    [colors],
  );
}
