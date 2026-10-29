/**
 * Grouping of equally likely draws (docs/COMPONENTS_PROBABILITY_V2.md E3).
 *
 * Two units, matching what the pictures show:
 * - a **box**: the set of k balls of an ordered draw (C(n,k) boxes, k! orderings each);
 * - a **slice**: the draws with exactly j balls that have a property (a count
 *   of reds: 20 / 60 / 36 / 4 boxes of 120, or 120 / 360 / 216 / 24 of 720).
 * Counts come from formulas and have no size limit. Lists (boxes, the boxes of
 * one slice, the orderings of one box) are built only on request and never
 * above MAX_ENUMERATION. "Property" is `ball.value === value`, the same
 * meaning as the `count_value` value function.
 */
import {
  MAX_ENUMERATION,
  choose,
  factorial,
} from './combinatorics';
import {
  validateUrn,
  type Ball,
  type Draw,
  type Outcome,
} from './probability';
import { EngineError } from './rational';

export interface Box {
  /** Ball ids in urn order joined by "-": also the simultaneous outcome id. */
  key: string;
  ballIds: string[];
}

export interface SliceCount {
  /** Number of balls with the property in the draw. */
  j: number;
  /** Number of draws (of the given kind) with exactly j such balls. */
  count: number;
}

export interface Group {
  key: string;
  count: number;
  outcomeIds: string[];
}

const mul = (a: number, b: number): number => {
  const p = a * b;
  if (!Number.isSafeInteger(p)) {
    throw new EngineError(`integer out of safe range: ${a} x ${b}`);
  }
  return p;
};

function checkK(k: number): void {
  if (!Number.isInteger(k) || k < 1) {
    throw new EngineError('k must be a positive integer');
  }
}

function checkSet(balls: readonly Ball[], k: number): void {
  validateUrn(balls);
  checkK(k);
  if (k > balls.length) {
    throw new EngineError('cannot draw more balls than the urn holds');
  }
}

/** All C(n,k) boxes, in urn order. Throws above MAX_ENUMERATION boxes. */
export function listBoxes(balls: readonly Ball[], k: number): Box[] {
  checkSet(balls, k);
  if (choose(balls.length, k) > MAX_ENUMERATION) {
    throw new EngineError(
      `${choose(balls.length, k)} boxes: too many to list (cap ${MAX_ENUMERATION})`,
    );
  }
  const out: Box[] = [];
  const walk = (start: number, picked: string[]): void => {
    if (picked.length === k) {
      out.push({ key: picked.join('-'), ballIds: picked });
      return;
    }
    for (let i = start; i < balls.length; i++) {
      walk(i + 1, [...picked, balls[i]!.id]);
    }
  };
  walk(0, []);
  return out;
}

/**
 * The k! orderings of one box as outcome ids ("r1-n1-n2"), in the order
 * `enumerateOutcomes(urn, 'ordered', k)` lists them (the box is given in urn order).
 */
export function orderingsOfBox(ballIds: readonly string[]): string[] {
  const k = ballIds.length;
  if (k < 1) {
    throw new EngineError('a box holds at least one ball');
  }
  if (factorial(Math.min(k, 19)) > MAX_ENUMERATION || k > 18) {
    throw new EngineError(`${k}! orderings: too many to list`);
  }
  const out: string[] = [];
  const used = new Array<boolean>(k).fill(false);
  const walk = (picked: string[]): void => {
    if (picked.length === k) {
      out.push(picked.join('-'));
      return;
    }
    for (let i = 0; i < k; i++) {
      if (!used[i]) {
        used[i] = true;
        walk([...picked, ballIds[i]!]);
        used[i] = false;
      }
    }
  };
  walk([]);
  return out;
}

/**
 * Draws with exactly j balls that have the property, for j = 0..k, by formula.
 * simultaneous C(a,j)C(b,k-j); ordered the same times k!; with replacement
 * C(k,j) a^j b^(k-j). (a = balls with the property, b = the others.)
 */
export function sliceCountsFor(
  balls: readonly Ball[],
  draw: Draw,
  k: number,
  value: number,
): SliceCount[] {
  validateUrn(balls);
  checkK(k);
  if (draw !== 'ordered_with_replacement' && k > balls.length) {
    throw new EngineError('cannot draw more balls than the urn holds');
  }
  const a = balls.filter(b => b.value === value).length;
  const b = balls.length - a;
  const power = (base: number, e: number): number => {
    let out = 1;
    for (let i = 0; i < e; i++) {
      out = mul(out, base);
    }
    return out;
  };
  return Array.from({ length: k + 1 }, (_, j) => {
    if (draw === 'ordered_with_replacement') {
      return {
        j,
        count: mul(choose(k, j), mul(power(a, j), power(b, k - j))),
      };
    }
    const sets = mul(choose(a, j), choose(b, k - j));
    return { j, count: draw === 'ordered' ? mul(sets, factorial(k)) : sets };
  });
}

/**
 * The boxes of ONE slice (exactly j balls with the property), in urn order,
 * the first `limit` of them. Lazy: it stops as soon as it has `limit` boxes.
 */
export function boxesInSlice(
  balls: readonly Ball[],
  k: number,
  value: number,
  j: number,
  limit: number,
): Box[] {
  checkSet(balls, k);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new EngineError('limit must be a positive integer');
  }
  if (!Number.isInteger(j) || j < 0 || j > k) {
    throw new EngineError('j must be between 0 and k');
  }
  const has = balls.map(b => b.value === value);
  // suffixProp[i] = balls with the property among balls[i..]
  const suffixProp = new Array<number>(balls.length + 1).fill(0);
  for (let i = balls.length - 1; i >= 0; i--) {
    suffixProp[i] = suffixProp[i + 1]! + (has[i] ? 1 : 0);
  }
  const out: Box[] = [];
  const walk = (start: number, picked: string[], props: number): void => {
    if (out.length >= limit) {
      return;
    }
    if (picked.length === k) {
      if (props === j) {
        out.push({ key: picked.join('-'), ballIds: picked });
      }
      return;
    }
    const needProps = j - props;
    const needOthers = k - picked.length - needProps;
    for (let i = start; i < balls.length && out.length < limit; i++) {
      const propsLeft = suffixProp[i]!;
      const othersLeft = balls.length - i - propsLeft;
      if (needProps > propsLeft || needOthers > othersLeft) {
        break;
      }
      walk(i + 1, [...picked, balls[i]!.id], props + (has[i] ? 1 : 0));
    }
  };
  walk(0, [], 0);
  return out;
}

/** Reference grouping by enumeration (verifies the formulas; refuses long lists). */
export function groupByKey(
  outcomes: readonly Outcome[],
  keyOf: (o: Outcome) => string,
): Group[] {
  if (outcomes.length > MAX_ENUMERATION) {
    throw new EngineError(
      `${outcomes.length} outcomes: too many to group by enumeration`,
    );
  }
  const groups = new Map<string, Group>();
  for (const o of outcomes) {
    const key = keyOf(o);
    const g = groups.get(key) ?? { key, count: 0, outcomeIds: [] };
    g.count++;
    g.outcomeIds.push(o.id);
    groups.set(key, g);
  }
  return [...groups.values()];
}
