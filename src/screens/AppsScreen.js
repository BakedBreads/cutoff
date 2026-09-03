import React from 'react';
import { View, Text, Alert, Image } from 'react-native';
import { C, T, MONO } from '../theme';
import { humanDuration, initials } from '../format';
import { canHardBlock, getAppIcon, isAppInstalled } from '../blocker';
import { resolveAndroidPackage } from '../session';
import { Screen, Hard, HardPress, Button, Kicker, Body } from '../components/ui';
import { IconPlus, IconEdit, IconTrash, IconAlert } from '../icons';

function AppRow({ app, onEdit, onDelete, last }) {
  const pkg = canHardBlock ? resolveAndroidPackage(app) : null;
  const installed = pkg ? isAppInstalled(pkg) : true;
  const icon = installed && pkg ? getAppIcon(pkg) : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.rule,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderWidth: 2,
          borderColor: C.ink,
          backgroundColor: C.wash,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {icon ? (
          <Image source={{ uri: icon }} style={{ width: 36, height: 36 }} />
        ) : (
          <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: '700', color: C.ink }}>
            {initials(app.name)}
          </Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[T.label, { fontSize: 14, letterSpacing: 0.2 }]}>{app.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {installed ? (
            <Text style={[T.kicker, { letterSpacing: 0.9 }]}>
              {humanDuration(app.durationMs).toUpperCase()} PER SESSION
            </Text>
          ) : (
            <>
              <IconAlert size={12} color={C.danger} />
              <Text style={[T.kicker, { color: C.danger, letterSpacing: 0.9 }]}>
                NOT INSTALLED
              </Text>
            </>
          )}
        </View>
      </View>

      <HardPress
        onPress={onEdit}
        offset={3}
        inner={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <IconEdit size={16} />
      </HardPress>
      <HardPress
        onPress={onDelete}
        offset={3}
        fill={C.wash}
        inner={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <IconTrash size={16} color={C.danger} />
      </HardPress>
    </View>
  );
}

export default function AppsScreen({ apps, onAdd, onEdit, onDelete, onBack }) {
  const confirmDelete = (app) =>
    Alert.alert(`Remove ${app.name}?`, 'It disappears from the home grid.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(app.id) },
    ]);

  return (
    <Screen title="Apps" onBack={onBack}>
      <Kicker style={{ marginBottom: 14 }}>{apps.length} in the grid</Kicker>

      {apps.length === 0 ? (
        <Body style={{ marginBottom: 22 }}>
          Nothing here yet. Add the app you keep losing time to.
        </Body>
      ) : (
        <Hard inner={{ paddingHorizontal: 14 }} style={{ marginBottom: 24 }}>
          {apps.map((app, i) => (
            <AppRow
              key={app.id}
              app={app}
              last={i === apps.length - 1}
              onEdit={() => onEdit(app)}
              onDelete={() => confirmDelete(app)}
            />
          ))}
        </Hard>
      )}

      <Button label="ADD AN APP" icon={<IconPlus />} onPress={onAdd} />

      <Kicker style={{ marginTop: 36, marginBottom: 12 }}>How this works</Kicker>
      <Body>
        {canHardBlock
          ? 'Cutoff launches the real app by its Android package name — no browser, no copy of it. The countdown runs in a foreground service so it keeps going while you scroll.'
          : "Cutoff opens the real app through its URL scheme. If an app won't open, its scheme is either wrong or the app isn't installed."}
      </Body>
    </Screen>
  );
}
