/**
 * Whether the onboarding was done (shown once per install). The class it asks
 * is kept with the chapter picker's record (chapters/studentClass.ts).
 */
import type { KeyValueStore } from '../../../storage/kv';

export const ONBOARDING_KEY = 'onboarding.v1';

export function isOnboarded(kv: KeyValueStore): boolean {
  try {
    const raw = kv.getString(ONBOARDING_KEY);
    return raw !== undefined && typeof JSON.parse(raw)?.doneAt === 'number';
  } catch {
    return false; // damaged: show it again rather than crash
  }
}

export function markOnboarded(kv: KeyValueStore, now: number): void {
  kv.set(ONBOARDING_KEY, JSON.stringify({ doneAt: now }));
}
