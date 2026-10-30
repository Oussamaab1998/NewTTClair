/**
 * Structure of a written product / quotient (docs/METHOD_LESSON_PLAN.md 8.2).
 *
 * The safe parser drops parentheses (`group()` returns the inner node), so
 * `4*(6*5/(2*1))` and `4*6*5/(2*1)` are different trees for the same
 * writing. The FACTOR BAG flattens `*` and `/` into a numerator and a
 * denominator multiset, drops the factors equal to 1, and keeps a sum or a
 * power as one opaque factor. Two bags are equal when the student wrote the
 * same factors over the same divisor, however he bracketed them. The bag is
 * what a mutation is matched on; the VALUE is always matched first.
 *
 * `readback` is the other half of the same idea: it finds the one writing
 * where brackets change the meaning in a way a student rarely means — a "/"
 * followed by a bare product (`990/3*2*1`) — so the app can state both
 * readings and let him choose (R-B).
 */
import { canonical, type Node } from '../engine/expression';

export interface FactorBag {
  negative: boolean;
  /** Sorted factor keys. */
  num: string[];
  den: string[];
}

function flatten(n: Node, inDen: boolean, bag: FactorBag): void {
  switch (n.type) {
    case 'binary':
      if (n.op === '*') {
        flatten(n.left, inDen, bag);
        flatten(n.right, inDen, bag);
        return;
      }
      if (n.op === '/') {
        flatten(n.left, inDen, bag);
        flatten(n.right, !inDen, bag);
        return;
      }
      break;
    case 'unary':
      if (n.op === '-') {
        bag.negative = !bag.negative;
      }
      flatten(n.arg, inDen, bag);
      return;
    case 'num':
      if (n.value === 1) {
        return;
      }
      (inDen ? bag.den : bag.num).push(String(n.value));
      return;
    default:
      break;
  }
  (inDen ? bag.den : bag.num).push(`(${canonical(n)})`);
}

export function factorBag(ast: Node): FactorBag {
  const bag: FactorBag = { negative: false, num: [], den: [] };
  flatten(ast, false, bag);
  bag.num.sort();
  bag.den.sort();
  return bag;
}

export function sameBag(a: FactorBag, b: FactorBag): boolean {
  return (
    a.negative === b.negative &&
    a.num.length === b.num.length &&
    a.den.length === b.den.length &&
    a.num.every((x, i) => x === b.num[i]) &&
    a.den.every((x, i) => x === b.den[i])
  );
}

/** Every number written, sums and divisors included, sorted (the weak structure score). */
export function leaves(ast: Node): string[] {
  const out: string[] = [];
  const walk = (n: Node): void => {
    switch (n.type) {
      case 'num':
        out.push(String(n.value));
        return;
      case 'binary':
        walk(n.left);
        walk(n.right);
        return;
      case 'unary':
      case 'call':
        walk(n.arg);
        return;
      default:
        return;
    }
  };
  walk(ast);
  return out.sort();
}

export interface Readback {
  /** Index of the "/" or "÷" in the raw line. */
  at: number;
  /** The divisor atoms as typed: ['3', '2', '1']. */
  divisor: string[];
  /** The operators between them as typed: ['*', '*']. */
  ops: string[];
  /** The line with the divisor group in parentheses (the student's own characters kept). */
  grouped: string;
}

interface Tok {
  kind: 'num' | 'div' | 'mul' | 'lp' | 'rp' | 'other';
  start: number;
  end: number;
}

const DIV = new Set(['/', '÷']);
const MUL = new Set(['*', '×', '·', '⋅']);

function tokenize(raw: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const num = /^\d+(?:[.,]\d+)?/.exec(raw.slice(i));
    const text = num ? num[0] : ch;
    const kind: Tok['kind'] = num
      ? 'num'
      : DIV.has(text)
      ? 'div'
      : MUL.has(text)
      ? 'mul'
      : text === '('
      ? 'lp'
      : text === ')'
      ? 'rp'
      : 'other';
    toks.push({ kind, start: i, end: i + text.length });
    i += text.length;
  }
  return toks;
}

function matching(toks: Tok[], open: number): number {
  let depth = 0;
  for (let i = open; i < toks.length; i++) {
    if (toks[i]!.kind === 'lp') {
      depth++;
    } else if (toks[i]!.kind === 'rp') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * The first "/" or "÷" whose divisor is a bare number followed by a product
 * (`990/3*2*1`, `100/4*(2+3)`), or null. `a/b/c`, `a/(b*c)` and `a/b*(c)`
 * after a parenthesised divisor are not ambiguous.
 */
export function readback(raw: string): Readback | null {
  const toks = tokenize(raw);
  for (let i = 0; i < toks.length; i++) {
    if (toks[i]!.kind !== 'div') {
      continue;
    }
    const first = toks[i + 1];
    if (!first || first.kind !== 'num') {
      continue;
    }
    const divisor = [raw.slice(first.start, first.end)];
    const ops: string[] = [];
    let end = first.end;
    let k = i + 2;
    while (k < toks.length && toks[k]!.kind === 'mul') {
      const op = toks[k]!;
      const a = toks[k + 1];
      if (a?.kind === 'num') {
        divisor.push(raw.slice(a.start, a.end));
        end = a.end;
        k += 2;
      } else if (a?.kind === 'lp') {
        const close = matching(toks, k + 1);
        if (close < 0) {
          break;
        }
        divisor.push(raw.slice(a.start, toks[close]!.end));
        end = toks[close]!.end;
        k = close + 1;
      } else {
        break;
      }
      ops.push(raw.slice(op.start, op.end));
    }
    // A division right after the product (`1/2*1/2*1/2`) is a chain of fractions: nothing to ask.
    if (toks[k]?.kind === 'div') {
      continue;
    }
    if (divisor.length >= 2) {
      return {
        at: toks[i]!.start,
        divisor,
        ops,
        grouped: `${raw.slice(0, first.start)}(${raw.slice(
          first.start,
          end,
        )})${raw.slice(end)}`,
      };
    }
  }
  return null;
}
