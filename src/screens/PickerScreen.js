import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';
import { C, T, MONO } from '../theme';
import { initials, uid } from '../format';
import { LIBRARY } from '../presets';
import { canHardBlock, listInstalledApps, getAppIcon, resolvePackage } from '../blocker';
import { Screen, Hard, Chip, Field, Kicker, Body, Button } from '../components/ui';
import { IconPlus, IconCheck } from '../icons';

const TABS = canHardBlock ? ['POPULAR', 'ON THIS PHONE'] : ['POPULAR'];

function PickRow({ label, sub, packageName, taken, onPress, last }) {
  // Decoding a launcher icon is expensive enough that doing it inline for a
  // whole list janks the screen — pull it in after first paint instead.
  const [icon, setIcon] = useState(null);

  useEffect(() => {
    if (!packageName) return;
    const id = setTimeout(() => setIcon(getAppIcon(packageName)), 0);
    return () => clearTimeout(id);
  }, [packageName]);

  // A plain row, not a HardPress — a hard shadow behind a full-width list row
  // would just read as a black bar.
  return (
    <Pressable
      onPress={taken ? undefined : onPress}
      disabled={taken}
      style={({ pressed }) => ({
        opacity: taken ? 0.45 : pressed ? 0.55 : 1,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.rule,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 13,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderWidth: 2,
          borderColor: C.ink,
          backgroundColor: C.wash,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {icon ? (
          <Image source={{ uri: icon }} style={{ width: 34, height: 34 }} />
        ) : (
          <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '700', color: C.ink }}>
            {initials(label)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[T.label, { fontSize: 13, letterSpacing: 0.2 }]}>{label}</Text>
        {sub ? (
          <Text style={[T.body, { fontSize: 10, marginTop: 3, color: C.dimmer }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {taken ? <IconCheck size={17} color={C.dim} /> : <IconPlus size={17} color={C.ink} />}
    </Pressable>
  );
}

const PAGE = 40;

export default function PickerScreen({ existing, onPick, onManual, onBack }) {
  const [tab, setTab] = useState(TABS[0]);
  const [query, setQuery] = useState('');
  const [installed, setInstalled] = useState(null);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (tab !== 'ON THIS PHONE' || installed) return;
    let alive = true;
    listInstalledApps().then((list) => {
      if (alive) setInstalled(list);
    });
    return () => {
      alive = false;
    };
  }, [tab, installed]);

  const takenPackages = useMemo(() => {
    const set = new Set();
    existing.forEach((a) => (a.android || []).forEach((p) => set.add(p)));
    return set;
  }, [existing]);

  const takenNames = useMemo(
    () => new Set(existing.map((a) => a.name.toLowerCase())),
    [existing]
  );

  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY.filter((a) => !q || a.name.toLowerCase().includes(q));
  }, [query]);

  /** Preset -> the package actually on this phone, so known apps show their real icon. */
  const presetPackages = useMemo(() => {
    if (!canHardBlock) return {};
    return LIBRARY.reduce((acc, preset) => {
      acc[preset.key] = resolvePackage(preset.android);
      return acc;
    }, {});
  }, []);

  const matchedInstalled = useMemo(() => {
    if (!installed) return [];
    const q = query.trim().toLowerCase();
    return installed.filter(
      (a) =>
        !q ||
        a.label.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
    );
  }, [installed, query]);

  const filteredInstalled = matchedInstalled.slice(0, shown);

  // A new search should start from the top of the list again.
  useEffect(() => setShown(PAGE), [query, tab]);

  const pickPreset = (preset) => {
    onPick({
      id: uid(),
      name: preset.name,
      android: preset.android,
      ios: preset.ios,
      preset: preset.key,
    });
  };

  const pickInstalled = (entry) => {
    onPick({
      id: uid(),
      name: entry.label,
      android: [entry.packageName],
      ios: [],
    });
  };

  return (
    <Screen title="Add an app" onBack={onBack}>
      {/* tabs */}
      {TABS.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          {TABS.map((t) => (
            <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} />
          ))}
        </View>
      ) : null}

      <Field
        value={query}
        onChangeText={setQuery}
        placeholder="Search…"
        autoCapitalize="none"
      />

      {tab === 'POPULAR' ? (
        <>
          <Kicker style={{ marginBottom: 6 }}>Known apps</Kicker>
          <Body style={{ marginBottom: 14, fontSize: 11 }}>
            Package names and URL schemes already filled in.
          </Body>
          <Hard inner={{ paddingHorizontal: 14 }}>
            {filteredLibrary.map((preset, i) => (
              <PickRow
                key={preset.key}
                label={preset.name}
                sub={canHardBlock ? preset.android[0] : preset.ios[0]}
                packageName={presetPackages[preset.key]}
                taken={
                  takenNames.has(preset.name.toLowerCase()) ||
                  preset.android.some((p) => takenPackages.has(p))
                }
                onPress={() => pickPreset(preset)}
                last={i === filteredLibrary.length - 1}
              />
            ))}
            {filteredLibrary.length === 0 ? (
              <Body style={{ paddingVertical: 18 }}>Nothing matches that.</Body>
            ) : null}
          </Hard>
        </>
      ) : (
        <>
          <Kicker style={{ marginBottom: 6 }}>Installed on this phone</Kicker>
          <Body style={{ marginBottom: 14, fontSize: 11 }}>
            Read straight from Android. Pick anything with a launcher icon.
          </Body>
          {installed === null ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={C.ink} />
              <Text style={[T.kicker, { marginTop: 14 }]}>READING APP LIST</Text>
            </View>
          ) : (
            <>
              <Hard inner={{ paddingHorizontal: 14 }}>
                {filteredInstalled.map((entry, i) => (
                  <PickRow
                    key={entry.packageName}
                    label={entry.label}
                    sub={entry.packageName}
                    packageName={entry.packageName}
                    taken={takenPackages.has(entry.packageName)}
                    onPress={() => pickInstalled(entry)}
                    last={i === filteredInstalled.length - 1}
                  />
                ))}
                {filteredInstalled.length === 0 ? (
                  <Body style={{ paddingVertical: 18 }}>Nothing matches that.</Body>
                ) : null}
              </Hard>

              {matchedInstalled.length > filteredInstalled.length ? (
                <View style={{ marginTop: 16 }}>
                  <Button
                    label={`SHOW ${Math.min(
                      PAGE,
                      matchedInstalled.length - filteredInstalled.length
                    )} MORE`}
                    variant="outline"
                    compact
                    onPress={() => setShown((n) => n + PAGE)}
                  />
                  <Text style={[T.kicker, { marginTop: 12, textAlign: 'center' }]}>
                    {filteredInstalled.length} OF {matchedInstalled.length}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </>
      )}

      <View style={{ marginTop: 26 }}>
        <Kicker style={{ marginBottom: 14 }}>Not listed?</Kicker>
        <Button
          label="ENTER IT MANUALLY"
          variant="outline"
          icon={<IconPlus />}
          onPress={onManual}
        />
      </View>
    </Screen>
  );
}
