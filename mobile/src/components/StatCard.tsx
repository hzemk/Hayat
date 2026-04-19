import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppColors,
  radius,
  shadow,
  spacing,
  typography,
  Tint,
  useTheme,
} from '@theme/index';

interface Props {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: Tint;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  tint = 'teal',
  onPress,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const palette = colors.tint[tint];
  const content = (
    <View style={styles.card}>
      {icon ? (
        <View style={[styles.iconBubble, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={20} color={palette.fg} />
        </View>
      ) : null}
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.wrap}>{content}</View>;
}

function useStyles(colors: AppColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: { flex: 1 },
        card: {
          backgroundColor: colors.surface.base,
          borderRadius: radius.xxl,
          padding: spacing.lg,
          gap: spacing.xs,
          ...shadow.soft,
        },
        iconBubble: {
          width: 36,
          height: 36,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        },
        value: {
          fontSize: typography.size.xxl,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        label: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
        },
      }),
    [colors],
  );
}
