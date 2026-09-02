# Cutoff

A real native app — React Native + a custom Android module. No WebView, no browser
wrapper. You tap TikTok, it launches the actual TikTok app, and when the timer runs
out your own screen slams down on top of it saying whatever you told it to say.

---

## What it does

- **Home grid** of apps. TikTok is there out of the box. Tap → the real app opens and
  the countdown starts. Hold a tile → change the length for that run.
- **Timer keeps running while you scroll.** On Android it lives in a foreground
  service, so leaving Cutoff doesn't pause anything.
- **Time's up → a full-screen takeover.** On Android this is a system overlay drawn
  *on top of TikTok*, so you get thrown out of the feed whether you like it or not.
- **The block sticks.** By default it doesn't expire: every time you reopen that app,
  the screen comes straight back. The overlay has no stop button of its own — lifting
  it means opening Cutoff and holding a button for two seconds. (A timed window of
  5–60 minutes is still available if you'd rather.)
- **Your words, plural.** Keep a list of lines and Cutoff picks one at random each
  session, so the same sentence doesn't stop landing after a week.
- **Your alarm tone.** Reads the device's own alarm and notification sounds and lists
  them in-app, with optional looping until the screen is dismissed.
- **A notification that earns its place.** Self-updating countdown, progress bar, and
  actions that change with the state — end / back to the app / open Cutoff while
  running, just open Cutoff once blocked.
- **More apps.** Add from a built-in library (Instagram, YouTube, Reddit, Shopee…),
  from a list of everything installed on the phone, or by typing a package name /
  URL scheme yourself.
- **Stats.** A seven-day bar chart and a day streak, on the home screen and in
  settings.

---

## The one honest caveat

**No app on a non-rooted phone can force-quit another app.** Not Cutoff, not
Digital Wellbeing, not any "app blocker" on the store. What they all actually do —
and what Cutoff does — is cover the offending app with their own screen and bounce
you to the home screen. In practice that ends the session just as hard.

| | Android | iPhone |
|---|---|---|
| Launches the real app | yes | yes |
| Timer survives leaving Cutoff | yes (foreground service) | yes (scheduled alarm) |
| Screen covers TikTok at zero | **yes** | no — iOS forbids it |
| Stays blocked on reopen | **yes** | no — iOS can't see what you open |
| Custom alarm tone | yes | system notification sound only |
| At zero you get | full-screen takeover + buzz | full-screen alert you tap |

iOS sandboxing is the whole reason for that column. The only official iOS route is
Apple's Screen Time / FamilyControls entitlement, which Apple grants case by case
and isn't available to a sideloaded personal build. Everything else on iOS is
notification-based, including the paid apps.

---

## Build it

**The APK builds on GitHub Actions** — push to `main` and roughly fifteen minutes
later the workflow attaches a signed APK as a build artifact. That's the path this
project actually uses; `.github/workflows/android.yml` is the whole of it.

EAS is set up too and works, but its free queue sat on a job for thirty hours here,
so GitHub is the faster horse. For EAS you need [Node](https://nodejs.org) and a free
[Expo account](https://expo.dev/signup) — no Android Studio and no Xcode either way.

```bash
npm install
```

Pin every package to the versions this Expo SDK expects:

```bash
npx expo install --fix
```

Log in and link the project (this rewrites the placeholder `projectId` in `app.json`):

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

### Android — the APK you actually want

```bash
npx eas-cli@latest build -p android --profile preview
```

When it finishes, EAS gives you a QR code and a download link. Open it on the phone,
install the APK (Android will ask you to allow installs from that source), done.

### iPhone

A device build needs an Apple Developer account:

```bash
npx eas-cli@latest build -p ios --profile preview
```

Without a paid Apple account you can still run it on a phone through a local
development build (`npx expo run:ios` on a Mac) for 7 days at a time.

### Running it locally while you tweak

`npx expo start` alone won't work — **Expo Go can't load the native module**, so the
hard block silently degrades to timer-only mode. Make a development build once:

```bash
npx eas-cli@latest build -p android --profile development
```

Install that, then `npx expo start --dev-client` gives you live reload *with* the
native blocker working.

---

## First run on Android

Cutoff will nag you for one permission and suggest a second.

1. **Display over other apps** — *required*. This is what lets the block screen
   cover TikTok. It's also what exempts Cutoff from Android's background
   activity-start restrictions, so without it nothing interrupts you at all.
2. **Usage access** — *optional*, only for the lockout window. It lets Cutoff notice
   you reopening the app it just cut you off from.

Also worth doing: set Cutoff's battery usage to **Unrestricted**. Samsung, Xiaomi,
Oppo and friends kill background services aggressively, which can cut a long
session short.

---

## Layout

```
App.js                     screen routing + state wiring
src/
  theme.js                 paper/ink palette, mono type scale
  icons.js                 hand-drawn SVG icon set (no emoji anywhere)
  presets.js               app library, defaults
  storage.js               AsyncStorage wrappers
  blocker.js               native bridge, degrades to no-ops off Android
  session.js               one session API over native + JS fallback
  format.js                clock / duration formatting
  components/              Hard, HardPress, Button, Field, Toggle, Stepper,
                           Sheet, AppTile, Stats, motion (transitions, hold
                           buttons, progress)
  screens/                 Home, Running, TimeUp, Settings, Apps, AppForm,
                           Picker, Permissions, Messages, Sounds
modules/app-blocker/       the native Android module
  android/src/main/java/expo/modules/appblocker/
    AppBlockerModule.kt      JS-facing surface
    BlockerService.kt        foreground service, runs the countdown
    Overlay.kt               the full-screen system overlay
    Session.kt               shared state (SharedPreferences)
    Usage.kt                 UsageStatsManager wrapper
    Sounds.kt                alarm tone listing and playback
```

`/android` and `/ios` are gitignored on purpose — they're generated by
`npx expo prebuild` and shouldn't be hand-edited. Everything native that matters
lives in `modules/app-blocker`.

---

## Adding an app that isn't in the library

Settings → Apps → Add an app → **Enter it manually**.

- **Android package name** — e.g. `com.zhiliaoapp.musically`. Easiest way to find it:
  use the "on this phone" tab instead, which reads them straight off the device. You
  can list several one per line and Cutoff uses whichever is actually installed
  (handy for apps like TikTok and Shopee that ship different packages per region).
- **iOS URL scheme** — e.g. `snssdk1128://`. New schemes also need adding to
  `ios.infoPlist.LSApplicationQueriesSchemes` in `app.json` before the next build,
  otherwise the "is it installed?" check always answers no. Opening still works.

---

## Notes

- Nothing leaves the phone. There's no network code and no analytics; apps,
  wording and the session log are stored locally.
- `QUERY_ALL_PACKAGES` is declared so the "on this phone" picker can list your apps.
  Google Play restricts that permission, so this build is meant for sideloading —
  if you ever wanted it on Play you'd swap it for a fixed `<queries>` list.
- Built against **Expo SDK 52**; `npx expo-doctor` passes 18/18 and both the Android
  and iOS JS bundles build clean.
- **Heads up about this machine:** there's a stray `node_modules` folder sitting
  directly in `C:\Users\Naufan\`. Node walks up the directory tree when resolving,
  so packages missing from a project get silently picked up from there — which is
  how `expo-asset`, `expo-file-system`, `expo-font` and `expo-keep-awake` were
  initially resolving at version 57.x (Expo SDK 54+) inside an SDK 52 project.
  They're now pinned explicitly in `package.json`, so this project is safe. Any
  *other* JS project under your home folder has the same trap waiting, though —
  deleting `C:\Users\Naufan\node_modules` is almost certainly the right move if
  you don't remember creating it.
- The block overlay is always dismissable. An overlay you can't dismiss is a genuinely
  dangerous thing to put on a phone you might need to answer a call on.
