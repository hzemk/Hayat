import { useEffect, useRef } from 'react';
import { Animated, Easing, useColorScheme } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const ECG_PATH =
  'M 60 120 L 82 120 L 92 98 L 104 146 L 116 82 L 126 120 L 180 120';
const ECG_DASH = 150;
const HEART_PATH =
  'M 120 180 C 80 155, 55 128, 55 98 C 55 78, 72 66, 90 66 C 104 66, 114 74, 120 88 C 126 74, 136 66, 150 66 C 168 66, 185 78, 185 98 C 185 128, 160 155, 120 180 Z';

type Variant = 'light' | 'dark' | 'auto';

type Props = {
  size?: number;
  variant?: Variant;
  showECG?: boolean;
  showGlow?: boolean;
  showStars?: boolean;
  animated?: boolean;
};

export function HayatLogo({
  size = 96,
  variant = 'auto',
  showECG = true,
  showGlow = true,
  showStars = false,
  animated = true,
}: Props) {
  const system = useColorScheme();
  const isDark =
    variant === 'dark' || (variant === 'auto' && system === 'dark');

  const stops = isDark
    ? { a: '#5EEAD4', b: '#22D3EE', c: '#0EA5E9' }
    : { a: '#14B8A6', b: '#06B6D4', c: '#0284C7' };
  const haloColor = isDark ? '#22D3EE' : '#06B6D4';

  const beat = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(ECG_DASH)).current;
  const s1 = useRef(new Animated.Value(0.3)).current;
  const s2 = useRef(new Animated.Value(0.8)).current;
  const s3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!animated) {
      beat.setValue(1);
      halo.setValue(0.5);
      dash.setValue(0);
      return;
    }

    const beatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, {
          toValue: 1.07,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(beat, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(beat, {
          toValue: 1.04,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(beat, {
          toValue: 1,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(880),
      ]),
    );

    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(halo, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );

    const ecgLoop = showECG
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(dash, {
              toValue: ECG_DASH,
              duration: 256,
              useNativeDriver: false,
            }),
            Animated.timing(dash, {
              toValue: 0,
              duration: 1344,
              easing: Easing.linear,
              useNativeDriver: false,
            }),
            Animated.delay(480),
            Animated.timing(dash, {
              toValue: -ECG_DASH,
              duration: 736,
              easing: Easing.linear,
              useNativeDriver: false,
            }),
            Animated.delay(384),
          ]),
        )
      : null;

    const twinkle = (sv: Animated.Value, low: number, high: number, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(sv, {
            toValue: high,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(sv, {
            toValue: low,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      );

    const star1Loop = showStars ? twinkle(s1, 0.2, 1, 1500) : null;
    const star2Loop = showStars ? twinkle(s2, 0.2, 1, 2000) : null;
    const star3Loop = showStars ? twinkle(s3, 0.3, 1, 1750) : null;

    beatLoop.start();
    haloLoop.start();
    ecgLoop?.start();
    star1Loop?.start();
    star2Loop?.start();
    star3Loop?.start();

    return () => {
      beatLoop.stop();
      haloLoop.stop();
      ecgLoop?.stop();
      star1Loop?.stop();
      star2Loop?.stop();
      star3Loop?.stop();
    };
  }, [animated, showECG, showStars, beat, halo, dash, s1, s2, s3]);

  const haloRadius = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [70, 90],
  });
  const haloOpacity = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });
  const ringRadius = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [85, 110],
  });
  const ringOpacity = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <LinearGradient id="hayatMain" x1="20%" y1="10%" x2="80%" y2="90%">
          <Stop offset="0%" stopColor={stops.a} />
          <Stop offset="40%" stopColor={stops.b} />
          <Stop offset="100%" stopColor={stops.c} />
        </LinearGradient>
        <LinearGradient id="hayatShine" x1="30%" y1="0%" x2="30%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={isDark ? 0.35 : 0.4} />
          <Stop offset="50%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id="hayatHalo" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={haloColor} stopOpacity={isDark ? 0.5 : 0.3} />
          <Stop offset="60%" stopColor={haloColor} stopOpacity={isDark ? 0.15 : 0.08} />
          <Stop offset="100%" stopColor={haloColor} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {showStars ? (
        <G>
          <AnimatedCircle cx="60" cy="60" r="1.5" fill={haloColor} opacity={s1} />
          <AnimatedCircle cx="190" cy="50" r="1.2" fill="#FFFFFF" opacity={s2} />
          <AnimatedCircle cx="40" cy="190" r="1.3" fill={haloColor} opacity={s3} />
          <AnimatedCircle cx="200" cy="200" r="1" fill="#FFFFFF" opacity={s1} />
        </G>
      ) : null}

      {showGlow ? (
        <>
          <AnimatedCircle
            cx="120"
            cy="120"
            r={ringRadius}
            opacity={ringOpacity}
            fill="none"
            stroke={haloColor}
            strokeWidth={0.5}
          />
          <AnimatedCircle
            cx="120"
            cy="120"
            r={haloRadius}
            opacity={haloOpacity}
            fill="url(#hayatHalo)"
          />
        </>
      ) : null}

      <AnimatedG scale={beat} originX={120} originY={120}>
        <Path d={HEART_PATH} fill="url(#hayatMain)" />
        <Path d={HEART_PATH} fill="url(#hayatShine)" />
        <Path
          d={HEART_PATH}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={0.4}
        />
      </AnimatedG>

      {showECG ? (
        <>
          <Path
            d={ECG_PATH}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1}
            opacity={0.15}
          />
          <AnimatedPath
            d={ECG_PATH}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={ECG_DASH}
            strokeDashoffset={dash}
          />
        </>
      ) : null}
    </Svg>
  );
}

export function HayatAppIcon({
  size = 96,
  rounded = true,
}: {
  size?: number;
  rounded?: boolean;
}) {
  const r = rounded ? 27 : 0;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="hayatIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#14B8A6" />
          <Stop offset="50%" stopColor="#06B6D4" />
          <Stop offset="100%" stopColor="#0284C7" />
        </LinearGradient>
      </Defs>
      <Path
        d={`M 0 ${r} Q 0 0 ${r} 0 L ${120 - r} 0 Q 120 0 120 ${r} L 120 ${120 - r} Q 120 120 ${120 - r} 120 L ${r} 120 Q 0 120 0 ${120 - r} Z`}
        fill="url(#hayatIconBg)"
      />
      <Path
        d="M 60 90 C 40 78, 28 66, 28 52 C 28 42, 36 36, 44 36 C 51 36, 56 40, 60 47 C 64 40, 69 36, 76 36 C 84 36, 92 42, 92 52 C 92 66, 80 78, 60 90 Z"
        fill="#FFFFFF"
      />
      <Path
        d="M 32 63 L 44 63 L 50 52 L 56 78 L 62 46 L 68 63 L 88 63"
        fill="none"
        stroke="#0F766E"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
