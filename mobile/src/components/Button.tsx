import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import { AppColors, radius, spacing, typography, useTheme } from '@theme/index';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  fullWidth = true,
  leftIcon,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const variants = buildVariants(colors);
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variants[variant].container,
        pressed && !isDisabled && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variants[variant].text.color as string} />
        ) : (
          <>
            {leftIcon}
            <Text style={[styles.label, variants[variant].text]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
});

function buildVariants(
  colors: AppColors,
): Record<Variant, { container: ViewStyle; text: TextStyle }> {
  return {
    primary: {
      container: { backgroundColor: colors.brand.primary },
      text: { color: colors.text.inverse },
    },
    secondary: {
      container: {
        backgroundColor: colors.surface.base,
        borderWidth: 1,
        borderColor: colors.surface.border,
      },
      text: { color: colors.text.primary },
    },
    danger: {
      container: { backgroundColor: colors.emergency.base },
      text: { color: colors.text.inverse },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: colors.brand.primary },
    },
  };
}
