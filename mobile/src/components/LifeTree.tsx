import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { TreeStage } from '@services/quitSmoking';
import { useTheme } from '@theme/index';

export interface LifeTreeProps {
  stage: TreeStage;
  /** Visually mark recent slip(s) — falling leaves, slight droop. */
  hasRecentSlip?: boolean;
  /** Outer size in points. Defaults to 240. */
  size?: number;
}

export function LifeTree({
  stage,
  hasRecentSlip = false,
  size = 240,
}: LifeTreeProps) {
  const { colors } = useTheme();
  const sway = useRef(new Animated.Value(0)).current;

  // Subtle continuous sway — life-like without being distracting. Using
  // native driver for transforms keeps it 60fps on low-end devices.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sway]);

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1.5deg', '1.5deg'],
  });

  const palette = useMemo(() => {
    const trunk = colors.text.secondary;
    const leafBase = colors.tint.green.fg;
    const leafSoft = colors.tint.green.bg;
    const sky = colors.tint.teal.bg;
    const ground = colors.tint.yellow.bg;
    const droop = colors.tint.yellow.fg;
    return { trunk, leafBase, leafSoft, sky, ground, droop };
  }, [colors]);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background SVG (sky + ground) — anchored, doesn't move. */}
      <Svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{ position: 'absolute' }}
      >
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.sky} stopOpacity="0.85" />
            <Stop offset="1" stopColor={palette.ground} stopOpacity="0.55" />
          </LinearGradient>
        </Defs>
        <Circle cx="100" cy="100" r="98" fill="url(#sky)" opacity={0.55} />
        <Path
          d="M0 150 Q100 130 200 150 L200 200 L0 200 Z"
          fill={palette.ground}
          opacity={0.9}
        />
      </Svg>
      {/* Plant SVG — wrapped in Animated.View so the whole tree gently
          sways. Native driver keeps it 60fps even on low-end devices. */}
      <Animated.View
        pointerEvents="none"
        style={{
          width: size,
          height: size,
          transform: [{ rotate }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <LinearGradient id="leaf" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.leafBase} stopOpacity="1" />
              <Stop offset="1" stopColor={palette.leafBase} stopOpacity="0.65" />
            </LinearGradient>
          </Defs>
          <G>
            <StagePlant
              stage={stage}
              palette={palette}
              wilted={hasRecentSlip}
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

interface StagePlantProps {
  stage: TreeStage;
  palette: {
    trunk: string;
    leafBase: string;
    leafSoft: string;
    droop: string;
  };
  wilted: boolean;
}

function StagePlant({ stage, palette, wilted }: StagePlantProps) {
  const leafFill = wilted ? palette.droop : 'url(#leaf)';
  const leafSoft = wilted ? palette.droop : palette.leafSoft;

  if (stage === 'seed') {
    // Just the dirt mound + a tiny seed peeking out.
    return (
      <G>
        <Path
          d="M85 152 Q100 145 115 152 L113 158 Q100 154 87 158 Z"
          fill={palette.trunk}
          opacity={0.55}
        />
        <Circle cx="100" cy="148" r="3" fill={palette.leafBase} />
      </G>
    );
  }

  if (stage === 'sprout') {
    return (
      <G>
        <Rect x="98" y="138" width="4" height="14" rx="2" fill={palette.trunk} />
        <Path
          d="M100 138 Q92 130 88 134 Q92 142 100 142 Z"
          fill={leafFill}
        />
        <Path
          d="M100 138 Q108 130 112 134 Q108 142 100 142 Z"
          fill={leafFill}
        />
      </G>
    );
  }

  if (stage === 'plant') {
    return (
      <G>
        <Path
          d="M99 152 Q98 130 100 110 Q102 130 101 152 Z"
          fill={palette.trunk}
        />
        <Circle cx="100" cy="115" r="14" fill={leafFill} />
        <Circle cx="89" cy="122" r="9" fill={leafFill} opacity={0.95} />
        <Circle cx="111" cy="122" r="9" fill={leafFill} opacity={0.95} />
        <Circle cx="100" cy="105" r="7" fill={leafSoft} opacity={0.6} />
      </G>
    );
  }

  if (stage === 'young') {
    return (
      <G>
        {/* Trunk */}
        <Path
          d="M96 152 L96 100 Q98 88 100 88 Q102 88 104 100 L104 152 Z"
          fill={palette.trunk}
        />
        {/* Two side branches */}
        <Path
          d="M100 110 Q86 102 78 108"
          stroke={palette.trunk}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M100 105 Q116 97 124 102"
          stroke={palette.trunk}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* Canopy */}
        <Circle cx="100" cy="86" r="22" fill={leafFill} />
        <Circle cx="80" cy="100" r="13" fill={leafFill} opacity={0.95} />
        <Circle cx="120" cy="98" r="13" fill={leafFill} opacity={0.95} />
        <Circle cx="92" cy="74" r="9" fill={leafSoft} opacity={0.55} />
        {wilted ? (
          <>
            <Circle cx="76" cy="120" r="2.5" fill={palette.droop} />
            <Circle cx="124" cy="124" r="2" fill={palette.droop} />
          </>
        ) : null}
      </G>
    );
  }

  // Full tree
  return (
    <G>
      {/* Trunk with subtle taper */}
      <Path
        d="M93 152 L93 92 Q97 78 100 78 Q103 78 107 92 L107 152 Z"
        fill={palette.trunk}
      />
      {/* Branches */}
      <Path
        d="M100 100 Q80 90 68 96"
        stroke={palette.trunk}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M100 95 Q120 84 132 90"
        stroke={palette.trunk}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M100 110 Q90 122 84 128"
        stroke={palette.trunk}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Canopy clusters */}
      <Circle cx="100" cy="74" r="28" fill={leafFill} />
      <Circle cx="70" cy="92" r="18" fill={leafFill} opacity={0.96} />
      <Circle cx="130" cy="90" r="18" fill={leafFill} opacity={0.96} />
      <Circle cx="84" cy="64" r="14" fill={leafSoft} opacity={0.65} />
      <Circle cx="118" cy="62" r="13" fill={leafSoft} opacity={0.65} />
      {/* A bloom — small reward for reaching full stage */}
      {!wilted ? (
        <>
          <Circle cx="100" cy="60" r="3.5" fill={palette.droop} />
          <Circle cx="96" cy="58" r="2" fill={palette.droop} opacity={0.85} />
          <Circle cx="104" cy="58" r="2" fill={palette.droop} opacity={0.85} />
        </>
      ) : null}
      {wilted ? (
        <>
          <Circle cx="64" cy="118" r="2.5" fill={palette.droop} />
          <Circle cx="78" cy="130" r="2" fill={palette.droop} opacity={0.8} />
          <Circle cx="138" cy="120" r="2.5" fill={palette.droop} />
          <Circle cx="124" cy="132" r="2" fill={palette.droop} opacity={0.8} />
        </>
      ) : null}
    </G>
  );
}
