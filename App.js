import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  useWindowDimensions,
  View,
  Alert,
  StatusBar,
  Animated,
  Text,
} from 'react-native';
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
  hasUsagePermission,
  requestOverlayPermission,
} from './src/blocker';
import * as Session from './src/session';

import { ScreenTransition, EASE, Loader } from './src/components/motion';
import { Wordmark } from './src/icons';
import HomeScreen from './src/screens/HomeScreen';
import RunningScreen from './src/screens/RunningScreen';
import TimeUpScreen from './src/screens/TimeUpScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AppsScreen from './src/screens/AppsScreen';
import AppFormScreen from './src/screens/AppFormScreen';
import PickerScreen from './src/screens/PickerScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import AboutScreen from './src/screens/AboutScreen';
import StreakScreen from './src/screens/StreakScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import SoundsScreen from './src/screens/SoundsScreen';

const EMPTY_STATE = {
  running: false,
  remainingMs: 0,
  durationMs: 0,
  paused: false,
  endsAt: 0,
  startedAt: 0,
  expired: false,
  inLockout: false,
  blockedForever: false,
  lockoutRemainingMs: 0,
  appId: '',
  label: '',
  message: '',
  hard: canHardBlock,
};

export default function App() {
  const { height } = useWindowDimensions();
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

  // Cold-start entrance: ink panel, wordmark stamps in, then a hard wipe
  // slides the panel off the top to reveal the app underneath.
  const launch = useRef(new Animated.Value(0)).current;  // app reveal
  const splash = useRef(new Animated.Value(0)).current;  // 0 covered → 1 wiped
  const mark = useRef(new Animated.Value(0)).current;    // wordmark stamp

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
      setPermissionsOk(!canHardBlock || (hasOverlayPermission() && hasUsagePermission()));
      setReady(true);

      Animated.sequence([
        // 1. the mark stamps down
        Animated.spring(mark, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.delay(420),
        // 2. the panel wipes upward while the app rises into place
        Animated.parallel([
          Animated.timing(splash, {
            toValue: 1,
            duration: 760,
            easing: EASE,
            useNativeDriver: true,
          }),
          Animated.timing(launch, {
            toValue: 1,
            duration: 700,
            delay: 140,
            easing: EASE,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    })();
  }, [launch, splash, mark]);

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
      setPermissionsOk(!canHardBlock || (hasOverlayPermission() && hasUsagePermission()));
    });
    return () => sub.remove();
  }, [refresh]);

  // ---- hardware back ------------------------------------------------------

  const stackRef = useRef(stack);
  stackRef.current = stack;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // The block screen doesn't take back for an answer.
      if (stateRef.current.expired) return true;

      if (stackRef.current.length > 1) {
        pop();
        return true;
      }
      // Already home: swallow it so a stray tap can't drop you out of the app.
      return true;
    });
    return () => sub.remove();
  }, []);

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

  const handleStart = async (app, durationMs) => {
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
    const target = { ...app, durationMs: durationMs ?? app.durationMs };
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

  const handleAcknowledge = async () => {
    buzz();
    await Session.acknowledge();
    setHistory(await loadHistory());
    Session.maybeNotifyStreak(settingsRef.current);
    refresh();
    resetToHome();
  };

  const handleEndLockout = async () => {
    await Session.reconcileHistory();
    setHistory(await loadHistory());
    Session.maybeNotifyStreak(settingsRef.current);
    await Session.endLockout();
    refresh();
  };

  /** Tapping a blocked app from the grid: explain, then offer to lift it. */
  const handleUnblock = (app) => {
    const name = app?.name || state.label || 'That app';
    Alert.alert(
      `${name} is blocked`,
      state.blockedForever
        ? `It stays blocked every time you open it, until you lift it here.`
        : `It unlocks on its own shortly.`,
      [
        { text: 'Leave it blocked', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            await Session.endLockout();
            refresh();
          },
        },
      ]
    );
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

  /** Puts every preference back to its shipped value. Apps and history stay. */
  const handleResetSettings = async () => {
    const next = { ...DEFAULT_SETTINGS };
    settingsRef.current = next;
    setSettings(next);
    await saveSettings(next);
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  // ---- render -------------------------------------------------------------

  const activeApp = apps.find((a) => a.id === state.appId) || null;

  const body = () => {
    // The block screen outranks everything else.
    if (state.expired) {
      return (
        <TimeUpScreen
          state={state}
          settings={settings}
          message={state.message}
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
          message={state.message}
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
            onManageMessages={() => push('messages')}
            onOpenSounds={() => push('sounds')}
            onOpenPermissions={() => push('permissions')}
            onOpenAbout={() => push('about')}
            onOpenStreak={() => push('streak')}
            onResetSettings={handleResetSettings}
            onBack={pop}
          />
        );

      case 'about':
        return <AboutScreen history={history} apps={apps} onBack={pop} />;

      case 'streak':
        return <StreakScreen history={history} onBack={pop} />;

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
                app: { ...draft, durationMs: settings.defaultDurationMs, isNew: true },
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

      case 'messages':
        return (
          <MessagesScreen settings={settings} onChange={updateSettings} onBack={pop} />
        );

      case 'sounds':
        return (
          <SoundsScreen settings={settings} onChange={updateSettings} onBack={pop} />
        );

      case 'permissions':
        return (
          <PermissionsScreen
            onBack={pop}
            onRefresh={() =>
              setPermissionsOk(
                !canHardBlock || (hasOverlayPermission() && hasUsagePermission())
              )
            }
          />
        );

      case 'home':
      default:
        return (
          <HomeScreen
            apps={apps}
            settings={settings}
            history={history}
            permissionsOk={permissionsOk}
            blockedAppId={state.inLockout ? state.appId : ''}
            blockedForever={state.blockedForever}
            onUnblock={handleUnblock}
            onDeleteApp={deleteApp}
            onOpenStreak={() => push('streak')}
            onStart={handleStart}
            onEditApp={(app) => push('appform', { app })}
            onAddApp={() => push('picker')}
            onOpenSettings={() => push('settings')}
            onOpenPermissions={() => push('permissions')}
          />
        );
    }
  };

  // The block screen and a live session shouldn't slide — they're states, not pages.
  const isOverlayState = state.expired || (state.running && top.name === 'home');

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={state.expired && settings.darkBlockScreen ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Animated.View
          style={{
            flex: 1,
            opacity: launch,
            transform: [
              {
                translateY: launch.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          }}
        >
          {ready ? (
            isOverlayState ? (
              body()
            ) : (
              <ScreenTransition routeKey={top.name} depth={stack.length}>
                {body()}
              </ScreenTransition>
            )
          ) : null}
        </Animated.View>

        {/* Cold-start panel: an ink sheet that wipes off the top edge. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: C.ink,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            transform: [
              {
                translateY: splash.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -height - 40],
                }),
              },
            ],
          }}
        >
          <Animated.View
            style={{
              opacity: mark,
              transform: [
                { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
              ],
            }}
          >
            <Wordmark size={62} color={C.bg} carve={C.ink} />
          </Animated.View>

          <Animated.Text
            style={[
              T.kicker,
              {
                color: C.bg,
                letterSpacing: 6,
                fontSize: 11,
                opacity: mark,
              },
            ]}
          >
            CUTOFF
          </Animated.Text>

          {/* Squares filling in sequence — reads as the app doing work, rather
              than a spinner borrowed from some other design language. */}
          <Animated.View style={{ opacity: mark, marginTop: 4 }}>
            <Loader color={C.bg} dim="#3A3A3A" size={8} gap={5} />
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaProvider>
  );
}
