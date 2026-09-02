import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { C, T } from '../theme';
import { human, dayStamp, humanMs } from '../format';
import { DURATION_CHIPS } from '../presets';
import { canHardBlock, previewBlockScreen, hasOverlayPermission } from '../blocker';
import { Screen, Hard, Field, Chip, Toggle, Row, Kicker, Button, Body } from '../components/ui';
import { IconEye, IconChevron, IconTrash } from '../icons';

const LOCKOUT_CHIPS = [0, 5, 10, 15, 30, 60];

export default function SettingsScreen({
  settings,
  onChange,
  history,
  onClearHistory,
  onManageApps,
  onOpenPermissions,
  onBack,
}) {
  const [message, setMessage] = useState(settings.message);
  const [submessage, setSubmessage] = useState(settings.submessage);

  const commitMessage = () => onChange({ message: message.trim() || "TIME'S UP" });
  const commitSub = () => onChange({ submessage: submessage });

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
      (message || settings.message).trim(),
      submessage,
      !!settings.darkBlockScreen
    );
  };

  const totalMinutes = history.reduce((sum, h) => sum + h.actualMs / 60000, 0);

  // Text fields commit on blur; leaving the screen also counts as blur.
  const leave = () => {
    commitMessage();
    commitSub();
    onBack();
  };

  return (
    <Screen title="Settings" onBack={leave}>
      {/* ── the words ────────────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 16 }}>What it says</Kicker>

      <Field
        label="Main line"
        value={message}
        onChangeText={setMessage}
        onBlur={commitMessage}
        placeholder="TIME TO STUDY"
        maxLength={40}
        autoCapitalize="characters"
        hint="Shown huge, in caps. Keep it short — 3 or 4 words hits hardest."
      />

      <Field
        label="Second line"
        value={submessage}
        onChangeText={setSubmessage}
        onBlur={commitSub}
        placeholder="Put the phone down. You said you would."
        multiline
        maxLength={140}
        hint="The smaller line underneath. Leave empty to hide it."
      />

      <Hard fill={C.wash} inner={{ padding: 15 }} style={{ marginBottom: 12 }}>
        <Text style={[T.kicker, { marginBottom: 9 }]}>PREVIEW</Text>
        <Text style={[T.label, { fontSize: 18, letterSpacing: -0.3 }]}>
          {(message || "TIME'S UP").toUpperCase()}
        </Text>
        {submessage ? <Body style={{ fontSize: 12, marginTop: 8 }}>{submessage}</Body> : null}
      </Hard>

      <Button
        label="SEE IT FULL SCREEN"
        icon={<IconEye />}
        variant="outline"
        compact
        onPress={preview}
      />

      {/* ── behaviour ────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 6 }}>Behaviour</Kicker>
      <Hard inner={{ paddingHorizontal: 15 }} style={{ marginTop: 12 }}>
        <Row
          title="Blackout screen"
          subtitle="Black background instead of paper white"
          right={
            <Toggle
              value={!!settings.darkBlockScreen}
              onValueChange={(v) => onChange({ darkBlockScreen: v })}
            />
          }
        />
        <Row
          title="Vibrate at zero"
          subtitle="A short buzz pattern when time runs out"
          right={
            <Toggle
              value={settings.vibrate !== false}
              onValueChange={(v) => onChange({ vibrate: v })}
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

      {/* ── lockout ──────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 10 }}>Lockout after time's up</Kicker>
      <Body style={{ marginBottom: 14 }}>
        {canHardBlock
          ? 'Reopening the app during this window slams the block screen straight back up. Needs usage access.'
          : 'Android only — iOS gives no app the ability to watch what you open.'}
      </Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LOCKOUT_CHIPS.map((m) => (
          <Chip
            key={m}
            label={m === 0 ? 'OFF' : human(m)}
            active={Number(settings.lockoutMinutes) === m}
            onPress={() => onChange({ lockoutMinutes: m })}
          />
        ))}
      </View>

      {/* ── defaults ─────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 14 }}>Default timer for new apps</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DURATION_CHIPS.map((m) => (
          <Chip
            key={m}
            label={human(m)}
            active={Number(settings.defaultMinutes) === m}
            onPress={() => onChange({ defaultMinutes: m })}
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
            last
          />
        ) : null}
      </Hard>

      {/* ── history ──────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 12 }}>Recent sessions</Kicker>
      {history.length === 0 ? (
        <Body>Nothing yet. Your finished sessions land here.</Body>
      ) : (
        <>
          <Hard inner={{ paddingHorizontal: 15 }}>
            {history.slice(0, 8).map((h, i, arr) => (
              <Row
                key={`${h.at}-${i}`}
                title={h.app}
                subtitle={`${dayStamp(h.at)} · ${humanMs(h.actualMs)}${
                  h.endedEarly ? ' · ended early' : ''
                }`}
                last={i === arr.length - 1}
              />
            ))}
          </Hard>
          <View style={{ marginTop: 16 }}>
            <Text style={[T.kicker, { marginBottom: 12 }]}>
              {history.length} SESSIONS · {human(totalMinutes)} TOTAL
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
      <Body style={{ fontSize: 11, textAlign: 'center', color: C.dimmer }}>
        CUTOFF v1.0 · {canHardBlock ? 'native android build' : 'timer mode'}
      </Body>
    </Screen>
  );
}
