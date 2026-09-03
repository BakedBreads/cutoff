import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { C } from '../theme';
import { humanDuration, uid } from '../format';
import { DURATION_CHIPS } from '../presets';
import { canHardBlock, launchApp, resolvePackage } from '../blocker';
import { Screen, Field, Chip, Button, Kicker, Body } from '../components/ui';
import DurationInput from '../components/DurationInput';
import { IconCheck, IconPlay, IconAlert } from '../icons';

const splitList = (text) =>
  String(text || '')
    .split(/[\s,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function AppFormScreen({ app, settings, onSave, onBack }) {
  const editing = !!app?.id && !app?.isNew;

  const [name, setName] = useState(app?.name || '');
  const [durationMs, setDurationMs] = useState(
    app?.durationMs ?? settings.defaultDurationMs ?? 20 * 60_000
  );
  const [android, setAndroid] = useState((app?.android || []).join('\n'));
  const [ios, setIos] = useState((app?.ios || []).join('\n'));

  const androidList = splitList(android);
  const iosList = splitList(ios);

  const test = () => {
    if (canHardBlock) {
      const pkg = resolvePackage(androidList);
      if (!pkg) {
        Alert.alert(
          'No match installed',
          'None of those package names are on this phone. Check the spelling, or pick the app from the "on this phone" list instead.'
        );
        return;
      }
      launchApp(pkg);
    } else {
      Alert.alert(
        'Test on iOS',
        'Save it, then tap the tile on the home grid — that will tell you straight away whether the scheme opens the app.'
      );
    }
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name it first', 'Give the app a name so you can find it on the grid.');
      return;
    }
    if (canHardBlock && androidList.length === 0) {
      Alert.alert(
        'Needs a package name',
        'On Android, Cutoff launches apps by package name (like com.zhiliaoapp.musically).'
      );
      return;
    }
    if (!canHardBlock && iosList.length === 0) {
      Alert.alert(
        'Needs a URL scheme',
        'On iOS, Cutoff opens apps by URL scheme (like tiktok:// or snssdk1128://).'
      );
      return;
    }

    if (!durationMs || durationMs < 1000) {
      Alert.alert('Set a length', 'The timer needs to be at least one second.');
      return;
    }

    onSave({
      id: app?.id || uid(),
      name: trimmed,
      durationMs,
      android: androidList,
      ios: iosList,
      preset: app?.preset,
    });
  };

  return (
    <Screen
      title={editing ? `Edit ${app.name}` : 'New app'}
      onBack={onBack}
      footer={<Button label={editing ? 'SAVE CHANGES' : 'ADD TO GRID'} icon={<IconCheck />} onPress={save} />}
    >
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="TikTok"
        maxLength={24}
        hint="What shows on the tile."
      />

      <Kicker style={{ marginBottom: 14 }}>Timer length</Kicker>

      <View style={{ marginBottom: 18 }}>
        <DurationInput valueMs={durationMs} onChange={setDurationMs} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
        {DURATION_CHIPS.map((ms) => (
          <Chip
            key={ms}
            label={humanDuration(ms)}
            active={durationMs === ms}
            onPress={() => setDurationMs(ms)}
          />
        ))}
      </View>

      {/* ── targets ──────────────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 12 }}>Where it points</Kicker>

      <Field
        label="Android package names"
        value={android}
        onChangeText={setAndroid}
        placeholder={'com.zhiliaoapp.musically\ncom.ss.android.ugc.trill'}
        multiline
        autoCapitalize="none"
        hint="One per line. Cutoff uses the first one that's actually installed — handy for apps that ship under different package names per region."
      />

      <Field
        label="iOS URL schemes"
        value={ios}
        onChangeText={setIos}
        placeholder={'snssdk1128://\ntiktok://'}
        multiline
        autoCapitalize="none"
        hint="One per line, tried in order. Only used on iPhone."
      />

      <Button label="TEST IT OPENS" icon={<IconPlay />} variant="outline" compact onPress={test} />

      {!canHardBlock ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
          <IconAlert size={17} color={C.dim} />
          <Body style={{ flex: 1, fontSize: 11 }}>
            New iOS schemes also need adding to LSApplicationQueriesSchemes in app.json before
            the next build, otherwise the "is it installed?" check always says no. Opening still
            works either way.
          </Body>
        </View>
      ) : null}
    </Screen>
  );
}
