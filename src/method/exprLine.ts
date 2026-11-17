/**
 * Lines with a letter on the board (plan, phase 2): f(−x) rewritten down to
 * f(x), a derivative down to a « Montrer que » form, P(Y = 1) as a formula
 * in n. A line may be a chain (`a = b = c`) and may start with its label
 * (`f(-x) =`, `f'(x) =`, `P(Y=1) =`). Each side must equal the side before
 * it; the first side must equal his last accepted line on this step, or the
 * quantity the step asks (`ref`) when he has none. The step is finished when
 * the last side is written in one of the goal's forms (a name such as
 * `f(x)` counts as its form), or, for a formula in n, as soon as a correct
 * formula is written.
 *
 * Nothing is evaluated by the language: x is compared by numeric samples
 * (`checkEquivalence`, the old lesson's lines checker), n exactly at the
 * whole numbers 2 to 12 (`substituteSymbols` + the counting notation, as the
 * AI's formula check does). Nothing here grades: it says what the line is.
 */
import {
  checkEquivalence,
  evaluateExact,
  locateDifference,
  missingParentheses,
  parseExpression,
  sameForm,
  type Difference,
  type Node,
} from '../engine/expression';
import {
  normalizeCounting,
  substituteSymbols,
} from '../engine/expression/counting';
import type { Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';

export interface ExprSpec {
  /** x: a real variable, compared by samples; n: a whole number of trials, compared exactly. */
  variable: 'x' | 'n';
  /** What the step asks, written in the variable (f(−x), f′(x), P(Y = 1)): his first line equals it. */
  ref: string;
  /** Written forms that finish the step ('n': any right formula does). */
  goals: readonly string[];
  /** Names that stand for the goal at the end of a chain (`f(x)`). */
  goalNames?: readonly string[];
  /** Known wrong lines, by the slip they are (`mut.<id>` in the library). */
  knownWrong: readonly { expr: string; id: string }[];
  /** Points near which samples are skipped. */
  exclude?: readonly number[];
}

export type ExprVerdict =
  | { kind: 'unreadable' }
  /** The same line as his last one: not a new step. */
  | { kind: 'unchanged' }
  /** No sample could compare it (all undefined): ask for another writing. */
  | { kind: 'undetermined' }
  | { kind: 'accepted'; final: boolean; jumped: boolean }
  /** Two sides of his own line that differ (`at`: the first "=" that does not hold). */
  | { kind: 'mismatch'; at: number }
  | {
      kind: 'wrong';
      slip?: string;
      where?: Difference['where'];
      parentheses?: 'numerator' | 'denominator';
    };

const LABEL = /^\s*[A-Za-z][A-Za-z']*\s*\((?:[^()]|\([^()]*\))*\)\s*=/;

/** The leading labels of a line (`f(-x)`, `P(Y=1)`) and what follows them. */
export function splitLabels(raw: string): { labels: string[]; body: string } {
  const labels: string[] = [];
  let body = raw;
  for (let m = LABEL.exec(body); m; m = LABEL.exec(body)) {
    labels.push(m[0].replace(/[=]\s*$/, '').trim());
    body = body.slice(m[0].length);
  }
  return { labels, body };
}

/** His line without its leading labels (`f(-x) =`, `P(Y=1) =`), split at its "=". */
export function exprSides(raw: string): string[] {
  const { body } = splitLabels(
    raw.replace(/[×·]/g, '*').replace(/\u2212/g, '-'),
  );
  return body.split('=').map(x => x.trim());
}

const squash = (s: string): string => s.replace(/\s+/g, '');

// ---------------------------------------------------------------------------
// Reading a side.

interface Side {
  text: string;
  /** x: the parsed expression; n: values at the whole numbers. */
  ast?: Node;
  values?: (Fraction | null)[];
}

const NS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function valueAtN(text: string, n: number): Fraction | null {
  let s: string;
  try {
    s = substituteSymbols(text, { n });
  } catch {
    return null;
  }
  const c = normalizeCounting(s);
  if (!c.ok) {
    return null;
  }
  const p = parseExpression(c.text, { variables: [], constants: [] });
  return p.ok ? evaluateExact(p.ast) : null;
}

function readSide(text: string, spec: ExprSpec): Side | null {
  if (text === '') {
    return null;
  }
  if (spec.variable === 'x') {
    const p = parseExpression(text, { variables: ['x'] });
    return p.ok ? { text, ast: p.ast } : null;
  }
  // Only the letter n (and C / A starting counting notation).
  for (const m of text.matchAll(/[A-Za-z]+/g)) {
    const after = text.slice(m.index + m[0].length).trimStart();
    if (m[0] !== 'n' && !((m[0] === 'C' || m[0] === 'A') && after.startsWith('('))) {
      return null;
    }
  }
  // 7n -> 7*n, n(n-1) -> n*(n-1), )n -> )*n, nC(n,1) -> n*C(n,1).
  const explicit = text
    .replace(/([0-9)])\s*(?=n(?![A-Za-z]))/g, '$1*')
    .replace(/(?<![A-Za-z])n\s*(?=[0-9(]|[CA]\s*\()/g, 'n*');
  const values = NS.map(n => valueAtN(explicit, n));
  return values.some(v => v !== null) ? { text, values } : null;
}

const options = (spec: ExprSpec) => {
  const exclude = spec.exclude ?? [];
  return {
    variables: ['x'],
    skip: (scope: Record<string, number>) =>
      Object.values(scope).some(v => exclude.some(e => Math.abs(v - e) < 1e-3)),
  };
};

type Same = 'yes' | 'no' | 'unknown';

function same(a: Side, b: Side, spec: ExprSpec): Same {
  if (spec.variable === 'x') {
    const r = checkEquivalence(a.ast!, b.ast!, options(spec));
    return r.verdict === 'equivalent'
      ? 'yes'
      : r.verdict === 'different'
      ? 'no'
      : 'unknown';
  }
  let compared = 0;
  for (let i = 0; i < NS.length; i++) {
    const x = a.values![i];
    const y = b.values![i];
    if (x === null || x === undefined || y === null || y === undefined) {
      continue;
    }
    if (!sameRat(x, y)) {
      return 'no';
    }
    compared++;
  }
  return compared >= 5 ? 'yes' : 'unknown';
}

const isName = (text: string, spec: ExprSpec): boolean =>
  (spec.goalNames ?? []).some(g => squash(g) === squash(text));

function isGoalForm(side: Side, spec: ExprSpec): boolean {
  if (spec.variable === 'n') {
    return true;
  }
  return spec.goals.some(g => {
    const p = parseExpression(g, { variables: ['x'] });
    return p.ok && sameForm(side.ast!, p.ast);
  });
}

// ---------------------------------------------------------------------------

/** The last side of an accepted line: where the next line starts. */
function lastSideOf(raw: string, spec: ExprSpec): Side | null {
  const sides = exprSides(raw).filter(s => !isName(s, spec));
  const last = sides[sides.length - 1];
  return last === undefined ? null : readSide(last, spec);
}

export function judgeExprLine(
  spec: ExprSpec,
  accepted: readonly string[],
  raw: string,
): ExprVerdict {
  const texts = exprSides(raw);
  if (texts.length === 0 || texts.some(t => t === '')) {
    return { kind: 'unreadable' };
  }
  const last = accepted[accepted.length - 1];
  if (last !== undefined && squash(last) === squash(raw)) {
    return { kind: 'unchanged' };
  }
  const prev =
    (last !== undefined ? lastSideOf(last, spec) : null) ??
    readSide(spec.ref, spec);
  if (!prev) {
    throw new Error(`content expression does not read: ${spec.ref}`);
  }
  // A name at the end of the chain (`= f(x)`) is the goal written by name.
  const named = texts.length > 1 && isName(texts[texts.length - 1]!, spec);
  const written = named ? texts.slice(0, -1) : texts;
  const sides: Side[] = [];
  for (const t of written) {
    const sd = readSide(t, spec);
    if (!sd) {
      return { kind: 'unreadable' };
    }
    sides.push(sd);
  }
  let undetermined = false;
  for (let i = 0; i < sides.length; i++) {
    const before = i === 0 ? prev : sides[i - 1]!;
    const r = same(sides[i]!, before, spec);
    if (r === 'unknown') {
      undetermined = true;
      continue;
    }
    if (r === 'no') {
      if (i > 0) {
        return { kind: 'mismatch', at: i - 1 };
      }
      return wrongLine(sides[0]!, prev, spec, accepted);
    }
  }
  if (undetermined) {
    return { kind: 'undetermined' };
  }
  if (named) {
    // The name stands for the goal: the side before it must be the goal.
    const goal = readSide(spec.goals[0] ?? spec.ref, spec);
    if (goal && same(sides[sides.length - 1]!, goal, spec) === 'no') {
      return { kind: 'mismatch', at: sides.length - 1 };
    }
  }
  const final = named || isGoalForm(sides[sides.length - 1]!, spec);
  return {
    kind: 'accepted',
    final,
    jumped: final && accepted.length === 0 && sides.length === 1 && !named,
  };
}

function wrongLine(
  line: Side,
  prev: Side,
  spec: ExprSpec,
  accepted: readonly string[],
): ExprVerdict {
  const slip = spec.knownWrong.find(w => {
    const k = readSide(w.expr, spec);
    return k !== null && same(line, k, spec) === 'yes';
  })?.id;
  if (spec.variable === 'n') {
    return { kind: 'wrong', ...(slip && { slip }) };
  }
  const opts = options(spec);
  const parens = missingParentheses(line.ast!, prev.ast!, opts);
  // Localized against the closest written form: his earlier lines, the
  // question, the goal (all equal); the first one-part difference wins.
  const refs = [
    ...[...accepted].reverse().flatMap(a => {
      const s = lastSideOf(a, spec);
      return s?.ast ? [s.ast] : [];
    }),
    prev.ast!,
    ...spec.goals.flatMap(g => {
      const p = parseExpression(g, { variables: ['x'] });
      return p.ok ? [p.ast] : [];
    }),
  ];
  const diffs = refs.map(r => locateDifference(line.ast!, r, opts));
  const diff =
    diffs.find(d => d.where === 'numerator' || d.where === 'denominator') ??
    diffs[0];
  return {
    kind: 'wrong',
    ...(slip && { slip }),
    ...(diff && { where: diff.where }),
    ...(parens && { parentheses: parens }),
  };
}

/** Does a written expression equal the spec's question at every sample (content checks)? */
export function equalsRef(spec: ExprSpec, expr: string): boolean {
  const a = readSide(expr, spec);
  const b = readSide(spec.ref, spec);
  return a !== null && b !== null && same(a, b, spec) === 'yes';
}
