import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  canHardBlock,
  getNativeState,
  launchApp,
  resolvePackage,
  startNativeSession,
  stopNativeSession,
  acknowledgeNative,
  endNativeLockout,
} from './blocker';
import {
  loadFallbackSession,
  saveFallbackSession,
  clearFallbackSession,
  pushHistory,
} from './storage';

/**
 * One session API for both platforms.
 *
 *  Android  → native foreground service + system overlay (hard block).
 *  iOS      → JS deadline + scheduled notifications, and the app takes over its
 *             own screen when you return. iOS gives no app the power to
 *             interrupt another one; this is as far as the platform allows.
 */

const EMPTY = {
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

let fallback = null; // { appId, label, endsAt, durationMs, lockoutUntil, expired }
let listeners = new Set();

// ---- notifications ---------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const initNotifications = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cutoff-alarm', {
        name: "Time's up",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 150, 400],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && current.canAskAgain !== false) {
      await Notifications.requestPermissionsAsync();
    }
  } catch (e) {
    // Notifications are a nice-to-have on Android (the overlay is the real block).
  }
};

const secondsTrigger = (seconds) => {
  const s = Math.max(1, Math.round(seconds));
  const Types = Notifications.SchedulableTriggerInputTypes;
  return Types
    ? { type: Types.TIME_INTERVAL, seconds: s, repeats: false }
    : { seconds: s, repeats: false };
};

const scheduleAlarms = async (settings, label, durationMs) => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const totalSec = durationMs / 1000;
    if (totalSec > 90) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '1 minute left',
          body: `${label} session is nearly over.`,
          sound: false,
        },
        trigger: secondsTrigger(totalSec - 60),
        identifier: 'cutoff-warn',
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: settings.message || "TIME'S UP",
        body: settings.submessage || `Your ${label} time is over.`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' ? { channelId: 'cutoff-alarm' } : {}),
      },
      trigger: secondsTrigger(totalSec),
      identifier: 'cutoff-end',
    });
  } catch (e) {
    // A failed schedule shouldn't block the session from starting.
  }
};

const cancelAlarms = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {}
};

// ---- launching -------------------------------------------------------------

const packageCache = new Map();

/** Which of the candidate Android packages is actually installed. */
export const resolveAndroidPackage = (app) => {
  if (!canHardBlock) return null;
  const list = app.android || [];
  // Key on the candidate list too, so editing an app's packages busts the cache.
  const key = `${app.id}:${list.join(',')}`;
  if (packageCache.has(key)) return packageCache.get(key);
  const found = resolvePackage(list) || list[0] || null;
  packageCache.set(key, found);
  return found;
};

const openViaScheme = async (app) => {
  const schemes = app.ios || [];
  for (const scheme of schemes) {
    try {
      if (await Linking.canOpenURL(scheme)) {
        await Linking.openURL(scheme);
        return true;
      }
    } catch (e) {}
  }
  // canOpenURL lies when the scheme isn't in LSApplicationQueriesSchemes — just try.
  for (const scheme of schemes) {
    try {
      await Linking.openURL(scheme);
      return true;
    } catch (e) {}
  }
  return false;
};

// ---- public API ------------------------------------------------------------

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const emit = () => {
  const state = getState();
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {}
  });
};

export const hydrate = async () => {
  if (!canHardBlock) {
    fallback = await loadFallbackSession();
    // Roll a stale session forward: if the deadline passed while we were closed,
    // it counts as expired, not as still-running.
    if (fallback && fallback.endsAt && Date.now() >= fallback.endsAt && !fallback.expired) {
      fallback = { ...fallback, expired: true };
      await saveFallbackSession(fallback);
    }
  }
  emit();
};

export const getState = () => {
  if (canHardBlock) {
    const s = getNativeState();
    if (!s) return EMPTY;
    return {
      running: !!s.running,
      remainingMs: Number(s.remainingMs) || 0,
      durationMs: Number(s.durationMs) || 0,
      expired: !!s.expired,
      inLockout: !!s.inLockout,
      lockoutRemainingMs: Number(s.lockoutRemainingMs) || 0,
      appId: s.appId || '',
      label: s.label || '',
      overlayShowing: !!s.overlayShowing,
      hard: true,
    };
  }

  if (!fallback) return EMPTY;
  const now = Date.now();
  const remaining = Math.max(0, (fallback.endsAt || 0) - now);
  const lockoutRemaining = Math.max(0, (fallback.lockoutUntil || 0) - now);
  const expired = fallback.expired || (fallback.endsAt > 0 && remaining <= 0);
  return {
    running: !expired && remaining > 0,
    remainingMs: remaining,
    durationMs: fallback.durationMs || 0,
    expired,
    inLockout: lockoutRemaining > 0,
    lockoutRemainingMs: lockoutRemaining,
    appId: fallback.appId || '',
    label: fallback.label || '',
    overlayShowing: false,
    hard: false,
  };
};

export const start = async (app, settings) => {
  const minutes = Number(app.minutes) || settings.defaultMinutes || 20;
  const durationMs = minutes * 60_000;
  const lockoutMs = Math.max(0, Number(settings.lockoutMinutes) || 0) * 60_000;

  if (canHardBlock) {
    const pkg = resolveAndroidPackage(app);
    if (!pkg) return { ok: false, reason: 'not-installed' };

    startNativeSession({
      appId: app.id,
      packageName: pkg,
      label: app.name,
      durationMs,
      lockoutMs,
      title: settings.message || "TIME'S UP",
      subtitle: settings.submessage || '',
      dark: !!settings.darkBlockScreen,
      vibrate: settings.vibrate !== false,
      launch: true,
    });
    emit();
    return { ok: true };
  }

  // ---- iOS / Expo Go path ----
  const opened = await openViaScheme(app);
  if (!opened) return { ok: false, reason: 'not-installed' };

  fallback = {
    appId: app.id,
    label: app.name,
    durationMs,
    endsAt: Date.now() + durationMs,
    lockoutUntil: lockoutMs > 0 ? Date.now() + durationMs + lockoutMs : 0,
    expired: false,
  };
  await saveFallbackSession(fallback);
  await scheduleAlarms(settings, app.name, durationMs);
  emit();
  return { ok: true };
};

/** Ends the session early, with no block screen and no lockout. */
export const stop = async () => {
  const state = getState();
  if (state.durationMs > 0) {
    await pushHistory({
      at: Date.now(),
      app: state.label,
      plannedMs: state.durationMs,
      actualMs: state.durationMs - state.remainingMs,
      endedEarly: true,
    });
  }
  if (canHardBlock) {
    stopNativeSession();
  } else {
    fallback = null;
    await clearFallbackSession();
    await cancelAlarms();
  }
  emit();
};

/** User has seen the "time's up" screen inside the app. Lockout keeps running. */
export const acknowledge = async () => {
  const state = getState();
  if (state.durationMs > 0) {
    await pushHistory({
      at: Date.now(),
      app: state.label,
      plannedMs: state.durationMs,
      actualMs: state.durationMs,
      endedEarly: false,
    });
  }
  if (canHardBlock) {
    acknowledgeNative();
  } else {
    if (fallback) {
      fallback = { ...fallback, expired: false, endsAt: 0 };
      await saveFallbackSession(fallback);
    }
    await cancelAlarms();
  }
  emit();
};

export const endLockout = async () => {
  if (canHardBlock) {
    endNativeLockout();
  } else {
    fallback = null;
    await clearFallbackSession();
  }
  emit();
};

export const relaunchTarget = async (app) => {
  if (canHardBlock) {
    const pkg = resolveAndroidPackage(app);
    return pkg ? launchApp(pkg) : false;
  }
  return openViaScheme(app);
};
