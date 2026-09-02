import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, MONO } from '../theme';
import { clock, humanMs } from '../format';
import { canHardBlock } from '../blocker';
import { Hard, Button, Kicker, Body, IconButton } from '../components/ui';
import { IconStop, IconBack, IconLock, IconGear } from '../icons';

export default function RunningScreen({
  state,
  app,
  settings,
  onStop,
  onBackToApp,
  onOpenSettings,
}) {
  const insets = useSafeAreaInsets();
  const pct =
    state.durationMs > 0
      ? Math.min(1, Math.max(0, 1 - state.remainingMs / state.durationMs))
      : 0;

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
        <Text style={[T.kicker, { fontSize: 12, letterSpacing: 2, marginBottom: 6 }]}>
          {String(state.label || app?.name || 'APP').toUpperCase()}
        </Text>

        <Text
          style={{
            fontFamily: MONO,
            fontSize: state.remainingMs >= 3600_000 ? 58 : 76,
            fontWeight: '700',
            letterSpacing: -4,
            color: C.ink,
            marginBottom: 4,
          }}
        >
          {clock(state.remainingMs)}
        </Text>
        <Text style={[T.body, { fontSize: 12, marginBottom: 26 }]}>
          of {humanMs(state.durationMs)} · left on the clock
        </Text>

        {/* segmented progress */}
        <View
          style={{
            height: 22,
            borderWidth: 2,
            borderColor: C.ink,
            backgroundColor: C.paper,
            padding: 3,
            marginBottom: 26,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: Math.max(pct, 0.0001), backgroundColor: C.ink }} />
            <View style={{ flex: Math.max(1 - pct, 0.0001) }} />
          </View>
        </View>

        <Hard fill={C.wash} inner={{ padding: 16 }}>
          <Text style={[T.kicker, { marginBottom: 8 }]}>AT ZERO</Text>
          <Text style={[T.label, { fontSize: 17, letterSpacing: 0 }]}>{settings.message}</Text>
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
              <Text style={[T.kicker, { letterSpacing: 0.9 }]}>
                THIS SCREEN WILL COVER {String(state.label || 'THE APP').toUpperCase()}
              </Text>
            </View>
          ) : null}
        </Hard>
      </View>

      <Button
        label={`BACK TO ${String(state.label || app?.name || 'APP').toUpperCase()}`}
        icon={<IconBack />}
        variant="outline"
        onPress={onBackToApp}
      />
      <View style={{ height: 10 }} />
      <Button label="END SESSION NOW" icon={<IconStop />} onPress={onStop} />
    </View>
  );
}
