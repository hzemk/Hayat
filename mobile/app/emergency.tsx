import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  requestEmergency,
  EmergencyResponse,
} from '@services/api/emergency.api';
import {
  listSosContacts,
  SosContact,
} from '@services/api/sosContacts.api';
import { apiErrorMessage } from '@services/api/errors';
import { useAuthStore } from '@stores/auth';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

const SOS_DIAMETER = 240;

export default function EmergencyScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EmergencyResponse | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const pulse = useRef(new Animated.Value(0)).current;

  const { data: sosContacts } = useQuery({
    queryKey: ['sos-contacts'],
    queryFn: listSosContacts,
  });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  function triggerEmergency() {
    Alert.alert(t('emergency.title'), t('emergency.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('emergency.callNow'),
        style: 'destructive',
        onPress: doSend,
      },
    ]);
  }

  async function captureLocation(): Promise<{ lat: number; lng: number } | null> {
    if (coords) return coords;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('emergency.locationRequired'));
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    setCoords(next);
    return next;
  }

  async function doSend() {
    setBusy(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Linking.openURL('tel:911').catch(() => {});
    try {
      const next = await captureLocation();
      if (!next) return;
      const res = await requestEmergency({
        latitude: next.lat,
        longitude: next.lng,
      });
      setResult(res);
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp(contact: SosContact) {
    try {
      const next = await captureLocation();
      if (!next) return;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const phone = contact.phoneNumber.replace(/[^0-9]/g, '');
      const mapUrl = `https://maps.google.com/?q=${next.lat.toFixed(6)},${next.lng.toFixed(6)}`;
      const message = t('emergency.waMessage', {
        name: user?.fullName || 'I',
        mapUrl,
      });
      const text = encodeURIComponent(message);
      const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
      const webUrl = `https://wa.me/${phone}?text=${text}`;
      const supported = await Linking.canOpenURL(appUrl);
      await Linking.openURL(supported ? appUrl : webUrl);
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    }
  }

  const locale = (i18n.language === 'en' ? 'en' : 'ar') as 'ar' | 'en';
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFF5F5' }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.emergency.base, colors.emergency.pressed, '#5b0d0d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('emergency.live')}</Text>
        </View>
        <Text style={styles.heroTitle}>{t('emergency.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('emergency.hint')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.buttonWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ringInner,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
          <Pressable
            onPress={triggerEmergency}
            disabled={busy}
            style={({ pressed }) => [
              styles.bigButton,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <LinearGradient
              colors={[colors.emergency.base, colors.emergency.pressed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bigGradient}
            >
              <Ionicons name="warning" size={68} color="#fff" />
              <Text style={styles.bigLabel}>
                {busy ? t('emergency.sending') : 'SOS'}
              </Text>
              <Text style={styles.bigHint}>{t('emergency.tapToAlert')}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable
          onPress={() => Linking.openURL('tel:911')}
          style={styles.quickAction}
        >
          <View style={styles.quickIcon}>
            <Ionicons name="call" size={22} color={colors.emergency.base} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickLabel}>
              {t('emergency.callAmbulance')}
            </Text>
            <Text style={styles.quickValue}>911</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.muted}
          />
        </Pressable>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle"
              size={18}
              color={colors.emergency.base}
            />
            <Text style={styles.infoTitle}>
              {t('emergency.whatHappens')}
            </Text>
          </View>
          <View style={styles.steps}>
            <Step n="1" text={t('emergency.step1')} />
            <Step n="2" text={t('emergency.step2')} />
            <Step n="3" text={t('emergency.step3')} />
          </View>
        </View>

        {result ? (
          <View style={styles.result}>
            <View style={styles.resultHeader}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.status.success}
              />
              <Text style={styles.resultTitle}>{t('emergency.sent')}</Text>
            </View>
            <Text style={styles.resultText}>
              {result.instructions[locale]}
            </Text>
            {result.nearestHospital ? (
              <Text style={styles.resultHospital}>
                {locale === 'ar'
                  ? result.nearestHospital.nameAr
                  : result.nearestHospital.nameEn}
                {result.nearestHospital.phone
                  ? ` — ${result.nearestHospital.phone}`
                  : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        <SosContactsSection
          contacts={sosContacts ?? []}
          onSend={sendWhatsApp}
        />
      </View>
    </ScrollView>
  );
}

function SosContactsSection({
  contacts,
  onSend,
}: {
  contacts: SosContact[];
  onSend: (c: SosContact) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  if (contacts.length === 0) {
    return (
      <View style={styles.contactsCard}>
        <View style={styles.contactsHeader}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.contactsTitle}>
            {t('emergency.alertContacts')}
          </Text>
        </View>
        <Text style={styles.contactsHint}>
          {t('emergency.noContactsConfigured')}
        </Text>
        <Pressable
          onPress={() => router.push('/sos-contacts')}
          style={styles.addBtn}
        >
          <Ionicons name="add-circle" size={18} color={colors.brand.primary} />
          <Text style={styles.addBtnText}>{t('emergency.addContacts')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.contactsCard}>
      <View style={styles.contactsHeader}>
        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
        <Text style={styles.contactsTitle}>
          {t('emergency.alertContacts')}
        </Text>
      </View>
      <Text style={styles.contactsHint}>
        {t('emergency.alertContactsHint')}
      </Text>
      {contacts.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onSend(c)}
          style={({ pressed }) => [
            styles.contactRow,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.waIcon}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={styles.contactPhone} numberOfLines={1}>
              {c.phoneNumber}
              {c.relationship ? ` · ${c.relationship}` : ''}
            </Text>
          </View>
          <View style={styles.sendPill}>
            <Ionicons name="send" size={14} color="#fff" />
            <Text style={styles.sendPillText}>
              {t('emergency.sendWhatsApp')}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBubble}>
        <Text style={styles.stepNum}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: typography.weight.bold,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: typography.size.sm,
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  buttonWrap: {
    alignSelf: 'center',
    width: SOS_DIAMETER,
    height: SOS_DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SOS_DIAMETER,
    height: SOS_DIAMETER,
    borderRadius: SOS_DIAMETER / 2,
    backgroundColor: colors.emergency.base,
  },
  ringInner: {
    position: 'absolute',
    width: SOS_DIAMETER * 0.85,
    height: SOS_DIAMETER * 0.85,
    borderRadius: SOS_DIAMETER / 2,
    backgroundColor: colors.emergency.base,
  },
  bigButton: {
    width: SOS_DIAMETER,
    height: SOS_DIAMETER,
    borderRadius: SOS_DIAMETER / 2,
    shadowColor: colors.emergency.base,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bigGradient: {
    flex: 1,
    borderRadius: SOS_DIAMETER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bigLabel: {
    color: '#fff',
    fontSize: 32,
    fontWeight: typography.weight.bold,
    letterSpacing: 6,
  },
  bigHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.soft,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.tint.red.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  quickValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.soft,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  steps: { gap: spacing.md },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tint.red.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.emergency.base,
  },
  stepText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  result: {
    backgroundColor: colors.surface.base,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.tint.green.bg,
    gap: spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.status.success,
  },
  resultText: { fontSize: typography.size.sm, color: colors.text.primary },
  resultHospital: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  contactsCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.soft,
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactsTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  contactsHint: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  waIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  contactPhone: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  sendPillText: {
    color: '#fff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addBtnText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.brand.primary,
  },
}), [colors]);
}
