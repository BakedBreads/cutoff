import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { C, T, MONO } from '../theme';
import { UNITS, toMs, splitDuration, humanDuration } from '../format';

const ORDER = ['sec', 'min', 'hour'];

/**
 * Type the number, pick the unit. Switching unit keeps the number you typed
 * rather than converting it — typing "30" then tapping MIN should mean thirty
 * minutes, not half a minute.
 */
export default function DurationInput({ valueMs, onChange, autoFocus }) {
  const initial = splitDuration(valueMs);
  const [amount, setAmount] = useState(String(initial.amount || ''));
  const [unit, setUnit] = useState(initial.unit);

  // Re-sync when the parent hands us a different duration (e.g. a preset chip).
  useEffect(() => {
    const next = splitDuration(valueMs);
    if (toMs(amount, unit) !== Number(valueMs)) {
      setAmount(String(next.amount || ''));
      setUnit(next.unit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueMs]);

  const commit = (rawAmount, nextUnit) => {
    const cap = UNITS[nextUnit].max;
    const n = Math.min(cap, Math.max(0, parseFloat(rawAmount) || 0));
    onChange(toMs(n, nextUnit));
  };

  const onType = (text) => {
    // Digits and a single decimal point, nothing else.
    const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setAmount(cleaned);
    commit(cleaned, unit);
  };

  const pickUnit = (u) => {
    setUnit(u);
    commit(amount, u);
  };

  const ms = toMs(amount, unit);
  const over = parseFloat(amount || 0) > UNITS[unit].max;

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
        {/* the number you type */}
        <View
          style={{
            flex: 1,
            borderWidth: 2,
            borderColor: over ? C.danger : C.ink,
            backgroundColor: C.paper,
            justifyContent: 'center',
          }}
        >
          <TextInput
            value={amount}
            onChangeText={onType}
            keyboardType="decimal-pad"
            autoFocus={autoFocus}
            selectTextOnFocus
            maxLength={6}
            placeholder="20"
            placeholderTextColor={C.dimmer}
            style={{
              fontFamily: MONO,
              fontSize: 38,
              fontWeight: '700',
              letterSpacing: -1.5,
              color: over ? C.danger : C.ink,
              textAlign: 'center',
              paddingVertical: 12,
            }}
          />
        </View>

        {/* the unit */}
        <View style={{ gap: 6, justifyContent: 'space-between' }}>
          {ORDER.map((u) => {
            const active = unit === u;
            return (
              <Pressable
                key={u}
                onPress={() => pickUnit(u)}
                style={{
                  borderWidth: 2,
                  borderColor: C.ink,
                  backgroundColor: active ? C.ink : C.paper,
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  minWidth: 78,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.4,
                    color: active ? C.paper : C.ink,
                  }}
                >
                  {UNITS[u].label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={[T.kicker, { marginTop: 10, letterSpacing: 1.1, color: over ? C.danger : C.dim }]}>
        {over
          ? `MAX ${UNITS[unit].max} ${UNITS[unit].label}`
          : ms > 0
          ? `= ${humanDuration(ms).toUpperCase()}`
          : 'ENTER A NUMBER'}
      </Text>
    </View>
  );
}
