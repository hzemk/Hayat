import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientHeader } from '@components/GradientHeader';
import { ListItem } from '@components/ListItem';
import { SectionContainer } from '@components/SectionContainer';
import { spacing, useTheme } from '@theme/index';

export default function MoreScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.raised }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <GradientHeader
        title={t('more.title') || 'More'}
        subtitle={t('more.subtitle') || 'Everything else in Hayat'}
      />

      <View style={styles.body}>
        <SectionContainer title={t('more.health') || 'Your health'} gap="sm">
          <ListItem
            icon="medkit-outline"
            tint="teal"
            title={t('prescriptions.title') || 'Prescriptions'}
            subtitle={
              t('more.prescriptionsHint') || 'View and scan prescriptions'
            }
            onPress={() => router.push('/prescriptions')}
            chevron
          />
          <ListItem
            icon="shield-checkmark-outline"
            tint="green"
            title={t('vaccines.title') || 'Vaccines'}
            subtitle={
              t('more.vaccinesHint') || 'Immunization record & travel passport'
            }
            onPress={() => router.push('/vaccines')}
            chevron
          />
          <ListItem
            icon="pulse-outline"
            tint="blue"
            title={t('more.aiTitle') || 'Symptom checker'}
            subtitle={
              t('more.aiHint') || 'Chat with our AI about how you feel'
            }
            onPress={() => router.push('/chat')}
            chevron
          />
          <ListItem
            icon="card-outline"
            tint="purple"
            title={t('more.insuranceTitle') || 'Health insurance'}
            subtitle={
              t('more.insuranceHint') || 'Your insurance card and coverage'
            }
            onPress={() => router.push('/insurance-card')}
            chevron
          />
          <ListItem
            icon="leaf-outline"
            tint="green"
            title={t('quit.title', { defaultValue: 'Life Tree' })}
            subtitle={t('more.quitHint', {
              defaultValue: 'Quit smoking & grow your tree',
            })}
            onPress={() => router.push('/quit-smoking' as never)}
            chevron
          />
        </SectionContainer>

        <SectionContainer title={t('more.care') || 'Care & people'} gap="sm">
          <ListItem
            icon="business-outline"
            tint="blue"
            title={t('hospitals.title') || 'Hospitals'}
            subtitle={t('more.hospitalsHint') || 'Find and book nearby'}
            onPress={() => router.push('/(tabs)/hospitals')}
            chevron
          />
          <ListItem
            icon="people-outline"
            tint="rose"
            title={t('family.title') || 'Family'}
            subtitle={t('more.familyHint') || 'Manage children & dependents'}
            onPress={() => router.push('/family')}
            chevron
          />
        </SectionContainer>

        <SectionContainer title={t('more.safety') || 'Safety'} gap="sm">
          <ListItem
            icon="card-outline"
            tint="yellow"
            title={t('more.emergencyIdTitle') || 'Emergency ID'}
            subtitle={
              t('more.emergencyIdHint') ||
              'Quick-view medical card for first responders'
            }
            onPress={() => router.push('/emergency-id')}
            chevron
          />
          <ListItem
            icon="warning-outline"
            tint="red"
            title={t('emergency.title') || 'Emergency'}
            subtitle={t('more.sosHint') || 'Send SOS with your location'}
            onPress={() => router.push('/emergency')}
            chevron
          />
          <ListItem
            icon="call-outline"
            tint="rose"
            title={t('more.sosContactsTitle') || 'SOS contacts'}
            subtitle={
              t('more.sosContactsHint') ||
              'People we alert on WhatsApp in an emergency'
            }
            onPress={() => router.push('/sos-contacts')}
            chevron
          />
        </SectionContainer>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
});
