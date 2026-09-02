import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Bridge to the native Android blocker. Returns null on iOS, on web, and inside
 * Expo Go (the module isn't compiled into that binary) — every helper below
 * degrades to a safe no-op so the JS fallback path can take over.
 */
const Native = Platform.OS === 'android' ? requireOptionalNativeModule('AppBlocker') : null;

export const hasNativeBlocker = !!Native;

/** True only where a hard block is actually possible. */
export const canHardBlock = Platform.OS === 'android' && !!Native;

const safe = (fn, fallback) => {
  try {
    return Native ? fn(Native) : fallback;
  } catch (e) {
    return fallback;
  }
};

// ---- permissions ----------------------------------------------------------

export const hasOverlayPermission = () => safe((n) => n.hasOverlayPermission(), false);
export const hasUsagePermission = () => safe((n) => n.hasUsagePermission(), false);
export const requestOverlayPermission = () => safe((n) => n.requestOverlayPermission(), null);
export const requestUsagePermission = () => safe((n) => n.requestUsagePermission(), null);
export const openNotificationSettings = () => safe((n) => n.openNotificationSettings(), null);

// ---- app lookup -----------------------------------------------------------

export const isAppInstalled = (pkg) => safe((n) => n.isAppInstalled(pkg), false);

/** First installed package out of a candidate list, or null. */
export const resolvePackage = (candidates) =>
  safe((n) => n.resolvePackage(candidates || []), null);

export const launchApp = (pkg) => safe((n) => n.launchApp(pkg), false);

/**
 * Decoding a launcher icon to base64 isn't free, and the picker can show
 * dozens of rows — so results (misses included) are cached for the session.
 */
const iconCache = new Map();

export const getAppIcon = (pkg) => {
  if (!pkg) return null;
  if (iconCache.has(pkg)) return iconCache.get(pkg);
  const icon = safe((n) => n.getAppIcon(pkg), null);
  iconCache.set(pkg, icon);
  return icon;
};

export const listInstalledApps = async () => {
  if (!Native) return [];
  try {
    return await Native.listInstalledApps();
  } catch (e) {
    return [];
  }
};

// ---- session --------------------------------------------------------------

export const startNativeSession = (config) => safe((n) => n.startSession(config), false);
export const stopNativeSession = () => safe((n) => n.stopSession(), null);
export const acknowledgeNative = () => safe((n) => n.acknowledge(), null);
export const endNativeLockout = () => safe((n) => n.endLockout(), null);
export const dismissOverlay = () => safe((n) => n.dismissOverlay(), null);

export const getNativeState = () =>
  safe((n) => n.getState(), null);

export const previewBlockScreen = (title, subtitle, dark, soundUri, soundEnabled) =>
  safe(
    (n) => n.previewBlockScreen(title, subtitle, !!dark, soundUri || '', !!soundEnabled),
    false
  );

// ---- sounds ---------------------------------------------------------------

export const listSounds = async () => {
  if (!Native) return [];
  try {
    return await Native.listSounds();
  } catch (e) {
    return [];
  }
};

export const defaultSoundUri = () => safe((n) => n.defaultSoundUri(), '');
export const previewSound = (uri) => safe((n) => n.previewSound(uri || ''), null);
export const stopSound = () => safe((n) => n.stopSound(), null);

/** True when alarm volume is zero, so settings can warn the tone won't be heard. */
export const isSilent = () => safe((n) => n.isSilent(), false);
