import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, spacing, typography, useTheme } from '@theme/index';

type Size = 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  onPress: () => void;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: Size;
  fullWidth?: boolean;
}

export function GradientButton({
  label,
  onPress,
  loading,
  disabled,
  leftIcon,
  rightIcon,
  size = 'lg',
  fullWidth = true,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        fullWidth && { alignSelf: 'stretch' },
        pressed && !isDisabled && { opacity: 0.92 },
        isDisabled && { opacity: 0.5 },
      ]}
      {...rest}
    >
      <LinearGradient
        colors={[...colors.brand.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, size === 'md' ? styles.md : styles.lg]}
      >
        {loading ? (
          <ActivityIndicator color={colors.brand.on} />
        ) : (
          <View style={styles.content}>
            {leftIcon}
            <Text style={[styles.label, { color: colors.brand.on }]}>{label}</Text>
            {rightIcon}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { height: 44 },
  lg: { height: 52 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
