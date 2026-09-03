export const pad = (n) => String(n).padStart(2, '0');

/** 3:07 / 1:02:30 — for the live countdown. */
export const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/** 20m / 1h 30m — for labels and chips. */
export const human = (minutes) => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
};

export const initials = (name) => {
  const words = String(name || '?')
    .trim()
    .split(/[\s\-_.]+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const dayStamp = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ─────────────────────────────────────────────────────────────
   Durations, in whichever unit you typed them.
   ───────────────────────────────────────────────────────────── */

export const UNITS = {
  sec: { label: 'SEC', short: 's', ms: 1000, max: 86400 },
  min: { label: 'MIN', short: 'm', ms: 60_000, max: 1440 },
  hour: { label: 'HOUR', short: 'h', ms: 3_600_000, max: 24 },
};

export const toMs = (amount, unit) =>
  Math.round(Number(amount || 0) * (UNITS[unit] || UNITS.min).ms);

/** Picks the unit that expresses this duration most cleanly. */
export const splitDuration = (ms) => {
  const v = Math.max(0, Number(ms) || 0);
  if (v > 0 && v % UNITS.hour.ms === 0) return { amount: v / UNITS.hour.ms, unit: 'hour' };
  if (v > 0 && v % UNITS.min.ms === 0) return { amount: v / UNITS.min.ms, unit: 'min' };
  if (v > 0 && v < UNITS.min.ms) return { amount: Math.round(v / 1000), unit: 'sec' };
  return { amount: Math.round(v / UNITS.min.ms), unit: 'min' };
};

/** "45s" / "20m" / "1h 30m" — for tiles and chips. */
export const humanDuration = (ms) => {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (total < 60) return `${total}s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return s ? `${m}m ${s}s` : `${m}m`;
};
