import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, useTheme } from '@theme/index';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}

export function ScreenContainer({ children, scroll = false, padded = true, style }: Props) {
  const { colors } = useTheme();
  const inner = padded ? <View style={styles.padded}>{children}</View> : children;
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.surface.raised }, style]}
      edges={['top', 'left', 'right']}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  padded: { flex: 1, padding: spacing.lg, gap: spacing.lg },
});
