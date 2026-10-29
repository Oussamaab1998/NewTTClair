/**
 * Typed counting notation (docs/COMPONENTS_PROBABILITY_V2.md E7): C(a,b),
 * C(a;b), C_a^b, C^b_a, the sub / superscript form, A(a,b), a! and (expr)!
 * are turned into integer literals BEFORE the existing safe parser runs. No
 * grammar was added to the parser and nothing is evaluated by the language:
 * every value comes from the engine's `choose`, `arrangements`, `factorial`
 * on integers checked here. Only an uppercase C or A followed by "(", "_",
 * "^" or a sub / superscript counts as notation; "C62" is refused as
 * ambiguous. Inside C( ) and A( ) the comma separates the two arguments (the
 * parser's decimal comma is untouched everywhere else; use ";" there to keep a
 * decimal comma, which is then refused as a non-integer).
 *
 * A step that asks the student to COMPUTE a count does not accept the notation
 * as a pass: `checkTypedCount` answers "notation_only" (neutral) when the
 * notation evaluates to the right value, "wrong" when it does not.
 */
import { arrangements, choose, factorial } from '../combinatorics';
import { parseNumeric } from '../format';
import { sameRat } from '../rationalFormat';
import { EngineError, type Fraction } from '../rational';

export type CountingError =
  | 'ambiguous'
  | 'bad_args'
  | 'too_large'
  | 'syntax'
  | 'not_a_number';

export type NormalizeResult =
  | { ok: true; text: string; usedNotation: boolean }
  | { ok: false; reason: Exclude<CountingError, 'not_a_number'>; index: number };

/** The largest integer allowed as an argument of C or A (C(60,30) is already above 2^53). */
export const MAX_ARG = 60;

class Refused extends Error {
  constructor(
    readonly reason: Exclude<CountingError, 'not_a_number'>,
    readonly index: number,
  ) {
    super(reason);
  }
}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};
const isDigit = (c: string | undefined): c is string =>
  c !== undefined && c >= '0' && c <= '9';
const subDigit = (c: string | undefined): string | null => {
  const i = c === undefined ? -1 : SUB.indexOf(c);
  return i >= 0 ? String(i) : null;
};
const supDigit = (c: string | undefined): string | null =>
  c === undefined ? null : SUP[c] ?? null;

/** Index of the ")" that closes the "(" at `open`, or -1. */
function matching(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') {
      depth++;
    } else if (s[i] === ')') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/** A non-negative integer from an argument text such as "6", "n-k" after substitution, "2+1". */
function integerArg(text: string, at: number, max: number): number {
  const inner = scan(text, max);
  const r = parseNumeric(inner.text);
  if (!r.ok || r.value[1] !== 1 || r.value[0] < 0) {
    throw new Refused('bad_args', at);
  }
  if (r.value[0] > max) {
    throw new Refused('too_large', at);
  }
  return r.value[0];
}

interface Scanned {
  text: string;
  used: boolean;
}

function scan(input: string, max: number): Scanned {
  let out = '';
  let used = false;
  /** The last thing written was a computed literal (so a digit or "(" after it needs a "*"). */
  let afterLiteral = false;

  const pushLiteral = (n: number): void => {
    if (/[0-9)]\s*$/.test(out)) {
      out += '*';
    }
    out += String(n);
    afterLiteral = true;
    used = true;
  };
  const pushRaw = (c: string): void => {
    if (afterLiteral && c.trim() !== '') {
      if (isDigit(c) || c === '(') {
        out += '*';
      }
      afterLiteral = false;
    }
    out += c;
  };
  const guard = (f: () => number, at: number): number => {
    try {
      return f();
    } catch (e) {
      if (e instanceof EngineError) {
        throw new Refused('too_large', at);
      }
      throw e;
    }
  };

  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;

    if (ch === 'C' || ch === 'A') {
      const at = i;
      const next = input[i + 1];
      const apply = (a: number, b: number): number =>
        guard(() => (ch === 'C' ? choose(a, b) : arrangements(a, b)), at);

      if (next === '(') {
        const close = matching(input, i + 1);
        if (close < 0) {
          throw new Refused('syntax', at);
        }
        const body = input.slice(i + 2, close);
        const parts = body.includes(';') ? body.split(';') : body.split(',');
        if (parts.length !== 2) {
          throw new Refused('bad_args', at);
        }
        pushLiteral(
          apply(integerArg(parts[0]!, at, max), integerArg(parts[1]!, at, max)),
        );
        i = close + 1;
        continue;
      }
      if (isDigit(next)) {
        throw new Refused('ambiguous', at);
      }
      if (next === '_' || next === '^' || subDigit(next) || supDigit(next)) {
        // "{12}", or a run of digits after "_" / "^", or a run of unicode sub / superscript digits
        const read = (
          j: number,
          kind: 'low' | 'high',
          marked: boolean,
        ): { digits: string; end: number } | null => {
          if (marked && input[j] === '{') {
            const end = input.indexOf('}', j);
            const d = end < 0 ? '' : input.slice(j + 1, end);
            return /^\d+$/.test(d) ? { digits: d, end: end + 1 } : null;
          }
          let k = j;
          let digits = '';
          while (k < input.length) {
            const c = input[k];
            const d =
              marked && isDigit(c)
                ? c
                : kind === 'low'
                ? subDigit(c)
                : supDigit(c);
            if (d === null || d === undefined) {
              break;
            }
            digits += d;
            k++;
          }
          return digits ? { digits, end: k } : null;
        };
        let j = i + 1;
        let low: string | null = null;
        let high: string | null = null;
        for (let part = 0; part < 2; part++) {
          const c = input[j];
          if (c === '_' || (c !== undefined && subDigit(c) !== null)) {
            const r = read(c === '_' ? j + 1 : j, 'low', c === '_');
            if (!r || low !== null) {
              throw new Refused('syntax', at);
            }
            low = r.digits;
            j = r.end;
          } else if (c === '^' || (c !== undefined && supDigit(c) !== null)) {
            const r = read(c === '^' ? j + 1 : j, 'high', c === '^');
            if (!r || high !== null) {
              throw new Refused('syntax', at);
            }
            high = r.digits;
            j = r.end;
          } else {
            throw new Refused('syntax', at);
          }
        }
        const a = Number(low);
        const b = Number(high);
        if (a > max || b > max) {
          throw new Refused('too_large', at);
        }
        pushLiteral(apply(a, b));
        i = j;
        continue;
      }
      throw new Refused('syntax', at);
    }

    if (isDigit(ch)) {
      let j = i;
      while (isDigit(input[j])) {
        j++;
      }
      let hasDecimal = false;
      if ((input[j] === '.' || input[j] === ',') && isDigit(input[j + 1])) {
        hasDecimal = true;
        j++;
        while (isDigit(input[j])) {
          j++;
        }
      }
      const token = input.slice(i, j);
      if (input[j] === '!') {
        if (hasDecimal) {
          throw new Refused('bad_args', i);
        }
        const n = Number(token);
        if (n > 18) {
          throw new Refused('too_large', i);
        }
        pushLiteral(factorial(n));
        i = j + 1;
        continue;
      }
      for (const c of token) {
        pushRaw(c);
      }
      i = j;
      continue;
    }

    if (ch === '(') {
      const close = matching(input, i);
      if (close > 0 && input[close + 1] === '!') {
        const n = integerArg(input.slice(i + 1, close), i, 18);
        pushLiteral(factorial(n));
        i = close + 2;
        continue;
      }
      pushRaw(ch);
      i++;
      continue;
    }

    pushRaw(ch);
    i++;
  }
  return { text: out, used };
}

/** Notation -> plain arithmetic, or a refusal with its reason and position. */
export function normalizeCounting(
  input: string,
  opts: { maxArg?: number } = {},
): NormalizeResult {
  try {
    const r = scan(input, opts.maxArg ?? MAX_ARG);
    return { ok: true, text: r.used ? r.text : input, usedNotation: r.used };
  } catch (e) {
    if (e instanceof Refused) {
      return { ok: false, reason: e.reason, index: e.index };
    }
    throw e;
  }
}

export type CountingParse =
  | { ok: true; value: Fraction; usedNotation: boolean }
  | { ok: false; reason: CountingError };

/** Normalize, then the existing exact parser (`parseNumeric`). */
export function parseCountingAnswer(raw: string): CountingParse {
  const n = normalizeCounting(raw);
  if (!n.ok) {
    return { ok: false, reason: n.reason };
  }
  const p = parseNumeric(n.text);
  return p.ok
    ? { ok: true, value: p.value, usedNotation: n.usedNotation }
    : { ok: false, reason: p.reason };
}

/** Replaces whole one-letter names (n, k) by integers: C(n,k)/2^n at n = 5, k = 2 -> C(5,2)/2^5. */
export function substituteSymbols(
  input: string,
  values: Readonly<Record<string, number>>,
): string {
  for (const v of Object.values(values)) {
    if (!Number.isInteger(v) || v < 0) {
      throw new EngineError('symbols are replaced by non-negative integers');
    }
  }
  return input.replace(/[A-Za-z]+/g, run =>
    Object.hasOwn(values, run) ? String(values[run]) : run,
  );
}

export type TypedCountVerdict =
  | { kind: 'correct'; value: Fraction }
  /** Right value, written as notation, on a step that asks to compute: neutral, not a pass. */
  | { kind: 'notation_only'; value: Fraction }
  | { kind: 'wrong'; value: Fraction }
  | { kind: 'unreadable'; reason: CountingError };

/**
 * A typed answer to a step that wants a count or a probability.
 * `aboutNotation` is true only for a step whose subject is the notation
 * itself; there the notation is accepted as the answer.
 */
export function checkTypedCount(
  raw: string,
  expected: Fraction,
  step: { aboutNotation: boolean },
): TypedCountVerdict {
  const p = parseCountingAnswer(raw);
  if (!p.ok) {
    return { kind: 'unreadable', reason: p.reason };
  }
  if (!sameRat(p.value, expected)) {
    return { kind: 'wrong', value: p.value };
  }
  return p.usedNotation && !step.aboutNotation
    ? { kind: 'notation_only', value: p.value }
    : { kind: 'correct', value: p.value };
}
