import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { Card } from '@components/Card';
import { GradientButton } from '@components/GradientButton';
import { Button } from '@components/Button';
import { TextField } from '@components/TextField';
import {
  BookableDoctor,
  listDepartmentDoctors,
  listHospitals,
  getHospital,
  Hospital,
} from '@services/api/hospitals.api';
import { createAppointment } from '@services/api/appointments.api';
import { apiErrorMessage } from '@services/api/errors';
import { localizeCity } from '@i18n/places';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

type Step = 'hospital' | 'department' | 'schedule' | 'doctor';

const DAY_COUNT = 7;
const REGULAR_HOURS = { start: 8, end: 20 };
const ER_HOURS = { start: 0, end: 23 };

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function BookingScreen() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language === 'en' ? 'en' : 'ar') as 'ar' | 'en';
  const params = useLocalSearchParams<{ hospitalId?: string }>();
  const preselectedId = params.hospitalId;
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [step, setStep] = useState<Step>(
    preselectedId ? 'department' : 'hospital',
  );
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(() => new Date());
  const queryClient = useQueryClient();

  const bookMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Alert.alert('', t('booking.confirmed'), [
        { text: t('common.done'), onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const { data: preselectedHospital } = useQuery({
    queryKey: ['hospital', preselectedId],
    queryFn: () => getHospital(preselectedId!),
    enabled: !!preselectedId,
  });

  useEffect(() => {
    if (preselectedHospital && !hospital) setHospital(preselectedHospital);
  }, [preselectedHospital, hospital]);

  const today = useMemo(() => startOfDay(now), [now]);
  const days = useMemo(
    () =>
      Array.from({ length: DAY_COUNT }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [today],
  );
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else {
        setCoords({ lat: 31.95, lng: 35.93 });
      }
    })();
  }, []);

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ['hospitals', coords],
    queryFn: () =>
      listHospitals(coords ? { lat: coords.lat, lng: coords.lng } : undefined),
    enabled: !!coords,
  });

  const doctorsQuery = useQuery({
    queryKey: ['booking-doctors', hospital?.id, departmentId],
    queryFn: () => listDepartmentDoctors(hospital!.id, departmentId!),
    enabled: step === 'doctor' && !!hospital && !!departmentId,
  });

  const selectedDepartment = useMemo(
    () => hospital?.departments.find((d) => d.id === departmentId),
    [hospital, departmentId],
  );
  const isER = selectedDepartment?.code === 'ER';

  const hourSlots = useMemo(() => {
    const range = isER ? ER_HOURS : REGULAR_HOURS;
    const all: number[] = [];
    for (let h = range.start; h <= range.end; h++) all.push(h);
    if (isSameDay(selectedDay, today)) {
      return all.filter((h) => h > now.getHours());
    }
    return all;
  }, [isER, selectedDay, today, now]);

  useEffect(() => {
    if (selectedHour !== null && !hourSlots.includes(selectedHour)) {
      setSelectedHour(hourSlots[0] ?? null);
    } else if (selectedHour === null && hourSlots.length > 0) {
      setSelectedHour(hourSlots[Math.min(2, hourSlots.length - 1)]);
    }
  }, [hourSlots, selectedHour]);

  const scheduledAt = useMemo(() => {
    const d = new Date(selectedDay);
    d.setHours(selectedHour ?? 9, 0, 0, 0);
    return d;
  }, [selectedDay, selectedHour]);

  function dayLabel(d: Date) {
    if (isSameDay(d, days[0])) return t('booking.today');
    if (isSameDay(d, days[1])) return t('booking.tomorrow');
    return d.toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-GB', {
      weekday: 'short',
    });
  }

  function onConfirm() {
    if (!hospital || !departmentId || selectedHour === null) return;
    bookMutation.mutate({
      hospitalId: hospital.id,
      departmentId,
      doctorId: doctorId ?? undefined,
      scheduledAt: scheduledAt.toISOString(),
      reason: reason.trim() || undefined,
    });
  }

  function onPickHospital(h: Hospital) {
    setHospital(h);
    setDepartmentId(null);
    setDoctorId(null);
    setStep('department');
  }

  function onPickDepartment(id: string) {
    setDepartmentId(id);
    setDoctorId(null);
    setStep('schedule');
  }

  function onContinueToDoctor() {
    if (selectedHour === null) return;
    setStep('doctor');
  }

  function onBack() {
    if (step === 'doctor') return setStep('schedule');
    if (step === 'schedule') return setStep('department');
    if (step === 'department' && !preselectedId) return setStep('hospital');
    router.back();
  }

  const headerSubtitle =
    step === 'hospital'
      ? t('booking.step1of4')
      : step === 'department'
        ? t('booking.step2of4')
        : step === 'schedule'
          ? t('booking.step3of4')
          : t('booking.step4of4');

  const headerTitle =
    step === 'hospital'
      ? t('booking.nearbyHospitals')
      : step === 'department'
        ? t('booking.selectDepartment')
        : step === 'schedule'
          ? t('booking.selectTime')
          : t('booking.selectDoctor');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <GradientHeader
        showBack
        subtitle={headerSubtitle}
        title={headerTitle}
        right={
          <Pressable onPress={onBack} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="close" size={20} color={colors.text.inverse} />
          </Pressable>
        }
      />

      <View style={styles.body}>
        {step === 'hospital' ? (
          <View style={{ gap: spacing.md }}>
            {isLoading && hospitals.length === 0 ? (
              <Card variant="outline">
                <Text style={styles.muted}>{t('common.loading')}</Text>
              </Card>
            ) : null}
            {hospitals.map((h) => (
              <Card key={h.id} onPress={() => onPickHospital(h)}>
                <View style={styles.row}>
                  <View style={styles.bubbleTeal}>
                    <Ionicons
                      name="business"
                      size={18}
                      color={colors.tint.teal.fg}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {locale === 'ar' ? h.nameAr : h.nameEn}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {localizeCity(h.city, locale === 'ar')}
                      {typeof h.distanceKm === 'number'
                        ? ` · ${h.distanceKm.toFixed(1)} km`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.text.muted}
                  />
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {step === 'department' && hospital ? (
          <View style={{ gap: spacing.md }}>
            <Card>
              <View style={styles.row}>
                <View style={styles.bubbleTeal}>
                  <Ionicons
                    name="business"
                    size={18}
                    color={colors.tint.teal.fg}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {locale === 'ar' ? hospital.nameAr : hospital.nameEn}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {localizeCity(hospital.city, locale === 'ar')}
                  </Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionLabel}>
              {t('booking.selectDepartment')}
            </Text>
            <View style={styles.deptGrid}>
              {hospital.departments.map((d) => {
                const isErDept = d.code === 'ER';
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => onPickDepartment(d.id)}
                    style={({ pressed }) => [
                      styles.deptChip,
                      isErDept && styles.deptChipEr,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deptText,
                        isErDept && { color: colors.emergency.base },
                      ]}
                      numberOfLines={2}
                    >
                      {locale === 'ar' ? d.nameAr : d.nameEn}
                    </Text>
                    {isErDept ? (
                      <View style={styles.erBadge}>
                        <Text style={styles.erBadgeText}>
                          {t('booking.open24h')}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 'schedule' && hospital && selectedDepartment ? (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                {locale === 'ar' ? hospital.nameAr : hospital.nameEn}
              </Text>
              <Text style={styles.summaryMeta} numberOfLines={1}>
                {locale === 'ar'
                  ? selectedDepartment.nameAr
                  : selectedDepartment.nameEn}
                {isER ? ` · ${t('booking.open24h')}` : ''}
              </Text>
              <Text style={styles.summaryWhen}>
                {scheduledAt.toLocaleString(
                  locale === 'ar' ? 'ar-JO' : 'en-GB',
                  {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                )}
              </Text>
            </Card>

            <View>
              <Text style={styles.sectionLabel}>
                {t('booking.chooseDay')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {days.map((d) => {
                  const selected = isSameDay(d, selectedDay);
                  return (
                    <Pressable
                      key={d.toISOString()}
                      onPress={() => setSelectedDay(d)}
                      style={[
                        styles.dayChip,
                        selected && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayChipTop,
                          selected && styles.chipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {dayLabel(d)}
                      </Text>
                      <Text
                        style={[
                          styles.dayChipBottom,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View>
              <Text style={styles.sectionLabel}>
                {t('booking.chooseTime')}
              </Text>
              {hourSlots.length === 0 ? (
                <Card variant="outline">
                  <Text style={styles.muted}>
                    {t('booking.noSlotsToday')}
                  </Text>
                </Card>
              ) : (
                <View style={styles.timeGrid}>
                  {hourSlots.map((h) => {
                    const selected = h === selectedHour;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => setSelectedHour(h)}
                        style={[
                          styles.timeChip,
                          selected && styles.chipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {`${String(h).padStart(2, '0')}:00`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <TextField
              label={t('booking.reason')}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <GradientButton
              label={t('booking.continueToDoctor')}
              onPress={onContinueToDoctor}
              disabled={selectedHour === null}
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => setStep('department')}
            />
          </View>
        ) : null}

        {step === 'doctor' && hospital && selectedDepartment ? (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                {locale === 'ar' ? hospital.nameAr : hospital.nameEn}
              </Text>
              <Text style={styles.summaryMeta} numberOfLines={1}>
                {locale === 'ar'
                  ? selectedDepartment.nameAr
                  : selectedDepartment.nameEn}
              </Text>
              <Text style={styles.summaryWhen}>
                {scheduledAt.toLocaleString(
                  locale === 'ar' ? 'ar-JO' : 'en-GB',
                  {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                )}
              </Text>
            </Card>

            <Text style={styles.sectionLabel}>{t('booking.selectDoctor')}</Text>

            <Pressable
              onPress={() => setDoctorId(null)}
              style={[
                styles.doctorCard,
                doctorId === null && styles.doctorCardSelected,
              ]}
            >
              <View style={styles.bubbleTeal}>
                <Ionicons
                  name="people"
                  size={18}
                  color={colors.tint.teal.fg}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{t('booking.anyDoctor')}</Text>
                <Text style={styles.itemMeta}>
                  {t('booking.anyDoctorHint')}
                </Text>
              </View>
              {doctorId === null ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.brand.primary}
                />
              ) : null}
            </Pressable>

            {doctorsQuery.isLoading ? (
              <Card variant="outline">
                <Text style={styles.muted}>{t('common.loading')}</Text>
              </Card>
            ) : null}

            {doctorsQuery.isError ? (
              <Card variant="outline">
                <Text style={styles.muted}>
                  {apiErrorMessage(doctorsQuery.error, t('common.error'))}
                </Text>
              </Card>
            ) : null}

            {(doctorsQuery.data ?? []).map((d: BookableDoctor) => {
              const selected = doctorId === d.id;
              const name = d.user.fullName ?? d.user.email;
              const specialty =
                (locale === 'ar' && d.specialtyAr) || d.specialty;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setDoctorId(d.id)}
                  style={[
                    styles.doctorCard,
                    selected && styles.doctorCardSelected,
                    !d.isAvailable && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.avatarWrap}>
                    <View style={styles.bubbleTeal}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={colors.tint.teal.fg}
                      />
                    </View>
                    <View
                      style={[
                        styles.presenceDot,
                        {
                          backgroundColor: d.isAvailable
                            ? colors.status.success
                            : colors.text.muted,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.doctorSpecialty} numberOfLines={1}>
                      {specialty}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {d.isAvailable
                        ? t('booking.doctorAvailable')
                        : t('booking.doctorUnavailable')}
                      {typeof d.rating === 'number'
                        ? ` · ⭐ ${d.rating.toFixed(1)}`
                        : ''}
                      {typeof d.yearsExperience === 'number'
                        ? ` · ${d.yearsExperience}y`
                        : ''}
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.brand.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}

            <GradientButton
              label={t('booking.confirm')}
              onPress={onConfirm}
              loading={bookMutation.isPending}
            />
            <Button
              label={t('booking.backToTime')}
              variant="ghost"
              onPress={() => setStep('schedule')}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bubbleTeal: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.tint.teal.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  itemMeta: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  muted: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
  },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  deptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  deptChip: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
    alignItems: 'center',
    gap: spacing.xs,
  },
  deptChipEr: {
    borderColor: colors.emergency.base,
    backgroundColor: colors.tint.red.bg,
  },
  deptText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    textAlign: 'center',
  },
  erBadge: {
    backgroundColor: colors.emergency.base,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  erBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  summaryLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  summaryMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  summaryWhen: {
    fontSize: typography.size.sm,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dayChip: {
    minWidth: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
    alignItems: 'center',
    gap: 2,
  },
  dayChipTop: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  dayChipBottom: {
    fontSize: typography.size.lg,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
  },
  timeChipText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  chipSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  chipTextSelected: {
    color: colors.text.inverse,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
  },
  doctorCardSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.tint.teal.bg,
  },
  doctorSpecialty: {
    fontSize: typography.size.xs,
    color: colors.brand.primary,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  avatarWrap: {
    position: 'relative',
  },
  presenceDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface.base,
    bottom: -1,
    right: -1,
  },
}), [colors]);
}
