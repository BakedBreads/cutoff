import React from 'react';
import { View, Text, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, MONO } from '../theme';
import { clock, humanMs } from '../format';
import { canHardBlock } from '../blocker';
import { HardPress } from '../components/ui';

/**
 * In-app "time's up". On iOS this *is* the block. On Android it's the echo of
 * the native overlay, shown whenever you open Cutoff after a session ended.
 */
export default function TimeUpScreen({ state, settings, onDone, onEndLockout }) {
  const insets = useSafeAreaInsets();
  const dark = !!settings.darkBlockScreen;

  const bg = dark ? '#0A0A0A' : C.bg;
  const ink = dark ? '#F5F4F1' : C.ink;
  const dim = dark ? '#8A8A93' : C.dim;
  const btnFill = dark ? '#F5F4F1' : C.ink;
  const btnInk = dark ? '#0A0A0A' : C.bg;
  const shadow = dark ? '#3A3A40' : C.ink;

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

      <View style={{ width: 44, height: 3, backgroundColor: ink }} />
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
        CUTOFF / SESSION ENDED
      </Text>

      <View style={{ flex: 1, justifyContent: 'center' }}>
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
          {String(settings.message || "TIME'S UP").toUpperCase()}
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

        {state.inLockout ? (
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 1.4,
              color: dim,
              marginTop: 7,
            }}
          >
            LOCKED FOR {clock(state.lockoutRemainingMs)} MORE
          </Text>
        ) : null}
        <View style={{ height: 1, backgroundColor: dim, marginTop: 14, opacity: 0.5 }} />
      </View>

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
          I'M DONE
        </Text>
      </HardPress>

      {state.inLockout && canHardBlock ? (
        <Text
          onPress={onEndLockout}
          style={{
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.6,
            color: dim,
            textAlign: 'center',
            marginTop: 20,
            paddingVertical: 6,
          }}
        >
          LIFT THE LOCK EARLY
        </Text>
      ) : null}
    </View>
  );
}
