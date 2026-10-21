/**
 * Equivalence by numeric samples: two expressions are "equivalent" when they
 * agree at every sample point where both are defined. This is a strong
 * heuristic, not a proof (see README.md).
 */
import { equals, toNumber } from '../rational';
import { evaluateExact, evaluateReal } from './evaluate';
import type { Node } from './parse';

export interface EquivalenceOptions {
  variables?: readonly string[];
  /** Random points added after the fixed "nice" points. */
  randomSamples?: number;
  relTol?: number;
  absTol?: number;
  /** Minimum number of points where both sides are defined. */
  minPoints?: number;
  seed?: number;
  /** Sample points to ignore (e.g. too close to a singularity). */
  skip?: (scope: Record<string, number>) => boolean;
}

export type EquivalenceResult =
  | {
      verdict: 'equivalent';
      checkedPoints: number;
      /** One side is defined at a point where the other is not. */
      domainDiffers: boolean;
    }
  | {
      verdict: 'different';
      counterexample: { scope: Record<string, number>; a: number; b: number };
    }
  | { verdict: 'undetermined'; reason: 'too_few_points' };

// Simple values first so a counterexample reads well ("with x = 1 you get ...").
const NICE_POINTS = [1, 2, -1, 0.5, 3, -2, 1.5, -0.5, 0, 4, -3, 0.25];

/** Small deterministic PRNG (mulberry32). */
/* eslint-disable no-bitwise -- integer hashing is the point here */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable no-bitwise */

function samplePoints(
  variables: readonly string[],
  randomCount: number,
  seed: number,
): Record<string, number>[] {
  const points: Record<string, number>[] = [];
  NICE_POINTS.forEach((_, i) => {
    // Offset per variable so x and y do not always take the same value.
    points.push(
      Object.fromEntries(
        variables.map((v, k) => [
          v,
          NICE_POINTS[(i + 3 * k) % NICE_POINTS.length]!,
        ]),
      ),
    );
  });
  const next = rng(seed);
  for (let i = 0; i < randomCount; i++) {
    points.push(Object.fromEntries(variables.map(v => [v, -10 + 20 * next()])));
  }
  return points;
}

export function checkEquivalence(
  a: Node,
  b: Node,
  options: EquivalenceOptions = {},
): EquivalenceResult {
  const {
    variables = ['x'],
    randomSamples = 24,
    relTol = 1e-9,
    absTol = 1e-12,
    minPoints = 6,
    seed = 20221,
    skip,
  } = options;

  // Two constant rationals: compare exactly (0.3333333333 is not 1/3).
  const qa = evaluateExact(a);
  const qb = evaluateExact(b);
  if (qa && qb) {
    return equals(qa, qb)
      ? { verdict: 'equivalent', checkedPoints: 1, domainDiffers: false }
      : {
          verdict: 'different',
          counterexample: { scope: {}, a: toNumber(qa), b: toNumber(qb) },
        };
  }

  let checked = 0;
  let domainDiffers = false;
  for (const scope of samplePoints(variables, randomSamples, seed)) {
    if (skip?.(scope)) {
      continue;
    }
    const va = evaluateReal(a, scope);
    const vb = evaluateReal(b, scope);
    const fa = Number.isFinite(va);
    const fb = Number.isFinite(vb);
    if (fa !== fb) {
      domainDiffers = true;
    }
    if (!fa || !fb) {
      continue;
    }
    checked++;
    if (
      Math.abs(va - vb) >
      absTol + relTol * Math.max(Math.abs(va), Math.abs(vb))
    ) {
      return { verdict: 'different', counterexample: { scope, a: va, b: vb } };
    }
  }
  return checked < minPoints
    ? { verdict: 'undetermined', reason: 'too_few_points' }
    : { verdict: 'equivalent', checkedPoints: checked, domainDiffers };
}
