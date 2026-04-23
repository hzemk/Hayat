import { useMemo } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { GradientButton } from '@components/GradientButton';
import { Button } from '@components/Button';
import { getHospital } from '@services/api/hospitals.api';
import { localizeCity } from '@i18n/places';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

export default function HospitalLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hospitalId = String(id);
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data: hospital, isLoading, isError } = useQuery({
    queryKey: ['hospital', hospitalId],
    queryFn: () => getHospital(hospitalId),
    enabled: !!hospitalId,
  });

  const name = hospital ? (isAr ? hospital.nameAr : hospital.nameEn) : '';
  const address = hospital
    ? (isAr ? hospital.addressAr : hospital.addressEn) ?? ''
    : '';
  const city = hospital ? localizeCity(hospital.city, isAr) : '';

  function openMaps() {
    if (!hospital) return;
    const query = encodeURIComponent(`${hospital.nameEn}, ${hospital.city}, Jordan`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}&ll=${hospital.latitude},${hospital.longitude}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('', t('hospitalLocation.openFailed')),
    );
  }

  function openDirections() {
    if (!hospital) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('', t('hospitalLocation.openFailed')),
    );
  }

  function callHospital() {
    if (!hospital?.phone) return;
    Linking.openURL(`tel:${hospital.phone}`);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <GradientHeader
        showBack
        title={t('hospitalLocation.title')}
        subtitle={name || t('common.loading')}
      />

      <View style={styles.body}>
        {isLoading ? (
          <Card variant="outline">
            <Text style={styles.muted}>{t('common.loading')}</Text>
          </Card>
        ) : isError || !hospital ? (
          <Card variant="outline">
            <Text style={{ color: colors.status.error }}>
              {t('hospitals.loadFailed')}
            </Text>
          </Card>
        ) : (
          <>
            <View style={styles.mapPreview}>
              <View style={styles.mapDot} />
              <View style={styles.mapDotRing} />
              <Ionicons
                name="location"
                size={56}
                color={colors.brand.primary}
                style={styles.mapPin}
              />
              <View style={styles.mapFooter}>
                <Text style={styles.mapCoords}>
                  {hospital.latitude.toFixed(5)}, {hospital.longitude.toFixed(5)}
                </Text>
              </View>
            </View>

            <Card style={{ gap: spacing.md }}>
              <View style={styles.headerRow}>
                <View style={styles.iconBubble}>
                  <Ionicons
                    name="business"
                    size={20}
                    color={colors.tint.teal.fg}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospitalName}>{name}</Text>
                  <Text style={styles.hospitalCity}>{city}</Text>
                </View>
              </View>

              {address ? (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="navigate"
                    size={16}
                    color={colors.text.muted}
                  />
                  <Text style={styles.infoText} numberOfLines={3}>
                    {address}
                  </Text>
                </View>
              ) : null}

              {hospital.phone ? (
                <Pressable onPress={callHospital} style={styles.infoRow}>
                  <Ionicons
                    name="call"
                    size={16}
                    color={colors.brand.primary}
                  />
                  <Text style={[styles.infoText, styles.linkText]}>
                    {hospital.phone}
                  </Text>
                </Pressable>
              ) : null}
            </Card>

            <GradientButton
              label={t('hospitalLocation.openInMaps')}
              onPress={openMaps}
              leftIcon={
                <Ionicons name="map" size={18} color={colors.text.inverse} />
              }
            />
            <Button
              label={t('hospitalLocation.getDirections')}
              variant="secondary"
              onPress={openDirections}
              leftIcon={
                <Ionicons
                  name="navigate-circle"
                  size={18}
                  color={colors.brand.primary}
                />
              }
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        body: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          gap: spacing.md,
        },
        muted: {
          color: colors.text.muted,
          fontSize: typography.size.sm,
        },
        mapPreview: {
          height: 200,
          borderRadius: radius.lg,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        },
        mapDot: {
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.brand.primary,
          opacity: 0.25,
        },
        mapDotRing: {
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: 45,
          borderWidth: 2,
          borderColor: colors.brand.primary,
          opacity: 0.25,
        },
        mapPin: {
          position: 'absolute',
          top: '28%',
        },
        mapFooter: {
          position: 'absolute',
          bottom: spacing.sm,
          alignSelf: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: radius.pill,
          backgroundColor: colors.scrim.strong,
        },
        mapCoords: {
          color: colors.brand.on,
          fontSize: typography.size.xs,
          fontVariant: ['tabular-nums'],
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        iconBubble: {
          width: 40,
          height: 40,
          borderRadius: radius.lg,
          backgroundColor: colors.tint.teal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        hospitalName: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        hospitalCity: {
          fontSize: typography.size.sm,
          color: colors.text.muted,
          marginTop: 2,
        },
        infoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        infoText: {
          flex: 1,
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          lineHeight: 20,
        },
        linkText: {
          color: colors.brand.primary,
          fontWeight: typography.weight.semibold,
        },
      }),
    [colors],
  );
}
