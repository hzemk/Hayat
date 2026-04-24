import { useMemo } from 'react';
import {
  DevSettings,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '@components/Card';
import { useAuthStore } from '@stores/auth';
import { updateMe } from '@services/api/users.api';
import { applyRtl, Locale } from '@i18n/index';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  async function setLanguage(next: Locale) {
    if (i18n.language === next) return;
    const directionWillFlip = (next === 'ar') !== I18nManager.isRTL;
    await i18n.changeLanguage(next);
    await applyRtl(next);
    if (user) {
      try {
        await updateMe({ preferredLocale: next });
        setUser({ ...user, preferredLocale: next });
      } catch {
        // non-fatal
      }
    }
    // RTL/LTR direction flip can't be applied to live native views — auto
    // reload the JS bundle so the new direction takes effect without the
    // user manually killing the app. DevSettings.reload is available in
    // Expo Go / dev builds; in a production build this branch becomes a
    // no-op and the user can restart manually if needed.
    if (directionWillFlip && typeof DevSettings?.reload === 'function') {
      setTimeout(() => DevSettings.reload(), 150);
    }
  }

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="language" size={16} color={colors.brand.primary} />
        </View>
        <Text style={styles.title}>{t('profile.language')}</Text>
      </View>
      <View style={styles.segment}>
        {(['ar', 'en'] as const).map((code) => {
          const active = i18n.language === code;
          return (
            <Pressable
              key={code}
              onPress={() => setLanguage(code)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text
                style={[
                  styles.optionText,
                  active && styles.optionTextActive,
                ]}
                numberOfLines={1}
              >
                {code === 'ar' ? 'العربية' : 'English'}
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
