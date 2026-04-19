import { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { spacing, typography, useTheme } from '@theme/index';

interface Props {
  title?: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  style?: ViewStyle;
  gap?: keyof typeof spacing;
}

export function SectionContainer({
  title,
  action,
  children,
  style,
  gap = 'sm',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: spacing.md },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing.sm,
        },
        title: {
          flex: 1,
          flexShrink: 1,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
        },
        action: {
          color: colors.brand.primary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.wrap, style]}>
      {title || action ? (
        <View style={styles.header}>
          {title ? (
            <Text
              style={styles.title}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={8}>
              <Text style={styles.action}>{action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: spacing[gap] }}>{children}</View>
    </View>
  );
}
