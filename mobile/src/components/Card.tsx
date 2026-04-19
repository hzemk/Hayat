import { useMemo } from 'react';
import { Pressable, StyleSheet, View, ViewProps } from 'react-native';
import { radius, shadow, spacing, useTheme } from '@theme/index';

type Variant = 'elevated' | 'outline' | 'flat';

interface Props extends ViewProps {
  onPress?: () => void;
  padding?: keyof typeof spacing;
  variant?: Variant;
}

export function Card({
  children,
  onPress,
  padding = 'lg',
  variant = 'elevated',
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          backgroundColor: colors.surface.base,
          borderRadius: radius.xl,
        },
        elevated: shadow.soft,
        outline: {
          borderWidth: 1,
          borderColor: colors.surface.border,
        },
        flat: {},
      }),
    [colors],
  );

  const variantStyle =
    variant === 'outline'
      ? styles.outline
      : variant === 'flat'
        ? styles.flat
        : styles.elevated;

  const content = (
    <View
      style={[styles.base, variantStyle, { padding: spacing[padding] }, style]}
      {...rest}
    >
      {children}
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
