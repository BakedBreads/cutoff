import React, { useMemo } from 'react';
import { View, Text, Alert } from 'react-native';
import { C, T } from '../theme';
import { human, humanDuration, dayStamp } from '../format';
import { DURATION_CHIPS } from '../presets';
import { canHardBlock, previewBlockScreen, hasOverlayPermission } from '../blocker';
import { Screen, Hard, Chip, Toggle, Row, Kicker, Button, Body } from '../components/ui';
import DurationInput from '../components/DurationInput';
import { Enter } from '../components/motion';
import { WeekChart, summarise } from '../components/Stats';
import { IconEye, IconChevron, IconTrash, IconChart } from '../icons';

// -1 means "until you stop it in the app", 0 means no block at all.
const FOREVER = -1;
const VERSION = '1.4.0';

export default function SettingsScreen({
  settings,
  onChange,
  history,
  onClearHistory,
  onManageApps,
  onManageMessages,
  onOpenSounds,
  onOpenPermissions,
  onOpenAbout,
  onBack,
}) {
  const messages = settings.messages || [];
  const lockValue = Number(settings.lockoutMs);
  const lockMode = lockValue < 0 ? 'forever' : lockValue === 0 ? 'off' : 'timed';
  const stats = useMemo(() => summarise(history), [history]);

  const preview = () => {
    if (!canHardBlock) {
      Alert.alert(
        'Preview unavailable',
        'The full-screen preview needs the native Android build. Your wording still shows on the in-app screen.'
      );
      return;
    }
    if (!hasOverlayPermission()) {
      Alert.alert(
        'Permission needed',
        'Turn on "Display over other apps" first, then the preview can cover the screen.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Fix it', onPress: onOpenPermissions },
        ]
      );
      return;
    }
    previewBlockScreen(
      messages[0] || "TIME'S UP",
      settings.submessage || '',
      !!settings.darkBlockScreen,
      settings.soundUri || '',
      settings.soundEnabled !== false
    );
  };

  return (
    <Screen title="Settings" onBack={onBack}>
      {/* ── the words ────────────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 12 }}>What it says</Kicker>

      <Enter>
        <Hard inner={{ paddingHorizontal: 15 }} style={{ marginBottom: 20 }}>
          <Row
            title="Messages"
            subtitle={
              messages.length === 1
                ? messages[0]
                : `${messages.length} lines · picked at random`
            }
            // Both lines are edited in place over there, on a live preview.
            onPress={onManageMessages}
            right={<IconChevron size={17} color={C.dim} />}
            last
          />
        </Hard>
      </Enter>

      <Hard fill={C.wash} inner={{ padding: 15 }} style={{ marginBottom: 12 }}>
        <Text style={[T.kicker, { marginBottom: 9 }]}>PREVIEW</Text>
        <Text style={[T.label, { fontSize: 18, letterSpacing: -0.3 }]}>
          {(messages[0] || "TIME'S UP").toUpperCase()}
        </Text>
        {settings.submessage ? (
          <Body style={{ fontSize: 12, marginTop: 8 }}>{settings.submessage}</Body>
        ) : null}
      </Hard>

      <Button
        label="SEE IT FULL SCREEN"
        icon={<IconEye />}
        variant="outline"
        compact
        onPress={preview}
      />

      {/* ── the block ────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 10 }}>How long it stays blocked</Kicker>
      <Body style={{ marginBottom: 14 }}>
        {canHardBlock
          ? "After the timer ends, opening that app puts the screen straight back up. Needs usage access."
          : 'Android only — iOS gives no app the ability to watch what you open.'}
      </Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip
          label="UNTIL I STOP IT"
          active={lockMode === 'forever'}
          onPress={() => onChange({ lockoutMs: FOREVER })}
        />
        <Chip
          label="FOR A WHILE"
          active={lockMode === 'timed'}
          onPress={() => onChange({ lockoutMs: 15 * 60_000 })}
        />
        <Chip label="OFF" active={lockMode === 'off'} onPress={() => onChange({ lockoutMs: 0 })} />
      </View>

      {lockMode === 'timed' ? (
        <View style={{ marginTop: 18 }}>
          <DurationInput
            valueMs={Math.max(1000, Number(settings.lockoutMs) || 0)}
            onChange={(ms) => onChange({ lockoutMs: ms })}
          />
        </View>
      ) : null}

      {lockMode === 'forever' ? (
        <Body style={{ fontSize: 11, marginTop: 12, color: C.dimmer }}>
          The block screen has no stop button of its own — you have to come back here and
          hold to unblock. That's the point.
        </Body>
      ) : null}

      {/* ── sound ────────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 6 }}>Sound &amp; feel</Kicker>
      <Hard inner={{ paddingHorizontal: 15 }} style={{ marginTop: 12 }}>
        <Row
          title="Alarm tone"
          subtitle={
            settings.soundEnabled === false
              ? 'Off — vibration only'
              : settings.soundName || 'Default alarm'
          }
          onPress={onOpenSounds}
          right={<IconChevron size={17} color={C.dim} />}
        />
        <Row
          title="Vibrate"
          subtitle="Buzzes at zero, and once at the one-minute mark"
          right={
            <Toggle
              value={settings.vibrate !== false}
              onValueChange={(v) => onChange({ vibrate: v })}
            />
          }
        />
        <Row
          title="Blackout screen"
          subtitle="Black background instead of paper white"
          right={
            <Toggle
              value={!!settings.darkBlockScreen}
              onValueChange={(v) => onChange({ darkBlockScreen: v })}
            />
          }
          last
        />
      </Hard>

      {/* ── behaviour ────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 6 }}>Behaviour</Kicker>
      <Hard inner={{ paddingHorizontal: 15 }} style={{ marginTop: 12 }}>
        <Row
          title="Streak notifications"
          subtitle="A nudge when your run of days grows"
          right={
            <Toggle
              value={settings.streakNotifications !== false}
              onValueChange={(v) => onChange({ streakNotifications: v })}
            />
          }
        />
        <Row
          title="Ask before starting"
          subtitle="Pick the length each time instead of launching straight away"
          right={
            <Toggle
              value={!!settings.confirmBeforeStart}
              onValueChange={(v) => onChange({ confirmBeforeStart: v })}
            />
          }
          last
        />
      </Hard>

      {/* ── defaults ─────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 14 }}>Default timer for new apps</Kicker>
      <View style={{ marginBottom: 16 }}>
        <DurationInput
          valueMs={Number(settings.defaultDurationMs) || 20 * 60_000}
          onChange={(ms) => onChange({ defaultDurationMs: ms })}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DURATION_CHIPS.map((ms) => (
          <Chip
            key={ms}
            label={humanDuration(ms)}
            active={Number(settings.defaultDurationMs) === ms}
            onPress={() => onChange({ defaultDurationMs: ms })}
          />
        ))}
      </View>

      {/* ── nav ──────────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 6 }}>Setup</Kicker>
      <Hard inner={{ paddingHorizontal: 15 }} style={{ marginTop: 12 }}>
        <Row
          title="Apps"
          subtitle="Add, edit or remove what gets timed"
          onPress={onManageApps}
          right={<IconChevron size={17} color={C.dim} />}
          last={!canHardBlock}
        />
        {canHardBlock ? (
          <Row
            title="Permissions"
            subtitle="What Cutoff needs to interrupt you"
            onPress={onOpenPermissions}
            right={<IconChevron size={17} color={C.dim} />}
          />
        ) : null}
        <Row
          title="About"
          subtitle={`Version ${VERSION} · contact · privacy`}
          onPress={onOpenAbout}
          right={<IconChevron size={17} color={C.dim} />}
          last
        />
      </Hard>

      {/* ── history ──────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 12 }}>Your week</Kicker>
      {history.length === 0 ? (
        <Body>Nothing yet. Your finished sessions land here.</Body>
      ) : (
        <>
          <Hard inner={{ padding: 15 }} style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconChart size={13} color={C.dim} />
              <Text style={[T.kicker, { letterSpacing: 0.9, flex: 1 }]}>
                {human(stats.weekMins)} ACROSS 7 DAYS
              </Text>
              <Text style={[T.kicker, { letterSpacing: 0.9 }]}>
                {stats.streak > 1 ? `${stats.streak}D STREAK` : ''}
              </Text>
            </View>
            <WeekChart days={stats.days} height={64} />
          </Hard>

          <Hard inner={{ paddingHorizontal: 15 }}>
            {history.slice(0, 8).map((h, i, arr) => (
              <Row
                key={`${h.at}-${i}`}
                title={h.app}
                subtitle={`${dayStamp(h.at)} · ${humanDuration(h.actualMs)}${
                  h.endedEarly ? ' · ended early' : ''
                }`}
                last={i === arr.length - 1}
              />
            ))}
          </Hard>

          <View style={{ marginTop: 16 }}>
            <Text style={[T.kicker, { marginBottom: 12 }]}>
              {history.length} SESSIONS LOGGED
            </Text>
            <Button
              label="CLEAR HISTORY"
              icon={<IconTrash />}
              variant="outline"
              compact
              onPress={() =>
                Alert.alert('Clear history?', 'This only deletes the log, not your apps.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: onClearHistory },
                ])
              }
            />
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </Screen>
  );
}
