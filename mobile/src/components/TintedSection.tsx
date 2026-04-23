import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, Tint, useTheme } from '@theme/index';

interface Props {
  title: string;
  tint: Tint;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  style?: ViewStyle;
}

export function TintedSection({ title, tint, icon, children, style }: Props) {
  const { colors } = useTheme();
  const palette = colors.tint[tint];
  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg }, style]}>
      <View style={styles.header}>
        {icon ? (
          <View style={[styles.iconBubble, { backgroundColor: palette.fg }]}>
            <Ionicons name={icon} size={16} color={colors.brand.on} />
          </View>
        ) : null}
        <Text
          style={[styles.title, { color: palette.fg }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
});
