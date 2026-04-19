import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, typography, useTheme } from '@theme/index';

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
  children?: ReactNode;
  size?: 'md' | 'lg';
}

export function GradientHeader({
  title,
  subtitle,
  showBack,
  right,
  children,
  size = 'md',
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (size === 'lg' ? spacing.md : spacing.sm);
  const bottomPad = size === 'lg' ? spacing.xxxl : spacing.xxl + spacing.lg;

  return (
    <LinearGradient
      colors={[...colors.brand.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: topPad, paddingBottom: bottomPad }]}
    >
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <View style={{ flex: 1 }}>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {title ? (
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {title}
            </Text>
          ) : null}
        </View>
        {right ?? <View style={{ width: 32 }} />}
      </View>
      {children ? <View style={{ marginTop: spacing.lg }}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.sm,
  },
  title: {
    color: '#FFFFFF',
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
  },
});
