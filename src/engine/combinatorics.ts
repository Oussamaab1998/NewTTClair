/**
 * Counting by formula (docs/COMPONENTS_PROBABILITY_V2.md E1). Everything here
 * is exact: a result that does not fit a safe integer throws `EngineError`
 * instead of being rounded. `choose` lives in rational.ts (it is used by the
 * engine calls) and is re-exported so the new modules have one import.
 */
import type { Draw } from './probability';
import { choose, EngineError } from './rational';

export { choose };

/** 18! = 6 402 373 705 728 000 is the last factorial below 2^53. */
export const MAX_FACTORIAL = 18;
/** Lists longer than this are never built (counts come from the formulas). */
export const MAX_ENUMERATION = 20000;

const assertCount = (name: string, n: number, k?: number): void => {
  const bad = (v: number) => !Number.isInteger(v) || v < 0;
  if (bad(n) || (k !== undefined && bad(k))) {
    throw new EngineError(`${name} needs non-negative integers`);
  }
};

const safe = (n: number): number => {
  if (!Number.isSafeInteger(n)) {
    throw new EngineError(`integer out of safe range: ${n}`);
  }
  return n;
};

/** n!, exact for n <= 18. */
export function factorial(n: number): number {
  assertCount('factorial', n);
  if (n > MAX_FACTORIAL) {
    throw new EngineError(`factorial is exact up to ${MAX_FACTORIAL}!`);
  }
  let out = 1;
  for (let i = 2; i <= n; i++) {
    out *= i;
  }
  return out;
}

/** Orderings inside one group of k balls: k!. */
export const orderingsPerSet = (k: number): number => factorial(k);

/** A(n, k) = n (n-1) ... (n-k+1), ordered draws without replacement; 0 when k > n. */
export function arrangements(n: number, k: number): number {
  assertCount('arrangements', n, k);
  if (k > n) {
    return 0;
  }
  let out = 1;
  for (let i = 0; i < k; i++) {
    out = safe(out * (n - i));
  }
  return out;
}

/** The row n of Pascal's triangle, C(n, 0) ... C(n, n). */
export function pascalRow(n: number): number[] {
  assertCount('pascalRow', n);
  return Array.from({ length: n + 1 }, (_, k) => choose(n, k));
}

/** Number of equally likely draws of k balls from n, by formula (nothing is listed). */
export function outcomeCountOf(draw: Draw, n: number, k: number): number {
  assertCount('outcomeCountOf', n, k);
  if (k < 1) {
    throw new EngineError('k must be a positive integer');
  }
  if (draw === 'ordered_with_replacement') {
    let out = 1;
    for (let i = 0; i < k; i++) {
      out = safe(out * n);
    }
    return out;
  }
  if (k > n) {
    throw new EngineError('cannot draw more balls than the urn holds');
  }
  return draw === 'simultaneous' ? choose(n, k) : arrangements(n, k);
}

/**
 * Every string of n symbols with exactly k of the first symbol, "S" first,
 * in reading order: SSFF, SFSF, SFFS, FSSF, FSFS, FFSS. Never builds more
 * than MAX_ENUMERATION strings (use `choose` for the count).
 */
export function enumeratePatterns(
  n: number,
  k: number,
  symbols: readonly [string, string] = ['S', 'F'],
): string[] {
  assertCount('enumeratePatterns', n, k);
  if (k > n) {
    throw new EngineError('k cannot exceed n');
  }
  const [a, b] = symbols;
  if (a.length !== 1 || b.length !== 1 || a === b) {
    throw new EngineError('two different one-character symbols are needed');
  }
  if (choose(n, k) > MAX_ENUMERATION) {
    throw new EngineError(
      `${choose(n, k)} patterns: too many to list (cap ${MAX_ENUMERATION})`,
    );
  }
  const out: string[] = [];
  const build = (prefix: string, left: number, slots: number): void => {
    if (slots === 0) {
      out.push(prefix);
      return;
    }
    if (left > 0) {
      build(prefix + a, left - 1, slots - 1);
    }
    if (left < slots) {
      build(prefix + b, left, slots - 1);
    }
  };
  build('', k, n);
  return out;
}
