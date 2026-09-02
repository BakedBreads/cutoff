import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_APPS, DEFAULT_SETTINGS } from './presets';

const K_APPS = 'cutoff.apps.v1';
const K_SETTINGS = 'cutoff.settings.v1';
const K_HISTORY = 'cutoff.history.v1';
const K_FALLBACK = 'cutoff.fallbackSession.v1';

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
  return apps;
};

export const saveApps = (apps) => write(K_APPS, apps);

// ---- settings -------------------------------------------------------------

export const loadSettings = async () => {
  const stored = await read(K_SETTINGS, {});
  // Merge so new setting keys pick up defaults on upgrade.
  return { ...DEFAULT_SETTINGS, ...stored };
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

export const loadFallbackSession = () => read(K_FALLBACK, null);
export const saveFallbackSession = (s) => write(K_FALLBACK, s);
export const clearFallbackSession = () => AsyncStorage.removeItem(K_FALLBACK).catch(() => {});
