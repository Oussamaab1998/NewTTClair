/**
 * Part and whole on a bar (PartWholeBar, docs/COMPONENTS_PROBABILITY_V2.md C12).
 * A value is put on a bar that runs from 0 to the whole; a value above the
 * whole is flagged, never clipped. Everything is an exact fraction, so a
 * probability above 1 (120 / 60 = 2) and "12 of 6" are the same picture.
 */
import {
  EngineError,
  compare,
  div,
  frac,
  mul,
  sub,
  type Fraction,
} from './rational';

export const MIN_TICKS = 2;
export const MAX_TICKS = 12;

const ZERO = frac(0);

function positive(name: string, x: Fraction): void {
  if (compare(x, ZERO) <= 0) {
    throw new EngineError(`${name} must be above zero`);
  }
}

export interface Placement {
  /** value / whole. */
  ratio: Fraction;
  /** The value is more than the whole (the whole itself is not). */
  exceeds: boolean;
  /** How far past the whole, 0 when it does not exceed. */
  overflow: Fraction;
}

export function placeOnBar(whole: Fraction, value: Fraction): Placement {
  positive('whole', whole);
  if (compare(value, ZERO) < 0) {
    throw new EngineError('value cannot be below zero');
  }
  const exceeds = compare(value, whole) > 0;
  return {
    ratio: div(value, whole),
    exceeds,
    overflow: exceeds ? sub(value, whole) : ZERO,
  };
}

/**
 * The values the stepped control can take: 0, whole / ticks, ... the whole,
 * and with `overshoot` on to twice the whole (so a value above the whole can
 * be placed and flagged).
 */
export function barPositions(
  whole: Fraction,
  ticks: number,
  overshoot: boolean,
): Fraction[] {
  positive('whole', whole);
  if (!Number.isInteger(ticks) || ticks < MIN_TICKS || ticks > MAX_TICKS) {
    throw new EngineError(`ticks must be an integer from ${MIN_TICKS} to ${MAX_TICKS}`);
  }
  const step = div(whole, frac(ticks));
  const last = overshoot ? 2 * ticks : ticks;
  return Array.from({ length: last + 1 }, (_, i) => mul(step, frac(i)));
}

/** A fraction of a quantity: 1/6 of 36 = 6. The fraction is above 0 and at most 1. */
export function quantityOf(whole: Fraction, fraction: Fraction): Fraction {
  positive('whole', whole);
  positive('fraction', fraction);
  if (compare(fraction, frac(1)) > 0) {
    throw new EngineError('fraction cannot be above 1');
  }
  return mul(whole, fraction);
}
