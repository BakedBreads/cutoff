import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SHADOW } from '../theme';
import { humanDuration } from '../format';
import { DURATION_CHIPS } from '../presets';
import { canHardBlock } from '../blocker';
import {
  Wordmark, IconGear, IconPlus, IconAlert, IconPlay, IconShield, IconLock, IconTrash,
} from '../icons';
import { Hard, HardPress, Button, Chip, Kicker, IconButton, Body } from '../components/ui';
import DurationInput from '../components/DurationInput';
import { Enter, layoutPulse } from '../components/motion';
import AppTile from '../components/AppTile';
import StatsStrip from '../components/Stats';
import Sheet from '../components/Sheet';

export default function HomeScreen({
  apps,
  settings,
  history,
  permissionsOk,
  blockedAppId,
  blockedForever,
  onUnblock,
  onDeleteApp,
  onStart,
  onEditApp,
  onAddApp,
  onOpenSettings,
  onOpenPermissions,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [sheetApp, setSheetApp] = useState(null);
  const [sheetMs, setSheetMs] = useState(20 * 60_000);

  const tile = useMemo(
    () => Math.floor((width - 40 - 12) / 2) - SHADOW,
    [width]
  );

  const openSheet = (app) => {
    setSheetMs(app.durationMs);
    setSheetApp(app);
  };

  const handleTilePress = (app) => {
    if (app.id === blockedAppId) {
      setSheetApp(null);
      onUnblock(app);
      return;
    }
    if (canHardBlock && !permissionsOk) {
      onOpenPermissions();
      return;
    }
    if (settings.confirmBeforeStart) openSheet(app);
    else onStart(app, app.durationMs);
  };

  const startFromSheet = () => {
    const app = sheetApp;
    setSheetApp(null);
    if (app) onStart(app, sheetMs);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* ── header ─────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 16,
        }}
      >
        <Wordmark size={30} />
        <View style={{ flex: 1 }}>
          <Text style={[T.label, { fontSize: 16, letterSpacing: 3 }]}>CUTOFF</Text>
          <Text style={[T.kicker, { marginTop: 3, letterSpacing: 1.1 }]}>
            {canHardBlock ? 'HARD BLOCK ARMED' : 'TIMER + ALERT MODE'}
          </Text>
        </View>
        <IconButton icon={<IconGear />} onPress={onOpenSettings} size={44} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── permission warning ───────────────────────────────── */}
        {canHardBlock && !permissionsOk ? (
          <HardPress
            onPress={onOpenPermissions}
            fill={C.ink}
            style={{ marginBottom: 22 }}
            inner={{ padding: 16, flexDirection: 'row', gap: 13, alignItems: 'center' }}
          >
            <IconAlert size={22} color={C.paper} />
            <View style={{ flex: 1 }}>
              <Text style={[T.label, { color: C.paper, fontSize: 12, letterSpacing: 1.2 }]}>
                PERMISSIONS NEEDED
              </Text>
              <Text style={[T.body, { color: C.dimmer, fontSize: 11, marginTop: 4 }]}>
                Without them the block screen can't cover other apps, or come back when you
                reopen one. Tap to fix.
              </Text>
            </View>
          </HardPress>
        ) : null}

        {/* ── iOS honesty note ─────────────────────────────────── */}
        {!canHardBlock ? (
          <Hard
            style={{ marginBottom: 22 }}
            fill={C.wash}
            inner={{ padding: 15, flexDirection: 'row', gap: 12 }}
          >
            <IconShield size={20} color={C.ink} />
            <View style={{ flex: 1 }}>
              <Text style={[T.label, { fontSize: 12 }]}>SOFT BLOCK ON THIS DEVICE</Text>
              <Body style={{ fontSize: 11, marginTop: 5 }}>
                iOS won't let any app interrupt another one. When time's up you get a
                full-screen alert and this screen takes over — but TikTok keeps running
                until you leave it.
              </Body>
            </View>
          </Hard>
        ) : null}

        {blockedAppId ? (
          <Enter>
            <HardPress
              onPress={() => onUnblock(apps.find((a) => a.id === blockedAppId))}
              fill={C.ink}
              style={{ marginBottom: 22 }}
              inner={{ padding: 16, flexDirection: 'row', gap: 13, alignItems: 'center' }}
            >
              <IconLock size={21} color={C.paper} />
              <View style={{ flex: 1 }}>
                <Text style={[T.label, { color: C.paper, fontSize: 12, letterSpacing: 1.2 }]}>
                  {String(
                    apps.find((a) => a.id === blockedAppId)?.name || 'AN APP'
                  ).toUpperCase()}{' '}
                  IS BLOCKED
                </Text>
                <Text style={[T.body, { color: C.dimmer, fontSize: 11, marginTop: 4 }]}>
                  {blockedForever
                    ? 'It stays blocked every time you open it. Tap to lift it.'
                    : 'Tap to see how much longer.'}
                </Text>
              </View>
            </HardPress>
          </Enter>
        ) : null}

        <StatsStrip history={history} />

        <Kicker style={{ marginBottom: 16 }}>Your apps</Kicker>

        {/* ── grid ─────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {apps.map((app, i) => (
            <Enter key={app.id} index={i}>
              <AppTile
                app={app}
                size={tile}
                blocked={app.id === blockedAppId}
                onPress={() => handleTilePress(app)}
                onLongPress={() =>
                  app.id === blockedAppId ? onUnblock(app) : openSheet(app)
                }
              />
            </Enter>
          ))}

          {/* add tile */}
          <Enter index={apps.length}>
          <HardPress
            onPress={onAddApp}
            fill={C.wash}
            style={{ width: tile }}
            inner={{
              padding: 14,
              height: tile * 1.06,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderWidth: 2,
                borderColor: C.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconPlus size={22} />
            </View>
            <Text style={[T.kicker, { color: C.ink, letterSpacing: 1.3 }]}>ADD APP</Text>
          </HardPress>
          </Enter>
        </View>

        {apps.length > 0 ? (
          <Text
            style={[
              T.body,
              { fontSize: 11, marginTop: 22, color: C.dimmer, textAlign: 'center' },
            ]}
          >
            Tap to start · hold to change the timer
          </Text>
        ) : null}
      </ScrollView>

      {/* ── start sheet ──────────────────────────────────────────── */}
      <Sheet
        visible={!!sheetApp}
        onClose={() => setSheetApp(null)}
        title={sheetApp ? `Start ${sheetApp.name}` : ''}
      >
        <Text style={[T.kicker, { marginBottom: 14 }]}>HOW LONG?</Text>

        <View style={{ marginBottom: 18 }}>
          <DurationInput valueMs={sheetMs} onChange={setSheetMs} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {DURATION_CHIPS.map((ms) => (
            <Chip
              key={ms}
              label={humanDuration(ms)}
              active={sheetMs === ms}
              onPress={() => {
                layoutPulse();
                setSheetMs(ms);
              }}
            />
          ))}
        </View>

        <Hard fill={C.wash} inner={{ padding: 15 }} style={{ marginBottom: 20 }}>
          <Text style={[T.kicker, { marginBottom: 7 }]}>WHEN TIME RUNS OUT</Text>
          <Text style={[T.label, { fontSize: 16, letterSpacing: 0 }]}>
            {(settings.messages || [])[0] || "TIME'S UP"}
            {(settings.messages || []).length > 1
              ? `  (+${settings.messages.length - 1} more)`
              : ''}
          </Text>
          {canHardBlock && Number(settings.lockoutMs) !== 0 ? (
            <Text style={[T.body, { fontSize: 11, marginTop: 8 }]}>
              {Number(settings.lockoutMs) < 0
                ? `…then ${sheetApp?.name} stays blocked every time you open it, until you stop it here.`
                : `…then ${sheetApp?.name} stays locked for ${humanDuration(settings.lockoutMs)}.`}
            </Text>
          ) : null}
        </Hard>

        <Button
          label={`START ${humanDuration(sheetMs).toUpperCase()}`}
          icon={<IconPlay />}
          onPress={startFromSheet}
        />
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="EDIT"
              variant="outline"
              compact
              onPress={() => {
                const app = sheetApp;
                setSheetApp(null);
                if (app) onEditApp(app);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="REMOVE"
              icon={<IconTrash />}
              variant="outline"
              compact
              onPress={() => {
                const app = sheetApp;
                if (!app) return;
                Alert.alert(
                  `Remove ${app.name}?`,
                  'It disappears from the grid. The app itself stays on your phone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => {
                        setSheetApp(null);
                        onDeleteApp(app.id);
                      },
                    },
                  ]
                );
              }}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}
