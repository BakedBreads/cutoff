import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { C, T, MONO } from '../theme';
import { human } from '../format';
import { Hard, HardPress } from './ui';
import { IconFlame, IconChart } from '../icons';

const DAY = 86_400_000;

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Minutes per day for the last 7 days, plus today's total and a day streak. */
export function summarise(history) {
  const today = startOfDay(Date.now());
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const day = today - i * DAY;
    const mins = history
      .filter((h) => startOfDay(h.at) === day)
      .reduce((sum, h) => sum + h.actualMs / 60000, 0);
    days.push({ day, mins, label: new Date(day).toLocaleDateString(undefined, { weekday: 'narrow' }) });
  }

  // A streak counts consecutive days ending today that had at least one session.
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = today - i * DAY;
    const had = history.some((h) => startOfDay(h.at) === day);
    if (had) streak++;
    else if (i > 0) break;
    else if (!had) break;
  }

  return {
    days,
    todayMins: days[days.length - 1].mins,
    weekMins: days.reduce((s, d) => s + d.mins, 0),
    streak,
    total: history.length,
  };
}

/** Compact seven-bar chart. Bars are hard rectangles, no curves, no gradient. */
export function WeekChart({ days, height = 54 }) {
  const peak = Math.max(1, ...days.map((d) => d.mins));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height }}>
      {days.map((d, i) => {
        const isToday = i === days.length - 1;
        const h = d.mins > 0 ? Math.max(4, (d.mins / peak) * (height - 16)) : 2;
        return (
          <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: '100%',
                height: h,
                backgroundColor: d.mins > 0 ? (isToday ? C.ink : C.dim) : C.rule,
              }}
            />
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: '700',
                color: isToday ? C.ink : C.dimmer,
              }}
            >
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The strip that sits above the app grid on the home screen. */
export default function StatsStrip({ history, onPress }) {
  const s = useMemo(() => summarise(history), [history]);
  const Box = onPress ? HardPress : Hard;

  return (
    <Box
      onPress={onPress}
      fill={C.paper}
      inner={{ padding: 15 }}
      style={{ marginBottom: 22 }}
    >
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={[T.kicker, { marginBottom: 7 }]}>TODAY</Text>
          <Text style={{ fontFamily: MONO, fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -1 }}>
            {human(s.todayMins)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 }}>
            <IconFlame size={13} color={s.streak > 0 ? C.ink : C.dimmer} />
            <Text style={[T.kicker, { letterSpacing: 0.9, color: s.streak > 0 ? C.dim : C.dimmer }]}>
              {s.streak > 1
                ? `${s.streak} DAY STREAK`
                : s.streak === 1
                ? 'DAY 1 — KEEP IT'
                : 'NO STREAK YET'}
            </Text>
          </View>
        </View>

        <View style={{ width: 1, backgroundColor: C.rule }} />

        <View style={{ flex: 1.25 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <IconChart size={12} color={C.dim} />
            <Text style={[T.kicker, { letterSpacing: 0.9 }]}>{human(s.weekMins)} THIS WEEK</Text>
          </View>
          <WeekChart days={s.days} />
        </View>
      </View>

      {onPress ? (
        <Text style={[T.kicker, { marginTop: 12, letterSpacing: 1.3, color: C.dimmer }]}>
          TAP FOR THE FULL RECORD
        </Text>
      ) : null}
    </Box>
  );
}
