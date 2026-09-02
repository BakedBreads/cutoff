import React from 'react';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { C } from './theme';

/**
 * Hand-drawn geometric icon set. Square 24 grid, 2px strokes, butt caps —
 * deliberately mechanical to match the mono type. No emoji anywhere.
 */

const Base = ({ size = 22, color = C.ink, children, fill = 'none', sw = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
    {React.Children.map(children, (child) =>
      child
        ? React.cloneElement(child, {
            stroke: child.props.stroke === 'none' ? 'none' : color,
            strokeWidth: child.props.strokeWidth ?? sw,
            strokeLinecap: 'square',
            strokeLinejoin: 'miter',
          })
        : child
    )}
  </Svg>
);

export const IconClock = (p) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="9" />
    <Polyline points="12 6.5 12 12 16 14" fill="none" />
  </Base>
);

export const IconGear = (p) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="3.2" />
    <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
  </Base>
);

export const IconPlus = (p) => (
  <Base {...p}>
    <Path d="M12 4v16M4 12h16" />
  </Base>
);

export const IconClose = (p) => (
  <Base {...p}>
    <Path d="M5 5l14 14M19 5L5 19" />
  </Base>
);

export const IconBack = (p) => (
  <Base {...p}>
    <Path d="M20 12H4M10 6l-6 6 6 6" />
  </Base>
);

export const IconChevron = (p) => (
  <Base {...p}>
    <Path d="M9 5l7 7-7 7" />
  </Base>
);

export const IconCheck = (p) => (
  <Base {...p}>
    <Path d="M4 12.5l5.5 5.5L20 6.5" />
  </Base>
);

export const IconTrash = (p) => (
  <Base {...p}>
    <Path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10.5 10.5v6M13.5 10.5v6" />
  </Base>
);

export const IconEdit = (p) => (
  <Base {...p}>
    <Path d="M4 20h4L20 8l-4-4L4 16v4z" />
  </Base>
);

export const IconLock = (p) => (
  <Base {...p}>
    <Rect x="4" y="10" width="16" height="11" />
    <Path d="M8 10V7a4 4 0 018 0v3" />
  </Base>
);

export const IconPlay = (p) => (
  <Base {...p}>
    <Path d="M6 4l14 8-14 8V4z" />
  </Base>
);

export const IconStop = (p) => (
  <Base {...p}>
    <Rect x="5" y="5" width="14" height="14" />
  </Base>
);

export const IconAlert = (p) => (
  <Base {...p}>
    <Path d="M12 3L1.5 21h21L12 3z" />
    <Path d="M12 9.5v5" />
    <Path d="M12 17.6v.2" strokeWidth="2.4" />
  </Base>
);

export const IconGrid = (p) => (
  <Base {...p}>
    <Rect x="3" y="3" width="7.5" height="7.5" />
    <Rect x="13.5" y="3" width="7.5" height="7.5" />
    <Rect x="3" y="13.5" width="7.5" height="7.5" />
    <Rect x="13.5" y="13.5" width="7.5" height="7.5" />
  </Base>
);

export const IconText = (p) => (
  <Base {...p}>
    <Path d="M4 6V4h16v2M12 4v16M8.5 20h7" />
  </Base>
);

export const IconEye = (p) => (
  <Base {...p}>
    <Path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
    <Circle cx="12" cy="12" r="3" />
  </Base>
);

export const IconShield = (p) => (
  <Base {...p}>
    <Path d="M12 2.5l8 3v6c0 5-3.5 8.7-8 10-4.5-1.3-8-5-8-10v-6l8-3z" />
    <Path d="M8.5 12l2.5 2.5 4.5-5" />
  </Base>
);

/** Wordmark: a hard-cut "C" built from rectangles. */
export const Wordmark = ({ size = 26, color = C.ink }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="2" y="2" width="20" height="20" fill={color} />
    <Rect x="7" y="7" width="10" height="4" fill={C.bg} />
    <Rect x="7" y="7" width="4" height="10" fill={C.bg} />
    <Rect x="7" y="13" width="10" height="4" fill={C.bg} />
  </Svg>
);
