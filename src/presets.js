/**
 * App library. `android` is a candidate list — TikTok ships under different
 * package names per region, so we resolve to whichever is actually installed.
 * `ios` is a candidate list of URL schemes, tried in order.
 */
export const LIBRARY = [
  {
    key: 'tiktok',
    name: 'TikTok',
    android: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.ss.android.ugc.aweme'],
    ios: ['snssdk1128://', 'tiktok://'],
  },
  {
    key: 'instagram',
    name: 'Instagram',
    android: ['com.instagram.android'],
    ios: ['instagram://app'],
  },
  {
    key: 'youtube',
    name: 'YouTube',
    android: ['com.google.android.youtube'],
    ios: ['youtube://'],
  },
  {
    key: 'x',
    name: 'X',
    android: ['com.twitter.android'],
    ios: ['twitter://'],
  },
  {
    key: 'reddit',
    name: 'Reddit',
    android: ['com.reddit.frontpage'],
    ios: ['reddit://'],
  },
  {
    key: 'snapchat',
    name: 'Snapchat',
    android: ['com.snapchat.android'],
    ios: ['snapchat://'],
  },
  {
    key: 'facebook',
    name: 'Facebook',
    android: ['com.facebook.katana'],
    ios: ['fb://'],
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    android: ['com.whatsapp', 'com.whatsapp.w4b'],
    ios: ['whatsapp://'],
  },
  {
    key: 'telegram',
    name: 'Telegram',
    android: ['org.telegram.messenger'],
    ios: ['tg://'],
  },
  {
    key: 'discord',
    name: 'Discord',
    android: ['com.discord'],
    ios: ['discord://'],
  },
  {
    key: 'netflix',
    name: 'Netflix',
    android: ['com.netflix.mediaclient'],
    ios: ['nflx://'],
  },
  {
    key: 'spotify',
    name: 'Spotify',
    android: ['com.spotify.music'],
    ios: ['spotify://'],
  },
  {
    key: 'twitch',
    name: 'Twitch',
    android: ['tv.twitch.android.app'],
    ios: ['twitch://'],
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    android: ['com.pinterest'],
    ios: ['pinterest://'],
  },
  {
    key: 'shopee',
    name: 'Shopee',
    android: ['com.shopee.id', 'com.shopee.my', 'com.shopee.sg', 'com.shopee.ph'],
    ios: ['shopee://'],
  },
  {
    key: 'tokopedia',
    name: 'Tokopedia',
    android: ['com.tokopedia.tkpd'],
    ios: ['tokopedia://'],
  },
];

export const findPreset = (key) => LIBRARY.find((a) => a.key === key) || null;

/** What a brand-new install starts with. */
export const DEFAULT_APPS = [
  {
    id: 'tiktok',
    name: 'TikTok',
    android: LIBRARY[0].android,
    ios: LIBRARY[0].ios,
    minutes: 20,
  },
];

export const DEFAULT_SETTINGS = {
  /** Big lines for the block screen. One is picked at random per session. */
  messages: ['TIME TO STUDY'],
  /** The smaller line under it. */
  submessage: 'Put the phone down. You said you would.',
  /**
   * How long the app stays blocked after the timer ends.
   * -1 = until you stop it in Cutoff (the default), 0 = off, or a minute count.
   */
  lockoutMinutes: -1,
  /** Default length for newly added apps. */
  defaultMinutes: 20,
  /** Block screen palette: false = paper (white), true = blackout. */
  darkBlockScreen: false,
  vibrate: true,
  /** Ask before starting, instead of launching immediately on tap. */
  confirmBeforeStart: false,
  /** Play a tone when time runs out. */
  soundEnabled: true,
  /** Chosen tone; empty means the system default alarm. */
  soundUri: '',
  soundName: 'Default alarm',
  /** Keep the tone going until the block screen is dismissed. */
  loopSound: false,
  /** Make ending a session early require a deliberate press-and-hold. */
  holdToEnd: true,
};

export const DURATION_CHIPS = [5, 10, 15, 20, 30, 45, 60, 90];

/** Ready-made lines, offered when adding a new message. */
export const MESSAGE_IDEAS = [
  'TIME TO STUDY',
  'THAT’S ENOUGH',
  'PUT IT DOWN',
  'GO DO THE THING',
  'YOU SAID 20 MINUTES',
  'STOP SCROLLING',
  'BACK TO WORK',
  'FUTURE YOU IS WATCHING',
];
