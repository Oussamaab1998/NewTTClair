/**
 * Coincidence guards for a question the student answers alone (the two
 * similar questions, later the cold generator) and for the twin urns of the
 * repairs (docs/METHOD_LESSON_PLAN.md 8.4 and 8.7, addendum A2, D45).
 *
 * A teaching example is only worth showing when a student with a wrong
 * method gets a DIFFERENT number from the right one, and when no number
 * can be guessed from the lesson or from the statement.
 */
import { factorial } from '../engine/combinatorics';
import { EngineError, frac, type Fraction } from '../engine/rational';
import { ratToString, sameRat } from '../engine/rationalFormat';
import { buildUrnGraph, nodeOf, type Graph, type UrnSpec } from './graph';
import { mutationsFor } from './mutations';

export interface UrnPair {
  reds: number;
  blacks: number;
}

export interface GuardContext {
  /** Urns already used in this exercise (the question, its twins). */
  used: readonly UrnPair[];
  /** The owner's paper tests (4 red 5 black, 5 red 4 black). */
  reserved: readonly UrnPair[];
  /** Numbers already shown in the lesson. */
  shown: readonly Fraction[];
}

export type GuardReason =
  | 'invalid_urn'
  | 'used_or_reserved'
  | 'parts_sum_equals_product'
  | 'draw_equals_factorial'
  | 'choose_equals_n_times_k'
  | 'draw_is_all_but_one'
  | 'answer_shown_earlier'
  | 'answer_from_statement'
  | 'single_ball_equals_answer'
  | 'mutation_equals_right_value';

/** Integers below this are balls, draws and small counts: never a collision. */
export const MIN_KEY_NUMBER = 12;

const isKey = (v: Fraction): boolean =>
  v[1] !== 1 || Math.abs(v[0]) >= MIN_KEY_NUMBER;

const sameUrn = (a: UrnPair, b: UrnPair): boolean =>
  (a.reds === b.reds && a.blacks === b.blacks) ||
  (a.reds === b.blacks && a.blacks === b.reds);

export function coldGuards(
  spec: UrnSpec,
  ctx: GuardContext,
): { ok: boolean; reasons: GuardReason[] } {
  const reasons: GuardReason[] = [];
  if ([...ctx.used, ...ctx.reserved].some(u => sameUrn(u, spec))) {
    reasons.push('used_or_reserved');
  }
  let g: Graph;
  try {
    g = buildUrnGraph(spec);
  } catch (e) {
    if (e instanceof EngineError) {
      return { ok: false, reasons: [...reasons, 'invalid_urn'] };
    }
    throw e;
  }
  const { reds, blacks, k } = spec;
  const n = reds + blacks;

  const fav = nodeOf(g, 'fav');
  if (fav.inputs.length === 2) {
    const [a, b] = fav.inputs.map(id => nodeOf(g, id).value[0]) as [
      number,
      number,
    ];
    if (a + b === a * b) {
      reasons.push('parts_sum_equals_product');
    }
  }
  if (k === factorial(k) && k >= 2) {
    reasons.push('draw_equals_factorial');
  }
  for (const node of g.nodes) {
    const s = node.shape;
    if (s.kind === 'choose' && s.k >= 2) {
      if (node.value[0] === s.n * s.k) {
        reasons.push('choose_equals_n_times_k');
        break;
      }
    }
  }
  for (const node of g.nodes) {
    const s = node.shape;
    if (s.kind === 'choose' && s.k >= 2 && s.n >= 3 && s.k === s.n - 1) {
      reasons.push('draw_is_all_but_one');
      break;
    }
  }

  const result = nodeOf(g, 'result').value;
  const keys: Fraction[] = [
    nodeOf(g, 'total').value,
    fav.value,
    result,
    frac(result[0]),
    frac(result[1]),
    ...g.nodes.filter(x => x.id === 'ord').map(x => x.value),
  ];
  if (keys.filter(isKey).some(v => ctx.shown.some(s => sameRat(s, v)))) {
    reasons.push('answer_shown_earlier');
  }
  const statement = [reds, blacks, k, n];
  if (statement.includes(result[0]) || statement.includes(result[1])) {
    reasons.push('answer_from_statement');
  }
  if (sameRat(result, frac(reds, n)) || sameRat(result, frac(blacks, n))) {
    reasons.push('single_ball_equals_answer');
  }
  const table = mutationsFor(g);
  if (
    table.dropped.some(
      d =>
        d.why === 'equals_right_value' &&
        ['total', 'fav', 'result'].includes(d.nodeId),
    )
  ) {
    reasons.push('mutation_equals_right_value');
  }
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Twin urns (plan help and repairs)

/** Values a twin must not show, by the role they have in the question. */
export interface Forbidden {
  total: readonly Fraction[];
  fav: readonly Fraction[];
  result: readonly Fraction[];
}
export type TwinRole = 'total' | 'fav' | 'result';
export interface Collision {
  role: TwinRole;
  value: string;
}

export function twinOk(
  spec: UrnSpec,
  forbidden: Forbidden,
  opts: { mode: 'role_blind' | 'role_aware'; allow?: readonly number[] },
): { ok: boolean; collisions: Collision[]; allowed: Collision[] } {
  const g = buildUrnGraph(spec);
  const shown: { role: TwinRole; v: Fraction }[] = [
    { role: 'total', v: nodeOf(g, 'total').value },
    ...g.nodes
      .filter(x => x.id === 'ord')
      .map(x => ({ role: 'total' as const, v: x.value })),
    ...g.nodes
      .filter(x => x.planCard === 'fav' && x.role !== 'support')
      .map(x => ({ role: 'fav' as const, v: x.value })),
    { role: 'result', v: nodeOf(g, 'result').value },
  ];
  if (opts.mode === 'role_blind') {
    const r = nodeOf(g, 'result').value;
    shown.push(
      { role: 'result', v: frac(r[0]) },
      { role: 'result', v: frac(r[1]) },
    );
  }
  const pool = (role: TwinRole): readonly Fraction[] =>
    opts.mode === 'role_blind'
      ? [...forbidden.total, ...forbidden.fav, ...forbidden.result]
      : forbidden[role];
  const hits: Collision[] = [];
  for (const s of shown) {
    if (isKey(s.v) && pool(s.role).some(f => sameRat(f, s.v))) {
      const c = { role: s.role, value: ratToString(s.v) };
      if (!hits.some(h => h.role === c.role && h.value === c.value)) {
        hits.push(c);
      }
    }
  }
  const allow = new Set((opts.allow ?? []).map(String));
  const allowed = hits.filter(h => allow.has(h.value));
  const collisions = hits.filter(h => !allow.has(h.value));
  return { ok: collisions.length === 0, collisions, allowed };
}
