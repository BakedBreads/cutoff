import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { C, T } from '../theme';
import { human, uid } from '../format';
import { DURATION_CHIPS } from '../presets';
import { canHardBlock, launchApp, resolvePackage } from '../blocker';
import { Screen, Hard, Field, Chip, Button, Kicker, Body } from '../components/ui';
import { IconCheck, IconPlay, IconAlert } from '../icons';

const splitList = (text) =>
  String(text || '')
    .split(/[\s,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function AppFormScreen({ app, settings, onSave, onBack }) {
  const editing = !!app?.id && !app?.isNew;

  const [name, setName] = useState(app?.name || '');
  const [minutes, setMinutes] = useState(app?.minutes ?? settings.defaultMinutes ?? 20);
  const [custom, setCustom] = useState('');
  const [android, setAndroid] = useState((app?.android || []).join('\n'));
  const [ios, setIos] = useState((app?.ios || []).join('\n'));

  const androidList = splitList(android);
  const iosList = splitList(ios);

  const applyCustom = () => {
    const n = parseInt(custom, 10);
    if (Number.isFinite(n) && n > 0 && n <= 600) {
      setMinutes(n);
      setCustom('');
    } else if (custom) {
      Alert.alert('Pick 1–600 minutes', 'That number is out of range.');
    }
  };

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

    onSave({
      id: app?.id || uid(),
      name: trimmed,
      minutes: Number(minutes) || 20,
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

      <Kicker style={{ marginBottom: 12 }}>Timer length</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {DURATION_CHIPS.map((m) => (
          <Chip key={m} label={human(m)} active={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Field
            value={custom}
            onChangeText={setCustom}
            onBlur={applyCustom}
            placeholder="Custom minutes"
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
        <View style={{ paddingTop: 0 }}>
          <Button label="SET" variant="outline" compact onPress={applyCustom} />
        </View>
      </View>

      <Hard fill={C.wash} inner={{ padding: 14 }} style={{ marginBottom: 26 }}>
        <Text style={[T.kicker, { marginBottom: 6 }]}>CURRENT</Text>
        <Text style={[T.title, { fontSize: 22 }]}>{human(minutes)} per session</Text>
      </Hard>

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
