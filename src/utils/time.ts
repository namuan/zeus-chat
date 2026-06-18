/**
 * Time helpers (dependency-free). Intl is available on Hermes.
 */

export const now = () => Date.now();

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < MIN) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 2 * DAY) return 'Yesterday';
  if (diff < 7 * DAY) {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'short' });
  }
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDay(ts: number): string {
  const today = startOfDay(Date.now());
  const that = startOfDay(ts);
  const diff = today - that;
  if (diff === 0) return 'Today';
  if (diff === DAY) return 'Yesterday';
  if (diff < 7 * DAY) {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'long' });
  }
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** ISO-ish stamp for export filenames. */
export function fileStamp(ts: number = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
