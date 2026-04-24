import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@components/Card';
import {
  bucketForCode,
  describeWeatherCode,
  getCurrentWeather,
  suggestOutfit,
  WeatherBucket,
} from '@services/weather';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useTheme,
} from '@theme/index';

const ICON: Record<WeatherBucket, keyof typeof Ionicons.glyphMap> = {
  clear: 'sunny',
  cloudy: 'cloud',
  fog: 'cloud-outline',
  drizzle: 'rainy-outline',
  rain: 'rainy',
  snow: 'snow',
  storm: 'thunderstorm',
};

export function WeatherCard() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language === 'en' ? 'en' : 'ar') as 'ar' | 'en';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather'],
    queryFn: getCurrentWeather,
    staleTime: 15 * 60 * 1000, // 15 min — weather doesn't change that fast
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card variant="outline" padding="md">
        <Text style={styles.muted}>
          {t('weather.loading', { defaultValue: 'Fetching weather…' })}
        </Text>
      </Card>
    );
  }

  if (isError || !data) {
    // Silent failure — this is a nice-to-have, not critical.
    return null;
  }

  const bucket = bucketForCode(data.weatherCode);
  const condition = describeWeatherCode(data.weatherCode, locale);
  const outfit = suggestOutfit(data);
  const palette = bucket === 'rain' || bucket === 'drizzle' || bucket === 'storm'
    ? colors.tint.blue
    : bucket === 'snow'
      ? colors.tint.blue
      : bucket === 'clear'
        ? colors.tint.yellow
        : colors.tint.teal;

  return (
    <Card padding="md" style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={[styles.iconBubble, { backgroundColor: palette.bg }]}>
          <Ionicons name={ICON[bucket]} size={26} color={palette.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.tempRow}>
            <Text style={styles.temp}>{data.tempC}°</Text>
            <Text style={styles.condition}>{condition}</Text>
          </View>
          <Text style={styles.feels}>
            {t('weather.feelsLike', {
              defaultValue: 'Feels like {{n}}°',
              n: data.feelsLikeC,
            })}
          </Text>
        </View>
      </View>
      <View style={styles.outfitRow}>
        <Ionicons name="shirt" size={14} color={colors.brand.primary} />
        <Text style={styles.outfit}>{outfit[locale]}</Text>
      </View>
    </Card>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        iconBubble: {
          width: 54,
          height: 54,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tempRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
        },
        temp: {
          fontSize: typography.size.xxxl,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        condition: {
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          fontWeight: typography.weight.semibold,
        },
        feels: {
          fontSize: typography.size.xs,
          color: colors.text.muted,
          marginTop: 2,
        },
        outfitRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingTop: spacing.xs,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.surface.border,
        },
        outfit: {
          flex: 1,
          fontSize: typography.size.sm,
          color: colors.text.primary,
          fontWeight: typography.weight.medium,
        },
        muted: {
          fontSize: typography.size.sm,
          color: colors.text.muted,
        },
      }),
    [colors],
  );
}
