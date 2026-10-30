/**
 * The plan cards are shown shuffled, but not at random: the same step always
 * shows the same order (replay, screenshots), it is never the authored order,
 * and, when asked, never an order that already works (the pool would hand
 * out the answer).
 */
import { rng } from '../engine/expression/equivalence';

/** FNV-1a: a stable seed from a key (the bit operations are the point). */
/* eslint-disable no-bitwise */
function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647 || 1;
}
/* eslint-enable no-bitwise */

export function seededOrder(
  ids: readonly string[],
  key: string,
  isValid?: (order: readonly string[]) => boolean,
): string[] {
  if (ids.length < 2) {
    return [...ids];
  }
  const base = hash(key);
  const same = (a: readonly string[]) => a.every((x, i) => x === ids[i]);
  for (let attempt = 0; attempt < 64; attempt++) {
    const next = rng(base + attempt);
    const out = [...ids];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    if (!same(out) && !(isValid && isValid(out))) {
      return out;
    }
  }
  // Last resort: the authored order reversed (a permutation that is rarely valid).
  return [...ids].reverse();
}
