/**
 * Local Expo module — Android only.
 *
 * Nothing in the app imports this file directly; `src/blocker.js` reaches the
 * native side with `requireOptionalNativeModule('AppBlocker')` so that iOS and
 * Expo Go get `null` instead of a hard crash. This file exists so the module
 * folder is self-describing, and for anyone poking at it in a REPL.
 *
 * Native source: android/src/main/java/expo/modules/appblocker/
 *   AppBlockerModule.kt  — the JS-facing surface
 *   BlockerService.kt    — foreground service that runs the countdown
 *   Overlay.kt           — the full-screen "time's up" system overlay
 *   Session.kt           — shared state, backed by SharedPreferences
 *   Usage.kt             — UsageStatsManager wrapper, for the lockout window
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

export default requireOptionalNativeModule('AppBlocker');
