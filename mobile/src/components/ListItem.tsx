import { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadow, spacing, typography, useTheme, type Tint } from '@theme/index';

interface Props {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: Tint;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
}

export function ListItem({
  title,
  subtitle,
  icon,
  tint = 'teal',
  trailing,
  onPress,
  chevron,
  danger,
}: Props) {
  const { colors } = useTheme();
  const palette = danger ? colors.tint.red : colors.tint[tint];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: colors.surface.base,
          borderRadius: radius.xl,
          padding: spacing.md,
          ...shadow.soft,
        },
        iconBubble: {
          width: 40,
          height: 40,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          fontSize: typography.size.md,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
        },
        subtitle: {
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: 2,
        },
      }),
    [colors],
  );

  const content = (
    <View style={styles.card}>
      {icon ? (
        <View style={[styles.iconBubble, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={18} color={palette.fg} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.title, danger && { color: colors.status.error }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
