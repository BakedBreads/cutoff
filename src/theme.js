import { Platform } from 'react-native';

/**
 * Mono design language: paper + ink, hard offset shadows, no blur, no emoji.
 * The app is paper-light; the block screen is the inverse.
 */
export const C = {
  /* One ground, everywhere. Cards used to sit on a lighter panel than the page,
     which read as two stacked layers; now borders and shadows do that work. */
  bg: '#F2F1EE',
  paper: '#F2F1EE',
  wash: '#F2F1EE',

  ink: '#0A0A0A',
  dim: '#6B6B6B',
  dimmer: '#A3A099',
  rule: '#D9D7D2',

  /* Hard shadows are grey, not black — they read as depth rather than a second
     outline fighting the border. */
  shadow: '#C3BFB5',

  danger: '#C4231A',
  ok: '#1F7A3D',
};

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const T = {
  /** Small letterspaced kicker — section labels, chips. */
  kicker: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: C.dim,
  },
  label: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.ink,
  },
  body: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 19,
    color: C.dim,
  },
  title: {
    fontFamily: MONO,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: C.ink,
  },
  huge: {
    fontFamily: MONO,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -3,
    color: C.ink,
  },
};

export const SHADOW = 5; // hard shadow offset, in px
