import { forwardRef, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, useTheme } from '@theme/index';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, style, editable = true, secureTextEntry, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const readOnly = editable === false;
  const [revealed, setRevealed] = useState(false);
  const isSecureField = !!secureTextEntry;
  const effectivelySecure = isSecureField && !revealed;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { gap: spacing.xs, width: '100%' },
        label: {
          fontSize: typography.size.sm,
          fontWeight: typography.weight.medium,
          color: colors.text.secondary,
        },
        input: {
          height: 52,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.surface.border,
          backgroundColor: colors.surface.base,
          paddingHorizontal: spacing.lg,
          fontSize: typography.size.md,
          color: colors.text.primary,
          textAlign: 'auto',
        },
        inputWithToggle: { paddingRight: spacing.xxxl },
        inputReadOnly: {
          backgroundColor: colors.surface.sunken,
          color: colors.text.secondary,
          borderColor: colors.surface.sunken,
        },
        inputError: { borderColor: colors.status.error },
        error: { fontSize: typography.size.sm, color: colors.status.error },
        toggle: {
          position: 'absolute',
          right: spacing.md,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View>
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={colors.text.muted}
          secureTextEntry={effectivelySecure}
          autoCorrect={isSecureField ? false : rest.autoCorrect}
          autoCapitalize={isSecureField ? 'none' : rest.autoCapitalize}
          style={[
            styles.input,
            isSecureField && styles.inputWithToggle,
            readOnly && styles.inputReadOnly,
            error && styles.inputError,
            style,
          ]}
          {...rest}
        />
        {isSecureField ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});
