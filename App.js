import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Alert, StatusBar, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { C, T } from './src/theme';
import {
  loadApps,
  saveApps,
  loadSettings,
  saveSettings,
  loadHistory,
  clearHistory,
} from './src/storage';
import { DEFAULT_SETTINGS } from './src/presets';
import {
  canHardBlock,
  hasOverlayPermission,
  requestOverlayPermission,
} from './src/blocker';
import * as Session from './src/session';

import HomeScreen from './src/screens/HomeScreen';
import RunningScreen from './src/screens/RunningScreen';
import TimeUpScreen from './src/screens/TimeUpScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AppsScreen from './src/screens/AppsScreen';
import AppFormScreen from './src/screens/AppFormScreen';
import PickerScreen from './src/screens/PickerScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';

const EMPTY_STATE = {
  running: false,
  remainingMs: 0,
  durationMs: 0,
  expired: false,
  inLockout: false,
  lockoutRemainingMs: 0,
  appId: '',
  label: '',
  hard: canHardBlock,
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [apps, setApps] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [history, setHistory] = useState([]);
  const [state, setState] = useState(EMPTY_STATE);
  const [permissionsOk, setPermissionsOk] = useState(true);

  // Simple stack — this app has one path in and one path out of each screen.
  const [stack, setStack] = useState([{ name: 'home' }]);
  const top = stack[stack.length - 1];

  const push = (name, params) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const resetToHome = () => setStack([{ name: 'home' }]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // ---- boot ---------------------------------------------------------------

  useEffect(() => {
    (async () => {
      const [a, s, h] = await Promise.all([loadApps(), loadSettings(), loadHistory()]);
      setApps(a);
      setSettings(s);
      setHistory(h);
      await Session.initNotifications();
      await Session.hydrate();
      setState(Session.getState());
      setPermissionsOk(!canHardBlock || hasOverlayPermission());
      setReady(true);
    })();
  }, []);

  // ---- keep session state fresh -------------------------------------------

  const refresh = useCallback(() => {
    setState(Session.getState());
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 500);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => Session.subscribe(setState), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      Session.hydrate();
      refresh();
      setPermissionsOk(!canHardBlock || hasOverlayPermission());
    });
    return () => sub.remove();
  }, [refresh]);

  // ---- persistence helpers ------------------------------------------------

  const updateApps = (next) => {
    setApps(next);
    saveApps(next);
  };

  const updateSettings = (patch) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  };

  // ---- actions ------------------------------------------------------------

  const buzz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleStart = async (app, minutes) => {
    if (canHardBlock && !hasOverlayPermission()) {
      Alert.alert(
        'One switch first',
        'Cutoff needs "Display over other apps" to put the block screen on top of ' +
          app.name + '. Without it the timer runs but nothing interrupts you.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: requestOverlayPermission },
        ]
      );
      return;
    }

    buzz();
    const target = { ...app, minutes: minutes ?? app.minutes };
    const result = await Session.start(target, settingsRef.current);

    if (!result.ok) {
      Alert.alert(
        `Can't open ${app.name}`,
        canHardBlock
          ? "None of that app's package names are installed on this phone. Edit the app and pick it from the \"on this phone\" list."
          : "That URL scheme didn't open anything. Either the app isn't installed or the scheme is wrong.",
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Edit app', onPress: () => push('appform', { app }) },
        ]
      );
      return;
    }
    refresh();
  };

  const handleStop = async () => {
    await Session.stop();
    setHistory(await loadHistory());
    refresh();
    resetToHome();
  };

  const handleAcknowledge = async () => {
    buzz();
    await Session.acknowledge();
    setHistory(await loadHistory());
    refresh();
    resetToHome();
  };

  const handleEndLockout = async () => {
    await Session.endLockout();
    refresh();
  };

  const handleBackToApp = async () => {
    const app = apps.find((a) => a.id === state.appId);
    if (app) await Session.relaunchTarget(app);
  };

  const saveApp = (app) => {
    const exists = apps.some((a) => a.id === app.id);
    updateApps(exists ? apps.map((a) => (a.id === app.id ? app : a)) : [...apps, app]);
    // Back past the form and, if we came through it, the picker too.
    setStack((s) => {
      const trimmed = s.filter((f) => f.name !== 'appform' && f.name !== 'picker');
      return trimmed.length ? trimmed : [{ name: 'home' }];
    });
  };

  const deleteApp = (id) => updateApps(apps.filter((a) => a.id !== id));

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  // ---- render -------------------------------------------------------------

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: C.bg,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <ActivityIndicator color={C.ink} />
          <Text style={[T.kicker, { letterSpacing: 3 }]}>CUTOFF</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  const activeApp = apps.find((a) => a.id === state.appId) || null;

  const body = () => {
    // The block screen outranks everything else.
    if (state.expired) {
      return (
        <TimeUpScreen
          state={state}
          settings={settings}
          onDone={handleAcknowledge}
          onEndLockout={handleEndLockout}
        />
      );
    }

    // A live session takes over the home slot, but you can still reach settings.
    if (state.running && top.name === 'home') {
      return (
        <RunningScreen
          state={state}
          app={activeApp}
          settings={settings}
          onStop={handleStop}
          onBackToApp={handleBackToApp}
          onOpenSettings={() => push('settings')}
        />
      );
    }

    switch (top.name) {
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onChange={updateSettings}
            history={history}
            onClearHistory={handleClearHistory}
            onManageApps={() => push('apps')}
            onOpenPermissions={() => push('permissions')}
            onBack={pop}
          />
        );

      case 'apps':
        return (
          <AppsScreen
            apps={apps}
            onAdd={() => push('picker')}
            onEdit={(app) => push('appform', { app })}
            onDelete={deleteApp}
            onBack={pop}
          />
        );

      case 'picker':
        return (
          <PickerScreen
            existing={apps}
            onPick={(draft) =>
              push('appform', {
                app: { ...draft, minutes: settings.defaultMinutes, isNew: true },
              })
            }
            onManual={() => push('appform', { app: { isNew: true } })}
            onBack={pop}
          />
        );

      case 'appform':
        return (
          <AppFormScreen
            app={top.params?.app}
            settings={settings}
            onSave={saveApp}
            onBack={pop}
          />
        );

      case 'permissions':
        return (
          <PermissionsScreen
            onBack={pop}
            onRefresh={() => setPermissionsOk(!canHardBlock || hasOverlayPermission())}
          />
        );

      case 'home':
      default:
        return (
          <HomeScreen
            apps={apps}
            settings={settings}
            permissionsOk={permissionsOk}
            onStart={handleStart}
            onEditApp={(app) => push('appform', { app })}
            onAddApp={() => push('picker')}
            onOpenSettings={() => push('settings')}
            onOpenPermissions={() => push('permissions')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={state.expired && settings.darkBlockScreen ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View style={{ flex: 1, backgroundColor: C.bg }}>{body()}</View>
    </SafeAreaProvider>
  );
}
