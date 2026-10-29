/**
 * Small, kitchen-flavoured motion: things rise onto the counter, bowls pop
 * when filled, the chef bobs while waiting, a pan sizzles while working, and
 * steam drifts off a pot. Everything holds still when the person has asked
 * for reduced motion.
 */
import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduced;
}

/** Fade and lift into place on mount; `index` staggers a list. */
export function Rise({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { t.setValue(1); return; }
    Animated.timing(t, {
      toValue: 1,
      duration: 360,
      delay: Math.min(index, 8) * 55,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: native,
    }).start();
  }, [reduced, index, t]);
  return (
    <Animated.View
      style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** A quick springy pop whenever `trigger` changes (e.g. a bowl being ticked). */
export function Pop({ trigger, children, style }: { trigger: unknown; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced) return;
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: native }).start();
  }, [trigger, reduced, scale]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

function useLoop(make: (v: Animated.Value) => Animated.CompositeAnimation, active = true) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || !active) { v.setValue(0); return; }
    const anim = Animated.loop(make(v));
    anim.start();
    return () => anim.stop();
    // `make` is an inline recipe for the loop; restarting on every render would reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, active]);
  return v;
}

/** The chef's idle bob: up and down, a little tilt. */
export function Bob({ children, style, active = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; active?: boolean }) {
  const v = useLoop((x) => Animated.sequence([
    Animated.timing(x, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    Animated.timing(x, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
  ]), active);
  return (
    <Animated.View style={[style, { transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
      { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
    ] }]}>
      {children}
    </Animated.View>
  );
}

/** A pan on the heat: a quick back-and-forth shake while `active`. */
export function Sizzle({ children, style, active = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; active?: boolean }) {
  const v = useLoop((x) => Animated.sequence([
    Animated.timing(x, { toValue: 1, duration: 90, useNativeDriver: native }),
    Animated.timing(x, { toValue: -1, duration: 180, useNativeDriver: native }),
    Animated.timing(x, { toValue: 0, duration: 90, useNativeDriver: native }),
    Animated.delay(260),
  ]), active);
  return (
    <Animated.View style={[style, { transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Three wisps of steam rising and fading, for something hot. */
export function Steam({ color, size = 60, style }: { color: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: size * 0.18, height: size }, style]} pointerEvents="none">
      {[0, 1, 2].map((i) => <Wisp key={i} delay={i * 420} color={color} height={size * (i === 1 ? 1 : 0.8)} />)}
    </Animated.View>
  );
}

function Wisp({ delay, color, height }: { delay: number; color: string; height: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [delay, v]);
  return (
    <Animated.View
      style={{
        width: 6,
        height,
        borderRadius: 3,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.75, 0.4, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.5, -height * 0.4] }) },
          { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          { rotate: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-8deg', '8deg', '-6deg'] }) },
        ],
      }}
    />
  );
}

/** Springs a little rotation and lift on while `active`, and back off after. */
export function Nudge({ active, children, style }: { active: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.spring(v, { toValue: active ? 1 : 0, friction: 5, tension: 160, useNativeDriver: native }).start();
  }, [active, reduced, v]);
  return (
    <Animated.View style={[style, { transform: [
      ...((StyleSheetFlatten(style)?.transform as any[]) ?? []),
      { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-9deg'] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
    ] }]}>
      {children}
    </Animated.View>
  );
}

function StyleSheetFlatten(style: StyleProp<ViewStyle>): ViewStyle | undefined {
  return StyleSheet.flatten(style) as ViewStyle | undefined;
}

/** A whole screen easing in: a short fade with a small lift. */
export function FadeIn({ children, style, duration = 260 }: { children: ReactNode; style?: StyleProp<ViewStyle>; duration?: number }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { t.setValue(1); return; }
    Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [reduced, duration, t]);
  return (
    <Animated.View style={[{ flex: 1 }, style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Web-only CSS transitions so colour, border and shadow changes ease instead
 * of snapping (selected chips, focused fields, tabs). Native ignores it.
 */
export const easeColors = (Platform.OS === 'web'
  ? { transitionProperty: 'background-color, border-color, box-shadow, color, opacity, transform', transitionDuration: '180ms', transitionTimingFunction: 'ease-out' }
  : {}) as ViewStyle;
