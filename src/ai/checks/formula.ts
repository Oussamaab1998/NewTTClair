/**
 * A formula the student types with letters (n, k), checked by the engine
 * against the tutor's reference: both are evaluated EXACTLY (rationals, no
 * floats) at many integer points (n = 2..12, and k = 0..n when k is a
 * variable). Equal at every compared point = equivalent; the first point
 * where they differ is the counterexample (his value next to the right one).
 *
 * Accepted writing: C(n,k), C(n;k), C_n^k, A(n,k), n!, ^, × · * /, a decimal
 * comma, implicit products (2n, n(n-1)), a leading label (P(X=k)=, E(X)=,
 * V(X)=) and a chain (E(X) = n*1/2 = n/2: every side must hold).
 */
import { evaluateExact, parseExpression } from '../../engine/expression';
import {
  normalizeCounting,
  substituteSymbols,
} from '../../engine/expression/counting';
import type { Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import { plain } from './lines';

export interface FormulaVerdict {
  readable: boolean;
  /** Why unreadable (e.g. 'syntax', 'unknown letter x'). */
  reason?: string;
  /** A leading label kept apart: "P(X=k)", "E(X)", "V(X)". */
  label: string | null;
  /** null when unreadable or too few points could be compared. */
  equivalent: boolean | null;
  /** How many (n[,k]) points were compared. */
  tested: number;
  /** The first point where they differ, values "p/q". */
  counterexample: {
    n: number;
    k?: number;
    his: string;
    expected: string;
  } | null;
  /** Letters he used (n, k). */
  usedLetters: string[];
}

type Var = 'n' | 'k';

const LABEL = /^\s*([pPEV])\s*\(([^()]{1,20})\)\s*=\s*/;
const N_MIN = 2;
const N_MAX = 12;
const MIN_POINTS = 3;

/** Typed signs to the parser's: × · ⋅ -> *, − -> -, ÷ -> /. */
const signs = (s: string): string =>
  s.replace(/[×·⋅]/g, '*').replace(/−/g, '-').replace(/÷/g, '/');

/**
 * Letters must be the allowed variables, or C / A starting counting
 * notation (C(…), C_…). Returns the offending letter run, or null.
 */
function unknownLetter(s: string, vars: readonly Var[]): string | null {
  for (const m of s.matchAll(/[A-Za-z]+/g)) {
    const run = m[0];
    if ((vars as readonly string[]).includes(run)) {
      continue;
    }
    const after = s.slice(m.index + run.length).trimStart();
    if ((run === 'C' || run === 'A') && /^[(_]/.test(after)) {
      continue;
    }
    return run;
  }
  return null;
}

/** 2n -> 2*n, n(n-1) -> n*(n-1), )n -> )*n: the letters become numbers next. */
function explicitProducts(s: string, vars: readonly Var[]): string {
  const v = vars.join('');
  if (v === '') {
    return s;
  }
  return s
    .replace(new RegExp(`([0-9)])\\s*(?=[${v}](?![A-Za-z]))`, 'g'), '$1*')
    .replace(new RegExp(`(?<![A-Za-z])([${v}])\\s*(?=[0-9(])`, 'g'), '$1*');
}

type Eval = { ok: true; value: Fraction } | { ok: false; reason: string };

/** One side at one point: substitute, expand the notation, parse, evaluate exactly. */
function evalAt(side: string, point: Readonly<Record<string, number>>): Eval {
  let text: string;
  try {
    text = substituteSymbols(side, point);
  } catch {
    return { ok: false, reason: 'undefined' };
  }
  const n = normalizeCounting(text);
  if (!n.ok) {
    return { ok: false, reason: String(n.reason) };
  }
  const p = parseExpression(n.text, { variables: [], constants: [] });
  if (!p.ok) {
    return { ok: false, reason: 'syntax' };
  }
  try {
    const v = evaluateExact(p.ast);
    return v ? { ok: true, value: v } : { ok: false, reason: 'undefined' };
  } catch {
    return { ok: false, reason: 'undefined' };
  }
}

interface Prepared {
  label: string | null;
  sides: string[];
}

function prepare(raw: string, vars: readonly Var[]): Prepared | string {
  const text = signs(raw.trim());
  const m = LABEL.exec(text);
  const label = m ? `${m[1]}(${m[2]!.trim()})` : null;
  // nC(n,k): a variable glued to counting notation is a product.
  const body = (m ? text.slice(m[0].length) : text).replace(
    /(?<![A-Za-z])([nk])(?=[CA]\s*[(_])/g,
    '$1*',
  );
  if (body.trim() === '') {
    return 'empty';
  }
  const bad = unknownLetter(body, vars);
  if (bad !== null) {
    return `unknown letter ${bad}`;
  }
  const sides = body.split('=').map(x => x.trim());
  if (sides.some(x => x === '')) {
    return 'syntax';
  }
  return { label, sides: sides.map(x => explicitProducts(x, vars)) };
}

function points(vars: readonly Var[]): Record<string, number>[] {
  const out: Record<string, number>[] = [];
  for (let n = N_MIN; n <= N_MAX; n++) {
    if (vars.includes('k')) {
      for (let k = 0; k <= n; k++) {
        out.push(vars.includes('n') ? { n, k } : { k });
      }
    } else {
      out.push({ n });
    }
  }
  return out;
}

const unreadable = (
  reason: string,
  label: string | null,
  usedLetters: string[],
): FormulaVerdict => ({
  readable: false,
  reason,
  label,
  equivalent: null,
  tested: 0,
  counterexample: null,
  usedLetters,
});

export function checkFormula(
  raw: string,
  reference: string,
  vars: readonly ('n' | 'k')[],
): FormulaVerdict {
  const usedLetters = [
    ...new Set(
      (raw.match(/[A-Za-z]+/g) ?? []).filter(r =>
        (vars as readonly string[]).includes(r),
      ),
    ),
  ].sort();
  const his = prepare(raw, vars);
  if (typeof his === 'string') {
    return unreadable(his, null, usedLetters);
  }
  const ref = prepare(reference, vars);
  if (typeof ref === 'string') {
    return unreadable(`reference: ${ref}`, his.label, usedLetters);
  }
  // The reference's last side is the formula; his sides are each compared to it.
  const target = ref.sides[ref.sides.length - 1]!;
  let tested = 0;
  const readableSomewhere = his.sides.map(() => false);
  let firstFailure: string | null = null;
  for (const point of points(vars)) {
    const expected = evalAt(target, point);
    const values = his.sides.map(sd => evalAt(sd, point));
    values.forEach((v, i) => {
      if (v.ok || v.reason === 'undefined') {
        readableSomewhere[i] = true;
      } else {
        firstFailure ??= v.reason;
      }
    });
    if (!expected.ok || values.some(v => !v.ok)) {
      continue;
    }
    tested += 1;
    for (const v of values) {
      if (v.ok && !sameRat(v.value, expected.value)) {
        return {
          readable: true,
          label: his.label,
          equivalent: false,
          tested,
          counterexample: {
            n: point.n ?? 0,
            ...(point.k !== undefined && { k: point.k }),
            his: plain(v.value),
            expected: plain(expected.value),
          },
          usedLetters,
        };
      }
    }
  }
  if (!readableSomewhere.every(Boolean)) {
    return unreadable(firstFailure ?? 'syntax', his.label, usedLetters);
  }
  if (tested < MIN_POINTS) {
    return {
      readable: true,
      reason: 'too few points could be compared',
      label: his.label,
      equivalent: null,
      tested,
      counterexample: null,
      usedLetters,
    };
  }
  return {
    readable: true,
    label: his.label,
    equivalent: true,
    tested,
    counterexample: null,
    usedLetters,
  };
}
