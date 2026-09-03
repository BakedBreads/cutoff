import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { C, T, MONO } from '../theme';
import { human, humanDuration } from '../format';
import { Screen, Hard, Kicker, Body } from '../components/ui';
import { Enter } from '../components/motion';
import { WeekChart, summarise } from '../components/Stats';
import { IconFlame, IconChart, IconClock } from '../icons';

const DAY = 86_400_000;

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Longest run of consecutive days that ever had a session. */
function bestStreak(history) {
  const days = [...new Set(history.map((h) => startOfDay(h.at)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev !== null && d - prev === DAY ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
  }
  return best;
}

export default function StreakScreen({ history, onBack }) {
  const s = useMemo(() => summarise(history), [history]);
  const best = useMemo(() => bestStreak(history), [history]);

  const totalMs = history.reduce((sum, h) => sum + h.actualMs, 0);
  const avgMs = history.length ? totalMs / history.length : 0;
  const activeDays = new Set(history.map((h) => startOfDay(h.at))).size;

  // Sessions grouped by day, newest first.
  const byDay = useMemo(() => {
    const map = new Map();
    history.forEach((h) => {
      const key = startOfDay(h.at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [history]);

  const dayLabel = (ts) => {
    const today = startOfDay(Date.now());
    if (ts === today) return 'TODAY';
    if (ts === today - DAY) return 'YESTERDAY';
    return new Date(ts)
      .toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      .toUpperCase();
  };

  return (
    <Screen title="Streak" onBack={onBack}>
      {/* ── the number itself ──────────────────────────────────── */}
      <Enter>
        <Hard inner={{ padding: 22, alignItems: 'center' }} style={{ marginBottom: 22 }}>
          <IconFlame size={30} color={s.streak > 0 ? C.ink : C.dimmer} />
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 62,
              fontWeight: '700',
              letterSpacing: -4,
              color: s.streak > 0 ? C.ink : C.dimmer,
              marginTop: 10,
            }}
          >
            {s.streak}
          </Text>
          <Text style={[T.kicker, { letterSpacing: 2, marginTop: 4 }]}>
            {s.streak === 1 ? 'DAY IN A ROW' : 'DAYS IN A ROW'}
          </Text>
          <Body style={{ fontSize: 11, marginTop: 12, textAlign: 'center' }}>
            {s.streak === 0
              ? 'Run one session today and the streak starts.'
              : s.todayMins > 0
              ? 'Today is counted. Come back tomorrow to keep it.'
              : 'Nothing logged today yet — run a session before midnight.'}
          </Body>
        </Hard>
      </Enter>

      {/* ── the week ───────────────────────────────────────────── */}
      <Enter delay={70}>
        <Hard inner={{ padding: 16 }} style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <IconChart size={13} color={C.dim} />
            <Text style={[T.kicker, { letterSpacing: 0.9, flex: 1 }]}>LAST 7 DAYS</Text>
            <Text style={[T.kicker, { letterSpacing: 0.9 }]}>{human(s.weekMins)}</Text>
          </View>
          <WeekChart days={s.days} height={70} />
        </Hard>
      </Enter>

      {/* ── the totals ─────────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 14 }}>All time</Kicker>
      <Enter delay={120}>
        <Hard inner={{ padding: 16 }} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row' }}>
            <Stat value={String(history.length)} label="SESSIONS" />
            <Divider />
            <Stat value={humanDuration(totalMs)} label="TOTAL" />
            <Divider />
            <Stat value={String(best)} label="BEST RUN" />
          </View>
        </Hard>
      </Enter>
      <Hard inner={{ padding: 16 }} style={{ marginBottom: 26 }}>
        <View style={{ flexDirection: 'row' }}>
          <Stat value={String(activeDays)} label="ACTIVE DAYS" />
          <Divider />
          <Stat value={humanDuration(avgMs)} label="AVERAGE" />
          <Divider />
          <Stat value={human(s.todayMins)} label="TODAY" />
        </View>
      </Hard>

      {/* ── the log ────────────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 12 }}>Every session</Kicker>
      {history.length === 0 ? (
        <Body>
          Nothing logged yet. Finish a session and it shows up here with the day it happened.
        </Body>
      ) : (
        byDay.map(([day, entries], di) => (
          <View key={day} style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <Text style={[T.kicker, { letterSpacing: 1.4 }]}>{dayLabel(day)}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.rule }} />
              <Text style={[T.kicker, { letterSpacing: 1.1 }]}>
                {humanDuration(entries.reduce((a, e) => a + e.actualMs, 0))}
              </Text>
            </View>
            <Hard inner={{ paddingHorizontal: 15 }}>
              {entries.map((h, i) => (
                <View
                  key={`${h.at}-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                    paddingVertical: 12,
                    borderBottomWidth: i === entries.length - 1 ? 0 : 1,
                    borderBottomColor: C.rule,
                  }}
                >
                  <IconClock size={14} color={C.dim} />
                  <Text style={[T.label, { flex: 1, fontSize: 13, letterSpacing: 0 }]}>
                    {h.app || 'Session'}
                  </Text>
                  <Text style={[T.kicker, { letterSpacing: 0.9 }]}>
                    {humanDuration(h.actualMs)}
                  </Text>
                </View>
              ))}
            </Hard>
          </View>
        ))
      )}

      <View style={{ height: 20 }} />
    </Screen>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 19,
          fontWeight: '700',
          letterSpacing: -0.8,
          color: C.ink,
        }}
      >
        {value}
      </Text>
      <Text style={[T.kicker, { marginTop: 6, letterSpacing: 1 }]}>{label}</Text>
    </View>
  );
}

const Divider = () => <View style={{ width: 1, backgroundColor: C.rule }} />;
