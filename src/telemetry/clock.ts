// RN provides a high-resolution `nowMs()`; its type is not in the RN lib typings.
declare const performance: { now(): number } | undefined;

/** Monotonic milliseconds for measuring durations (not wall-clock time). */
export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
