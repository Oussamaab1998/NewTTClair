/**
 * Dev tools flag: the Composants / Proba / Bidi tabs and the lesson's event
 * log are hidden by default. In debug builds, a 2-second press on the lesson
 * title toggles them (README "Dev tools"). Release builds never show them.
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
