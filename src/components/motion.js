import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
  UIManager,
  LayoutAnimation,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, MONO, SHADOW } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Snappy but not bouncy — matches the hard-edged look. */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Gentler curve for whole-screen movement. Decelerates the whole way out with
 * no overshoot, which is what makes a page push read as smooth rather than
 * flicked.
 */
export const GLIDE = Easing.bezier(0.32, 0.72, 0, 1);

export const layoutPulse = () =>
  LayoutAnimation.configureNext(
    LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
  );

/* ─────────────────────────────────────────────────────────────
   Screen transition — slides forward on push, back on pop.
   ───────────────────────────────────────────────────────────── */

/**
 * A real page push, not a cross-fade: the arriving screen travels the full
 * width while the one it replaces slides a short way in the same direction and
 * dims underneath it. Going back runs the same motion in reverse.
 *
 * The outgoing screen has to stay mounted for the parallax to exist at all, so
 * the element is held in state and dropped the moment the animation settles.
 */
export function ScreenTransition({ routeKey, depth, children }) {
  const { width } = useWindowDimensions();
  const anim = useRef(new Animated.Value(1)).current;

  const [outgoing, setOutgoing] = useState(null);
  const [dir, setDir] = useState(1);
  const [key, setKey] = useState(routeKey);

  const prevDepth = useRef(depth);
  // Holds the previous render's children: an effect writes it *after* render,
  // so during the render where routeKey changes it still has the old screen.
  const lastChildren = useRef(children);

  const firstRun = useRef(true);

  if (key !== routeKey) {
    const forward = depth >= prevDepth.current;
    prevDepth.current = depth;
    setDir(forward ? 1 : -1);
    setOutgoing(lastChildren.current);
    setKey(routeKey);
    // Rewind here, not in the effect. Effects run *after* paint, so leaving it
    // until then let the incoming screen draw one frame at its final position
    // before snapping off-stage — the flicker at the start of every push.
    anim.setValue(0);
  }

  useEffect(() => {
    lastChildren.current = children;
  });

  useEffect(() => {
    // The very first screen is revealed by the splash wipe; sliding it in as
    // well would be two entrances stacked on top of each other.
    if (firstRun.current) {
      firstRun.current = false;
      anim.setValue(1);
      return undefined;
    }

    const run = Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      easing: GLIDE,
      useNativeDriver: true,
    });
    run.start(({ finished }) => {
      if (finished) setOutgoing(null);
    });
    return () => run.stop();
  }, [key, anim]);

  const enterX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [width * dir, 0],
  });

  // The old screen only travels a quarter as far — that gap between the two
  // speeds is what reads as depth.
  const exitX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width * 0.25 * dir],
  });

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      {outgoing ? (
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
            transform: [{ translateX: exitX }],
          }}
        >
          {outgoing}
        </Animated.View>
      ) : null}

      <Animated.View style={{ flex: 1, transform: [{ translateX: enterX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   Entrance — fade + rise, optionally staggered by index.
   ───────────────────────────────────────────────────────────── */

export function Enter({ index = 0, delay = 0, distance = 14, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 460,
      delay: delay + index * 70,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [anim, delay, index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────
   Blink — a hard on/off toggle. No scaling, no fading: the whole
   point of the mono language is edges, so the last seconds
   invert rather than breathe.
   ───────────────────────────────────────────────────────────── */

export function useBlink(active, period = 500) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!active) {
      setOn(false);
      return undefined;
    }
    setOn(true);
    const id = setInterval(() => setOn((v) => !v), period);
    return () => clearInterval(id);
  }, [active, period]);

  return active && on;
}

/* ─────────────────────────────────────────────────────────────
   Loader — five squares filling in sequence. Reads as a machine
   working rather than a spinner borrowed from another app.
   ───────────────────────────────────────────────────────────── */

export function Loader({ count = 5, size = 9, gap = 5, color = C.ink, dim = C.rule, period = 130 }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (count + 2)), period);
    return () => clearInterval(id);
  }, [count, period]);

  return (
    <View style={{ flexDirection: 'row', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            backgroundColor: i < step ? color : dim,
          }}
        />
      ))}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hold-to-confirm — deliberate friction on ending a session early.
   ───────────────────────────────────────────────────────────── */

export function HoldButton({
  label,
  holdLabel = 'KEEP HOLDING',
  duration = 1600,
  onComplete,
  fill = C.ink,
  ink = C.paper,
  shadow = C.shadow,
  offset = SHADOW,
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const done = useRef(false);

  const start = () => {
    done.current = false;
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished || done.current) return;
      done.current = true;
      setHolding(false);
      progress.setValue(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete();
    });
  };

  const cancel = () => {
    if (done.current) return;
    setHolding(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      easing: EASE,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={{ marginRight: offset, marginBottom: offset }}>
      <View
        style={{
          position: 'absolute',
          left: offset,
          top: offset,
          right: -offset,
          bottom: -offset,
          backgroundColor: shadow,
        }}
      />
      <Pressable
        onPressIn={start}
        onPressOut={cancel}
        style={{
          borderWidth: 2,
          borderColor: C.ink,
          backgroundColor: fill,
          height: 56,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* fill sweeps left to right as you hold */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: ink,
            opacity: 0.22,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1.8,
            color: ink,
            textAlign: 'center',
          }}
        >
          {holding ? holdLabel : label}
        </Text>
      </Pressable>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   Animated progress bar, hard-edged.
   ───────────────────────────────────────────────────────────── */

export function ProgressBar({ value, height = 22, danger }) {
  const anim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: 420,
      easing: EASE,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  return (
    <View
      style={{
        height,
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: C.paper,
        padding: 3,
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: danger ? C.danger : C.ink,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
