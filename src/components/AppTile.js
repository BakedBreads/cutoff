import React, { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { C, T, MONO } from '../theme';
import { humanDuration, initials } from '../format';
import { canHardBlock, getAppIcon, isAppInstalled } from '../blocker';
import { resolveAndroidPackage } from '../session';
import { HardPress } from './ui';
import { IconClock, IconAlert, IconLock } from '../icons';

/**
 * One app on the home grid. On Android we pull the real launcher icon out of
 * PackageManager; everywhere else we fall back to a mono monogram.
 */
export default function AppTile({ app, size, blocked, onPress, onLongPress }) {
  const [icon, setIcon] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!canHardBlock) return;
    const pkg = resolveAndroidPackage(app);
    if (!pkg || !isAppInstalled(pkg)) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setIcon(getAppIcon(pkg));
  }, [app.id, app.android]);

  return (
    <HardPress
      onPress={onPress}
      onLongPress={onLongPress}
      fill={blocked ? C.ink : C.paper}
      style={{ width: size }}
      inner={{ padding: 14, height: size * 1.06 }}
    >
      {/* icon */}
      <View
        style={{
          width: 52,
          height: 52,
          borderWidth: 2,
          borderColor: blocked ? C.paper : C.ink,
          backgroundColor: blocked ? C.ink : C.wash,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {blocked ? (
          <IconLock size={22} color={C.paper} />
        ) : icon ? (
          <Image source={{ uri: icon }} style={{ width: 48, height: 48 }} resizeMode="cover" />
        ) : (
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 19,
              fontWeight: '700',
              letterSpacing: 0.5,
              color: C.ink,
            }}
          >
            {initials(app.name)}
          </Text>
        )}
      </View>

      <View style={{ flex: 1 }} />

      <Text
        numberOfLines={1}
        style={[
          T.label,
          { fontSize: 15, letterSpacing: 0.2, marginBottom: 8, color: blocked ? C.paper : C.ink },
        ]}
      >
        {app.name}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {blocked ? (
          <>
            <IconLock size={13} color={C.paper} />
            <Text style={[T.kicker, { color: C.paper, letterSpacing: 0.9 }]}>BLOCKED</Text>
          </>
        ) : missing ? (
          <>
            <IconAlert size={13} color={C.danger} />
            <Text style={[T.kicker, { color: C.danger, letterSpacing: 0.9 }]}>NOT INSTALLED</Text>
          </>
        ) : (
          <>
            <IconClock size={13} color={C.dim} />
            <Text style={[T.kicker, { letterSpacing: 0.9 }]}>
              {humanDuration(app.durationMs).toUpperCase()}
            </Text>
          </>
        )}
      </View>
    </HardPress>
  );
}
