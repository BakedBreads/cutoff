import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { C, T } from '../theme';
import {
  canHardBlock,
  listSounds,
  previewSound,
  stopSound,
  isSilent,
} from '../blocker';
import { Screen, Hard, Field, Toggle, Row, Kicker, Body, Button } from '../components/ui';
import { Enter } from '../components/motion';
import { IconSound, IconCheck, IconAlert, IconStop } from '../icons';

const PAGE = 40;

/**
 * Lists the device's own alarm and notification tones so the chooser stays in
 * the app's look, rather than handing off to Android's ringtone picker.
 */
export default function SoundsScreen({ settings, onChange, onBack }) {
  const [sounds, setSounds] = useState(null);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [playing, setPlaying] = useState(null);
  const silent = canHardBlock ? isSilent() : false;

  useEffect(() => {
    let alive = true;
    listSounds().then((list) => alive && setSounds(list));
    return () => {
      alive = false;
      stopSound();
    };
  }, []);

  useEffect(() => setShown(PAGE), [query]);

  const matched = useMemo(() => {
    if (!sounds) return [];
    const q = query.trim().toLowerCase();
    return sounds.filter((s) => !q || s.title.toLowerCase().includes(q));
  }, [sounds, query]);

  const visible = matched.slice(0, shown);

  const choose = (sound) => {
    onChange({ soundUri: sound.uri, soundName: sound.title });
    setPlaying(sound.uri);
    previewSound(sound.uri);
  };

  const chooseDefault = () => {
    onChange({ soundUri: '', soundName: 'Default alarm' });
    setPlaying('');
    previewSound('');
  };

  if (!canHardBlock) {
    return (
      <Screen title="Sound" onBack={onBack}>
        <Hard fill={C.wash} inner={{ padding: 16 }}>
          <IconSound size={22} />
          <Text style={[T.label, { fontSize: 14, marginTop: 12 }]}>Not available here</Text>
          <Body style={{ marginTop: 8 }}>
            Choosing a tone needs the native Android build. On iPhone the alert uses your
            standard notification sound instead.
          </Body>
        </Hard>
      </Screen>
    );
  }

  return (
    <Screen title="Sound" onBack={onBack}>
      <Hard inner={{ paddingHorizontal: 15 }} style={{ marginBottom: 20 }}>
        <Row
          title="Play a sound at zero"
          subtitle="On top of the vibration"
          right={
            <Toggle
              value={settings.soundEnabled !== false}
              onValueChange={(v) => {
                if (!v) stopSound();
                onChange({ soundEnabled: v });
              }}
            />
          }
        />
        <Row
          title="Keep it playing"
          subtitle="Loops until you dismiss the block screen"
          right={
            <Toggle
              value={!!settings.loopSound}
              onValueChange={(v) => onChange({ loopSound: v })}
            />
          }
          last
        />
      </Hard>

      {silent ? (
        <Hard fill={C.wash} inner={{ padding: 14, flexDirection: 'row', gap: 11 }} style={{ marginBottom: 20 }}>
          <IconAlert size={18} color={C.danger} />
          <Body style={{ flex: 1, fontSize: 11 }}>
            Your alarm volume is at zero, so you won't hear the tone. Turn it up with the
            volume keys while an alarm is playing, or in your sound settings.
          </Body>
        </Hard>
      ) : null}

      <Kicker style={{ marginBottom: 6 }}>Current</Kicker>
      <Hard fill={C.wash} inner={{ padding: 15 }} style={{ marginBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <IconSound size={19} />
          <Text style={[T.label, { flex: 1, fontSize: 14, letterSpacing: 0 }]}>
            {settings.soundName || 'Default alarm'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button
            label="TEST"
            variant="outline"
            compact
            icon={<IconSound />}
            onPress={() => previewSound(settings.soundUri || '')}
          />
          <Button label="STOP" variant="outline" compact icon={<IconStop />} onPress={stopSound} />
        </View>
      </Hard>

      <Field value={query} onChangeText={setQuery} placeholder="Search tones…" autoCapitalize="none" />

      {sounds === null ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={C.ink} />
          <Text style={[T.kicker, { marginTop: 14 }]}>READING TONES</Text>
        </View>
      ) : (
        <>
          <Hard inner={{ paddingHorizontal: 14 }}>
            {/* system default always sits at the top */}
            <SoundRow
              title="Default alarm"
              group="SYSTEM"
              selected={!settings.soundUri}
              onPress={chooseDefault}
              last={visible.length === 0}
            />
            {visible.map((s, i) => (
              <Enter key={s.uri} index={Math.min(i, 8)} distance={6}>
                <SoundRow
                  title={s.title}
                  group={s.group}
                  selected={settings.soundUri === s.uri}
                  onPress={() => choose(s)}
                  last={i === visible.length - 1}
                />
              </Enter>
            ))}
            {sounds.length === 0 ? (
              <Body style={{ paddingVertical: 18 }}>
                No tones found on this device. The default alarm still works.
              </Body>
            ) : null}
          </Hard>

          {matched.length > visible.length ? (
            <View style={{ marginTop: 16 }}>
              <Button
                label={`SHOW ${Math.min(PAGE, matched.length - visible.length)} MORE`}
                variant="outline"
                compact
                onPress={() => setShown((n) => n + PAGE)}
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function SoundRow({ title, group, selected, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.55 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.rule,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderWidth: 2,
          borderColor: C.ink,
          backgroundColor: selected ? C.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <IconCheck size={12} color={C.paper} /> : null}
      </View>
      <Text style={[T.label, { flex: 1, fontSize: 13, letterSpacing: 0 }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[T.kicker, { letterSpacing: 0.9 }]}>{group}</Text>
    </Pressable>
  );
}
