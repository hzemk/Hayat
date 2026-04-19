import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, Tint, useTheme } from '@theme/index';

interface Props {
  label: string;
  tint?: Tint;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
}

export function InfoChip({ label, tint = 'gray', icon, size = 'md' }: Props) {
  const { colors } = useTheme();
  const palette = colors.tint[tint];
  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: palette.bg },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 10 : 12}
          color={palette.fg}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          size === 'sm' ? styles.labelSm : styles.labelMd,
          { color: palette.fg },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    gap: 4,
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    gap: 6,
  },
  label: {
    fontWeight: typography.weight.semibold,
  },
  labelSm: { fontSize: 10 },
  labelMd: { fontSize: typography.size.xs },
});

export type { Tint };
