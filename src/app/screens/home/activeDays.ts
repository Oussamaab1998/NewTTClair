/**
 * The days he practised (the home's «أيام هالجمعة»): the lesson board keeps
 * one record per question with its last time only, so each act also notes
 * its day here. The local midnight of each day, the last 14 days at most.
 * Damaged data reads as nothing, never a crash.
 */
import type { KeyValueStore } from '../../../storage/kv';

const KEY = 'home.activeDays.v1';
const KEEP = 14;

const midnight = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function loadActiveDays(store: KeyValueStore): number[] {
  try {
    const raw = store.getString(KEY);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v)
      ? v.filter((x): x is number => typeof x === 'number')
      : [];
  } catch {
    return [];
  }
}

/** Notes today (once). */
export function noteActiveDay(store: KeyValueStore, now: number): void {
  const day = midnight(now);
  const days = loadActiveDays(store);
  if (days.includes(day)) {
    return;
  }
  store.set(
    KEY,
    JSON.stringify([...days, day].sort((a, b) => a - b).slice(-KEEP)),
  );
}
