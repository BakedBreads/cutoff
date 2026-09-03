import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_APPS, DEFAULT_SETTINGS } from './presets';

const K_APPS = 'cutoff.apps.v1';
const K_SETTINGS = 'cutoff.settings.v1';
const K_HISTORY = 'cutoff.history.v1';
const K_FALLBACK = 'cutoff.fallbackSession.v1';
const K_STREAK = 'cutoff.streakNotified.v1';

const read = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (e) {
    return fallback;
  }
};

const write = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage full or unavailable — the in-memory state still works this session.
  }
};

// ---- apps -----------------------------------------------------------------

export const loadApps = async () => {
  const apps = await read(K_APPS, null);
  if (!Array.isArray(apps) || apps.length === 0) {
    await write(K_APPS, DEFAULT_APPS);
    return DEFAULT_APPS;
  }
  // v1.1 stored whole minutes; v1.2 stores milliseconds so seconds and hours work.
  let migrated = false;
  const upgraded = apps.map((app) => {
    if (typeof app.durationMs === 'number' && app.durationMs > 0) return app;
    migrated = true;
    const { minutes, ...rest } = app;
    return { ...rest, durationMs: Math.max(1000, (Number(minutes) || 20) * 60_000) };
  });
  if (migrated) await write(K_APPS, upgraded);
  return upgraded;
};

export const saveApps = (apps) => write(K_APPS, apps);

// ---- settings -------------------------------------------------------------

export const loadSettings = async () => {
  const stored = await read(K_SETTINGS, {});
  // Merge so new setting keys pick up defaults on upgrade.
  const merged = { ...DEFAULT_SETTINGS, ...stored };

  // v1.1 kept whole-minute defaults; v1.2 works in milliseconds.
  if (typeof merged.defaultDurationMs !== 'number' || merged.defaultDurationMs <= 0) {
    merged.defaultDurationMs = Math.max(1000, (Number(stored.defaultMinutes) || 20) * 60_000);
  }
  delete merged.defaultMinutes;
  delete merged.holdToEnd;

  // v1.0 kept a single `message`; v1.1 rotates through a list.
  if (!Array.isArray(merged.messages) || merged.messages.length === 0) {
    merged.messages = stored.message
      ? [stored.message]
      : [...DEFAULT_SETTINGS.messages];
  }
  delete merged.message;

  return merged;
};

export const saveSettings = (settings) => write(K_SETTINGS, settings);

// ---- history --------------------------------------------------------------

export const loadHistory = () => read(K_HISTORY, []);

export const pushHistory = async (entry) => {
  const list = await loadHistory();
  const next = [entry, ...list].slice(0, 60);
  await write(K_HISTORY, next);
  return next;
};

export const clearHistory = () => write(K_HISTORY, []);

// ---- iOS / no-native fallback session --------------------------------------

/** Highest streak we've already congratulated, so it only fires once a day. */
export const loadNotifiedStreak = () => read(K_STREAK, 0);
export const saveNotifiedStreak = (n) => write(K_STREAK, n);

export const loadFallbackSession = () => read(K_FALLBACK, null);
export const saveFallbackSession = (s) => write(K_FALLBACK, s);
export const clearFallbackSession = () => AsyncStorage.removeItem(K_FALLBACK).catch(() => {});
