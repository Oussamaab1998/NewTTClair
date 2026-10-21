/**
 * Dev mode flag: the 5 dev tabs, the status lines and the event counters are
 * hidden by default. Kept in memory only, so it is off on every launch. In
 * debug builds a 2-second press on the screen title toggles it, or the launch
 * argument `-devMode on` turns it on (README "Test mode"). Release builds
 * never show it.
 */
import { useSyncExternalStore } from 'react';

/** Hold time on the lesson title that toggles dev tools. */
export const DEV_REVEAL_MS = 2000;

export const devRevealAvailable = (): boolean =>
  typeof __DEV__ !== 'undefined' && __DEV__;

let enabled = false;
const listeners = new Set<() => void>();

export function setDevTools(on: boolean) {
  enabled = on && devRevealAvailable();
  for (const l of listeners) {
    l();
  }
}

export const devToolsEnabled = (): boolean => enabled;

export function useDevTools(): boolean {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => enabled,
  );
}
