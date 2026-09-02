import React from 'react';
import { View, Text, Platform } from 'react-native';
import { C, T } from '../theme';
import {
  canHardBlock,
  hasOverlayPermission,
  hasUsagePermission,
  requestOverlayPermission,
  requestUsagePermission,
  openNotificationSettings,
} from '../blocker';
import { Screen, Hard, Button, Kicker, Body } from '../components/ui';
import { IconCheck, IconAlert, IconShield } from '../icons';

function PermRow({ title, why, granted, required, onFix, last }) {
  return (
    <View
      style={{
        paddingVertical: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.rule,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {granted ? (
          <IconCheck size={17} color={C.ok} />
        ) : (
          <IconAlert size={17} color={required ? C.danger : C.dim} />
        )}
        <Text style={[T.label, { flex: 1, fontSize: 13 }]}>{title}</Text>
        <Text
          style={[
            T.kicker,
            { color: granted ? C.ok : required ? C.danger : C.dim, letterSpacing: 1.1 },
          ]}
        >
          {granted ? 'ON' : required ? 'REQUIRED' : 'OPTIONAL'}
        </Text>
      </View>
      <Body style={{ fontSize: 11, marginBottom: granted ? 0 : 12 }}>{why}</Body>
      {!granted ? (
        <Button label="OPEN SETTINGS" variant="outline" compact onPress={onFix} />
      ) : null}
    </View>
  );
}

export default function PermissionsScreen({ onBack, onRefresh }) {
  const overlay = hasOverlayPermission();
  const usage = hasUsagePermission();

  if (!canHardBlock) {
    return (
      <Screen title="Permissions" onBack={onBack}>
        <Hard fill={C.wash} inner={{ padding: 16 }}>
          <IconShield size={22} />
          <Text style={[T.label, { fontSize: 14, marginTop: 12 }]}>Nothing to grant here</Text>
          <Body style={{ marginTop: 8 }}>
            {Platform.OS === 'ios'
              ? "iOS doesn't expose the permissions that would let one app interrupt another, so there's nothing to switch on. Cutoff uses notifications instead."
              : 'This build is running without the native module, so the hard block is unavailable. Build the app with EAS to switch it on.'}
          </Body>
        </Hard>
      </Screen>
    );
  }

  return (
    <Screen title="Permissions" onBack={onBack}>
      <Kicker style={{ marginBottom: 12 }}>Two switches</Kicker>
      <Body style={{ marginBottom: 20 }}>
        Android hands these out one at a time, in its own settings app. Tap through, flip the
        switch for Cutoff, then come back here. You need both for the block to hold.
      </Body>

      <Hard inner={{ paddingHorizontal: 16 }}>
        <PermRow
          title="Display over other apps"
          why="This is the one that matters. Without it the block screen can't draw on top of TikTok — and Android won't let Cutoff interrupt anything from the background."
          granted={overlay}
          required
          onFix={requestOverlayPermission}
        />
        <PermRow
          title="Usage access"
          why="This is what keeps an app blocked. It lets Cutoff notice the moment you reopen the app you were cut off from, and put the screen straight back up. Without it the timer still fires once, but reopening the app gets you back in."
          granted={usage}
          required
          onFix={requestUsagePermission}
          last
        />
      </Hard>

      <View style={{ marginTop: 22 }}>
        <Button label="RE-CHECK" icon={<IconCheck />} onPress={onRefresh} />
      </View>

      <Kicker style={{ marginTop: 36, marginBottom: 12 }}>Also worth doing</Kicker>
      <Hard inner={{ paddingHorizontal: 16 }}>
        <View style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.rule }}>
          <Text style={[T.label, { fontSize: 13, marginBottom: 7 }]}>
            Let notifications through
          </Text>
          <Body style={{ fontSize: 11, marginBottom: 12 }}>
            The countdown lives in a notification. Blocking it doesn't stop the timer, but you
            lose the "end session" shortcut.
          </Body>
          <Button
            label="NOTIFICATION SETTINGS"
            variant="outline"
            compact
            onPress={openNotificationSettings}
          />
        </View>
        <View style={{ paddingVertical: 15 }}>
          <Text style={[T.label, { fontSize: 13, marginBottom: 7 }]}>
            Turn off battery optimisation
          </Text>
          <Body style={{ fontSize: 11 }}>
            Samsung, Xiaomi and Oppo are aggressive about killing background services. In your
            phone's battery settings, set Cutoff to "unrestricted" so a long session survives.
          </Body>
        </View>
      </Hard>

      <Kicker style={{ marginTop: 36, marginBottom: 12 }}>Nothing leaves the phone</Kicker>
      <Body>
        Cutoff has no network code and no analytics. The app list, your wording and the session
        log are stored locally and never uploaded.
      </Body>
    </Screen>
  );
}
