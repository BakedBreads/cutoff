import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, MONO } from '../theme';
import { clock, humanDuration } from '../format';
import { canHardBlock } from '../blocker';
import { Hard, Button, Kicker, Body, IconButton } from '../components/ui';
import { Pulse, ProgressBar, Enter } from '../components/motion';
import { IconBack, IconLock, IconGear } from '../icons';

const NEARLY_OVER = 60_000;

export default function RunningScreen({
  state,
  app,
  settings,
  message,
  onBackToApp,
  onOpenSettings,
}) {
  const insets = useSafeAreaInsets();
  const pct =
    state.durationMs > 0
      ? Math.min(1, Math.max(0, 1 - state.remainingMs / state.durationMs))
      : 0;
  const nearlyOver = state.remainingMs > 0 && state.remainingMs <= NEARLY_OVER;
  const label = String(state.label || app?.name || 'APP').toUpperCase();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        paddingTop: insets.top + 24,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Kicker style={{ flex: 1 }}>Session running</Kicker>
        <IconButton icon={<IconGear />} onPress={onOpenSettings} size={40} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Enter>
          <Text style={[T.kicker, { fontSize: 12, letterSpacing: 2, marginBottom: 6 }]}>
            {label}
          </Text>
        </Enter>

        {/* The clock breathes once it's down to the last minute. */}
        <Pulse active={nearlyOver} style={{ alignSelf: 'flex-start' }}>
          <Text
            style={{
              fontFamily: MONO,
              fontSize: state.remainingMs >= 3600_000 ? 58 : 76,
              fontWeight: '700',
              letterSpacing: -4,
              color: nearlyOver ? C.danger : C.ink,
              marginBottom: 4,
            }}
          >
            {clock(state.remainingMs)}
          </Text>
        </Pulse>

        <Text style={[T.body, { fontSize: 12, marginBottom: 26 }]}>
          {nearlyOver
            ? 'Last minute — wrap it up.'
            : `of ${humanDuration(state.durationMs)} · left on the clock`}
        </Text>

        <View style={{ marginBottom: 26 }}>
          <ProgressBar value={pct} danger={nearlyOver} />
        </View>

        <Enter delay={120}>
          <Hard fill={C.wash} inner={{ padding: 16 }}>
            <Text style={[T.kicker, { marginBottom: 8 }]}>AT ZERO</Text>
            <Text style={[T.label, { fontSize: 17, letterSpacing: 0 }]}>
              {message || (settings.messages || [])[0] || "TIME'S UP"}
            </Text>
            {settings.submessage ? (
              <Body style={{ fontSize: 12, marginTop: 7 }}>{settings.submessage}</Body>
            ) : null}
            {canHardBlock ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 13,
                  paddingTop: 13,
                  borderTopWidth: 1,
                  borderTopColor: C.rule,
                }}
              >
                <IconLock size={14} color={C.dim} />
                <Text style={[T.kicker, { letterSpacing: 0.9, flex: 1 }]}>
                  {Number(settings.lockoutMinutes) < 0
                    ? `${label} STAYS BLOCKED UNTIL YOU STOP IT`
                    : `THIS SCREEN WILL COVER ${label}`}
                </Text>
              </View>
            ) : null}
          </Hard>
        </Enter>
      </View>

      <Button label={`BACK TO ${label}`} icon={<IconBack />} onPress={onBackToApp} />

      {/* No way to end a session early — starting one is the commitment. */}
      <Text
        style={[
          T.body,
          { fontSize: 11, textAlign: 'center', marginTop: 14, color: C.dimmer },
        ]}
      >
        The clock doesn't stop. Sit it out.
      </Text>
    </View>
  );
}
