import { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadow, spacing, layout, useTheme } from '@theme/index';

const BUTTON_SIZE = 58;
const TAP_SLOP = 6;

interface Props {
  bottomOffset?: number;
}

export function FloatingChatButton({ bottomOffset }: Props) {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const baseBottom = bottomOffset ?? layout.tabBar + spacing.md;
  const initialX = isRTL
    ? spacing.lg
    : width - BUTTON_SIZE - spacing.lg;
  const initialY = height - baseBottom - BUTTON_SIZE - insets.bottom;

  const position = useRef(
    new Animated.ValueXY({ x: initialX, y: initialY }),
  ).current;
  const lastPos = useRef({ x: initialX, y: initialY });
  const [dragging, setDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > TAP_SLOP || Math.abs(gesture.dy) > TAP_SLOP,
      onPanResponderGrant: () => {
        position.setOffset({ x: lastPos.current.x, y: lastPos.current.y });
        position.setValue({ x: 0, y: 0 });
        setDragging(false);
      },
      onPanResponderMove: (_, gesture) => {
        if (
          Math.abs(gesture.dx) > TAP_SLOP ||
          Math.abs(gesture.dy) > TAP_SLOP
        ) {
          setDragging(true);
        }
        Animated.event(
          [null, { dx: position.x, dy: position.y }],
          { useNativeDriver: false },
        )(_, gesture);
      },
      onPanResponderRelease: (_, gesture) => {
        position.flattenOffset();
        const moved =
          Math.abs(gesture.dx) > TAP_SLOP || Math.abs(gesture.dy) > TAP_SLOP;

        const maxX = width - BUTTON_SIZE - spacing.sm;
        const maxY = height - BUTTON_SIZE - insets.bottom - spacing.sm;
        const minX = spacing.sm;
        const minY = insets.top + spacing.sm;

        const nextX = Math.min(maxX, Math.max(minX, lastPos.current.x + gesture.dx));
        const nextY = Math.min(maxY, Math.max(minY, lastPos.current.y + gesture.dy));

        lastPos.current = { x: nextX, y: nextY };
        Animated.spring(position, {
          toValue: { x: nextX, y: nextY },
          useNativeDriver: false,
          friction: 7,
        }).start();

        setDragging(false);
        if (!moved) router.push('/chat');
      },
      onPanResponderTerminate: () => {
        position.flattenOffset();
        setDragging(false);
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.anchor,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
          ],
          opacity: dragging ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.shadowWrap}>
        <LinearGradient
          colors={[...colors.brand.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bubble}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={26}
            color={colors.text.inverse}
          />
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 50,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  shadowWrap: {
    borderRadius: radius.pill,
    ...shadow.floating,
  },
  bubble: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
