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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, MONO, SHADOW } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Snappy but not bouncy — matches the hard-edged look. */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export const layoutPulse = () =>
  LayoutAnimation.configureNext(
    LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
  );

/* ─────────────────────────────────────────────────────────────
   Screen transition — slides forward on push, back on pop.
   ───────────────────────────────────────────────────────────── */

export function ScreenTransition({ routeKey, depth, children }) {
  const anim = useRef(new Animated.Value(1)).current;
  const prevDepth = useRef(depth);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const forward = depth >= prevDepth.current;
    prevDepth.current = depth;
    setDir(forward ? 1 : -1);

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [routeKey, depth, anim]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: anim,
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [26 * dir, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
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
      duration: 340,
      delay: delay + index * 55,
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
   Pulse — used on the countdown when time is nearly up.
   ───────────────────────────────────────────────────────────── */

export function Pulse({ active, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim.stopAnimation();
      anim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 480, easing: EASE, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 620, easing: EASE, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) },
          ],
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }),
        },
      ]}
    >
      {children}
    </Animated.View>
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
          backgroundColor: C.ink,
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
