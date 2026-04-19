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
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@components/GradientHeader';
import { SectionContainer } from '@components/SectionContainer';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { GradientButton } from '@components/GradientButton';
import {
  createSosContact,
  deleteSosContact,
  listSosContacts,
  SosContact,
  updateSosContact,
} from '@services/api/sosContacts.api';
import { apiErrorMessage } from '@services/api/errors';
import { AppColors, radius, shadow, spacing, typography, useTheme } from '@theme/index';

const PHONE_RE = /^\+?[0-9 \-]{6,20}$/;

interface FormState {
  id?: string;
  name: string;
  phoneNumber: string;
  relationship: string;
}

const emptyForm: FormState = { name: '', phoneNumber: '', relationship: '' };

export default function SosContactsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const { data, isLoading } = useQuery({
    queryKey: ['sos-contacts'],
    queryFn: listSosContacts,
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const isEditing = Boolean(form.id);

  const save = useMutation({
    mutationFn: async (payload: FormState) => {
      if (payload.id) {
        return updateSosContact(payload.id, {
          name: payload.name.trim(),
          phoneNumber: payload.phoneNumber.trim(),
          relationship: payload.relationship.trim() || undefined,
        });
      }
      return createSosContact({
        name: payload.name.trim(),
        phoneNumber: payload.phoneNumber.trim(),
        relationship: payload.relationship.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sos-contacts'] });
      setForm(emptyForm);
    },
    onError: (err) => {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('common.error')));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSosContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sos-contacts'] });
    },
  });

  function submit() {
    if (!form.name.trim()) {
      Alert.alert(t('common.error'), t('sosContacts.errors.nameRequired'));
      return;
    }
    if (!PHONE_RE.test(form.phoneNumber.trim())) {
      Alert.alert(t('common.error'), t('sosContacts.errors.phoneInvalid'));
      return;
    }
    save.mutate(form);
  }

  function startEdit(c: SosContact) {
    setForm({
      id: c.id,
      name: c.name,
      phoneNumber: c.phoneNumber,
      relationship: c.relationship ?? '',
    });
  }

  function confirmDelete(c: SosContact) {
    Alert.alert(t('common.delete'), c.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => remove.mutate(c.id),
      },
    ]);
  }

  const contacts = useMemo(() => data ?? [], [data]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GradientHeader
          showBack
          title={t('sosContacts.title')}
          subtitle={t('sosContacts.subtitle')}
        />

        <View style={styles.body}>
          <SectionContainer title={t('sosContacts.yourContacts')}>
            {isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.brand.primary} />
              </View>
            ) : contacts.length === 0 ? (
              <Card>
                <View style={styles.empty}>
                  <Ionicons
                    name="people-outline"
                    size={32}
                    color={colors.text.muted}
                  />
                  <Text style={styles.emptyText}>
                    {t('sosContacts.empty')}
                  </Text>
                </View>
              </Card>
            ) : (
              contacts.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onEdit={() => startEdit(c)}
                  onDelete={() => confirmDelete(c)}
                />
              ))
            )}
          </SectionContainer>

          <SectionContainer
            title={
              isEditing
                ? t('sosContacts.editContact')
                : t('sosContacts.addContact')
            }
          >
            <Card>
              <View style={{ gap: spacing.md }}>
                <TextField
                  label={t('sosContacts.name')}
                  value={form.name}
                  onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                  placeholder={t('sosContacts.namePlaceholder')}
                />
                <TextField
                  label={t('sosContacts.phone')}
                  value={form.phoneNumber}
                  onChangeText={(phoneNumber) =>
                    setForm((f) => ({ ...f, phoneNumber }))
                  }
                  placeholder="+9627XXXXXXXX"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
                <TextField
                  label={t('sosContacts.relationship')}
                  value={form.relationship}
                  onChangeText={(relationship) =>
                    setForm((f) => ({ ...f, relationship }))
                  }
                  placeholder={t('sosContacts.relationshipPlaceholder')}
                />
                <GradientButton
                  label={
                    isEditing ? t('common.save') : t('sosContacts.addContact')
                  }
                  onPress={submit}
                  loading={save.isPending}
                />
                {isEditing ? (
                  <Pressable
                    onPress={() => setForm(emptyForm)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </SectionContainer>

          <Text style={styles.footer}>{t('sosContacts.footerHint')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ContactRow({
  contact,
  onEdit,
  onDelete,
}: {
  contact: SosContact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={20} color={colors.emergency.base} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {contact.phoneNumber}
          {contact.relationship ? ` · ${contact.relationship}` : ''}
        </Text>
      </View>
      <Pressable onPress={onEdit} style={styles.iconBtn} hitSlop={8}>
        <Ionicons name="pencil" size={18} color={colors.text.secondary} />
      </Pressable>
      <Pressable onPress={onDelete} style={styles.iconBtn} hitSlop={8}>
        <Ionicons name="trash" size={18} color={colors.status.error} />
      </Pressable>
    </View>
  );
}

function useStyles(colors: AppColors) {
  return useMemo(() =>
    StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.base,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.soft,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.red.bg,
  },
  rowName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  rowMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  cancelText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  footer: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
}), [colors]);
}
