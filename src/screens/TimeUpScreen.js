import React, { useEffect, useRef } from 'react';
import { View, Text, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, MONO } from '../theme';
import { clock, humanMs } from '../format';
import { canHardBlock } from '../blocker';
import { HardPress } from '../components/ui';
import { HoldButton, EASE } from '../components/motion';
import { IconLock } from '../icons';

/**
 * Shown inside the app once a session has ended. When the block is endless this
 * is the only place it can be lifted — the overlay out in TikTok deliberately
 * offers no way to stop it.
 */
export default function TimeUpScreen({ state, settings, message, onDone, onEndLockout }) {
  const insets = useSafeAreaInsets();
  const dark = !!settings.darkBlockScreen;
  const blocked = state.inLockout;

  const bg = dark ? '#0A0A0A' : C.bg;
  const ink = dark ? '#F5F4F1' : C.ink;
  const dim = dark ? '#8A8A93' : C.dim;
  const btnFill = dark ? '#F5F4F1' : C.ink;
  const btnInk = dark ? '#0A0A0A' : C.bg;
  const shadow = dark ? '#3A3A40' : C.ink;

  // Entrance: the rule draws itself, then the headline drops in.
  const rule = useRef(new Animated.Value(0)).current;
  const body = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(rule, { toValue: 1, duration: 320, easing: EASE, useNativeDriver: false }),
      Animated.timing(body, { toValue: 1, duration: 420, easing: EASE, useNativeDriver: true }),
    ]).start();
  }, [rule, body]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        paddingTop: insets.top + 30,
        paddingHorizontal: 30,
        paddingBottom: insets.bottom + 30,
      }}
    >
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <Animated.View
        style={{
          height: 3,
          backgroundColor: ink,
          width: rule.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }),
        }}
      />
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 2.8,
          color: dim,
          marginTop: 14,
        }}
      >
        {blocked ? 'CUTOFF / BLOCKED' : 'CUTOFF / SESSION ENDED'}
      </Text>

      <Animated.View
        style={{
          flex: 1,
          justifyContent: 'center',
          opacity: body,
          transform: [
            { translateY: body.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          ],
        }}
      >
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 40,
            lineHeight: 45,
            fontWeight: '700',
            letterSpacing: -1,
            color: ink,
          }}
        >
          {String(message || "TIME'S UP").toUpperCase()}
        </Text>

        {settings.submessage ? (
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 15,
              lineHeight: 22,
              color: dim,
              marginTop: 18,
            }}
          >
            {settings.submessage}
          </Text>
        ) : null}

        <View style={{ height: 1, backgroundColor: dim, marginTop: 32, opacity: 0.5 }} />
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 1.4,
            color: dim,
            marginTop: 14,
          }}
        >
          {String(state.label || 'APP').toUpperCase()}
          {'   ·   '}
          {humanMs(state.durationMs).toUpperCase()} SPENT
        </Text>

        {blocked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }}>
            <IconLock size={13} color={dim} />
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1.2,
                color: dim,
              }}
            >
              {state.blockedForever
                ? 'BLOCKED UNTIL YOU STOP IT'
                : `LOCKED FOR ${clock(state.lockoutRemainingMs)} MORE`}
            </Text>
          </View>
        ) : null}
        <View style={{ height: 1, backgroundColor: dim, marginTop: 14, opacity: 0.5 }} />
      </Animated.View>

      {blocked && canHardBlock ? (
        <>
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 11,
              lineHeight: 17,
              color: dim,
              marginBottom: 14,
            }}
          >
            {String(state.label || 'The app').toUpperCase()} stays blocked every time you open it.
            Hold to lift it.
          </Text>
          <HoldButton
            label="HOLD TO UNBLOCK"
            holdLabel="KEEP HOLDING…"
            duration={2200}
            onComplete={onEndLockout}
            fill={btnFill}
            ink={btnInk}
          />

          {/* Lets you get on with the rest of the app without lifting the block. */}
          <Text
            onPress={onDone}
            style={{
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.6,
              color: dim,
              textAlign: 'center',
              marginTop: 18,
              paddingVertical: 6,
            }}
          >
            LEAVE IT BLOCKED
          </Text>
        </>
      ) : (
        <HardPress
          onPress={onDone}
          fill={btnFill}
          shadow={shadow}
          inner={{ paddingVertical: 19, alignItems: 'center' }}
        >
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: 2,
              color: btnInk,
            }}
          >
            OK
          </Text>
        </HardPress>
      )}
    </View>
  );
}
