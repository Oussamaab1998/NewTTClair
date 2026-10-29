/**
 * Fresh urn variants (docs/COMPONENTS_PROBABILITY_V2.md E10, C11): a new urn
 * for a student who was shown the answer, so the new answer cannot be guessed
 * from the old step. Two templates, `urn_exactly_j` (exactly j reds among k
 * drawn) and `repeated_trials_table` (P(X = j) of n trials). Seeded and
 * deterministic; every number is computed by the engine and verified a second
 * way; a candidate is refused when its answer is the parent's answer, one of
 * the parent's known wrong values, or one of ITS OWN wrong-procedure values
 * (a coincidence the student could not tell from the right method).
 * `freshCandidateOk` is the one rule: the content loader calls it too.
 */
import { runEngineCall, type Experiment } from './calls';
import { chooseLine, divisionLine, productLine } from './calcLines';
import { choose } from './combinatorics';
import { rng } from './expression/equivalence';
import { binomialSafe } from './binomialSafe';
import { binomialPmf, type EventSpec } from './probability';
import { runProcedure, type ProcedureId } from './procedures';
import {
  EngineError,
  equals,
  frac,
  mul,
  pow,
  sub,
  type Fraction,
} from './rational';
import { ratToLatex } from './rationalFormat';

export const URN_TEMPLATES = ['urn_exactly_j', 'repeated_trials_table'] as const;
export type UrnTemplateId = (typeof URN_TEMPLATES)[number];

/** What a fresh variant must not be confused with. */
export interface FreshParent {
  /** The parent step's answer, when it has a numeric one. */
  answer?: Fraction | null;
  /** Every wrong value the parent knows: authored, the other options', procedure values. */
  wrong?: readonly Fraction[];
}

export type FreshVerdict =
  | { ok: true }
  | { ok: false; reason: 'equals_answer' | 'equals_wrong' };

/** The rule of the loader's `checkFreshVariants`, in one place. */
export function freshCandidateOk(parent: FreshParent, candidate: Fraction): FreshVerdict {
  if (parent.answer && equals(parent.answer, candidate)) {
    return { ok: false, reason: 'equals_answer' };
  }
  if ((parent.wrong ?? []).some(w => equals(w, candidate))) {
    return { ok: false, reason: 'equals_wrong' };
  }
  return { ok: true };
}

export interface UrnVariant {
  templateId: UrnTemplateId;
  seed: number;
  /** Candidates tried (including the accepted one). */
  attempts: number;
  /** urn_exactly_j: the urn and the draw. repeated_trials_table: `reds` = n, `blacks` = 0, k = n. */
  urn: { reds: number; blacks: number; k: number };
  /** The number of reds asked for (j) / the number of successes. */
  j: number;
  /** repeated_trials_table: P(S). */
  p?: Fraction;
  answer: Fraction;
  /** The wrong values a student of THIS variant could write (engine procedures or named slips). */
  wrong: Fraction[];
  /** Engine LaTeX lines of the solution (never shown before the student's own work). */
  lines: string[];
}

/**
 * The slips a student of a PROBABILITY step makes. `ordered_draw` is left out
 * on purpose: the probability of an event is the same computed on ordered
 * draws (it is a slip for a count, not for a probability), so it would always
 * equal the answer.
 */
const PROBABILITY_SLIPS: readonly ProcedureId[] = [
  'balls_in_event',
  'with_replacement',
  'opposite_event',
  'merged_identical',
  'total_over_favourable',
];

const eventExactly = (j: number): EventSpec => ({
  id: 'value_eq',
  args: { valueFn: { id: 'count_value', args: { value: 1 } }, value: j },
});

const experimentOf = (reds: number, blacks: number, k: number): Experiment => ({
  urn: [
    ...Array.from({ length: reds }, (_, i) => ({ id: `r${i + 1}`, value: 1 })),
    ...Array.from({ length: blacks }, (_, i) => ({ id: `n${i + 1}`, value: 0 })),
  ],
  draw: 'simultaneous',
  k,
});

const pickFrom = <T>(next: () => number, xs: readonly T[]): T =>
  xs[Math.floor(next() * xs.length) % xs.length]!;

/** The urn candidate for a seed and an attempt (small urns: at most 60 draws, the display limit). */
function urnCandidate(next: () => number): { reds: number; blacks: number; k: number; j: number } {
  for (;;) {
    const reds = 2 + Math.floor(next() * 5);
    const blacks = 2 + Math.floor(next() * 5);
    const k = pickFrom(next, [2, 3]);
    if (reds + blacks < k + 1 || choose(reds + blacks, k) > 60) {
      continue;
    }
    const j = 1 + Math.floor(next() * Math.min(k, reds));
    if (k - j > blacks || j > reds) {
      continue;
    }
    return { reds, blacks, k, j };
  }
}

function exactlyJ(
  seed: number,
  attempt: number,
  next: () => number,
): Omit<UrnVariant, 'templateId' | 'seed' | 'attempts'> {
  const { reds, blacks, k, j } = urnCandidate(next);
  const total = choose(reds + blacks, k);
  const favourable = choose(reds, j) * choose(blacks, k - j);
  const answer = frac(favourable, total);
  // verified a second way: the engine enumerates the draws
  const ex = experimentOf(reds, blacks, k);
  const call = { fn: 'probability', args: { event: eventExactly(j) } };
  const enumerated = runEngineCall(call, { experiment: ex });
  if (!enumerated.ok || !equals(enumerated.value, answer)) {
    throw new EngineError(`urn_exactly_j: formula and enumeration disagree (seed ${seed}, attempt ${attempt})`);
  }
  const wrong = PROBABILITY_SLIPS.flatMap(id => {
    const r = runProcedure(id, call, { experiment: ex });
    return r.ok ? r.value : [];
  });
  return {
    urn: { reds, blacks, k },
    j,
    answer,
    wrong,
    lines: [
      chooseLine(reds + blacks, k),
      productLine([choose(reds, j), choose(blacks, k - j)]),
      divisionLine(favourable, total),
    ],
  };
}

const P_CHOICES: readonly Fraction[] = [frac(1, 3), frac(1, 4), frac(1, 5), frac(1, 6), frac(2, 5), frac(3, 4)];

function tableTerm(
  seed: number,
  attempt: number,
  next: () => number,
): Omit<UrnVariant, 'templateId' | 'seed' | 'attempts'> {
  const n = 3 + Math.floor(next() * 4);
  const p = pickFrom(next, P_CHOICES);
  const j = 1 + Math.floor(next() * (n - 1));
  if (!binomialSafe(n, p).ok) {
    throw new EngineError(`repeated_trials_table: not exact (seed ${seed}, attempt ${attempt})`);
  }
  const q = sub(frac(1), p);
  const answer = binomialPmf(n, p, j);
  // the slips seen: forgetting C(n,j), forgetting q^(n-j), reading j / n
  const wrong = [
    pow(p, j),
    mul(frac(choose(n, j)), pow(p, j)),
    mul(frac(choose(n, j)), pow(q, n - j)),
    frac(j, n),
  ];
  return {
    urn: { reds: n, blacks: 0, k: n },
    j,
    p,
    answer,
    wrong,
    lines: [
      chooseLine(n, j),
      `(${ratToLatex(p)})^{${j}} \\times (${ratToLatex(q)})^{${n - j}}`,
      productLine([choose(n, j), pow(p, j), pow(q, n - j)]),
    ],
  };
}

export interface GenerateOptions {
  templateId: UrnTemplateId;
  seed: number;
  parent?: FreshParent;
  /** Candidates tried before giving up (default 200). */
  maxAttempts?: number;
}

/** A fresh variant for this seed: the same input always gives the same variant. Throws when none is found. */
export function generateUrnVariant(o: GenerateOptions): UrnVariant {
  if (!Number.isInteger(o.seed) || o.seed < 1) {
    throw new EngineError('seed must be a positive integer');
  }
  const next = rng(o.seed * 7919 + 3);
  const limit = o.maxAttempts ?? 200;
  for (let attempt = 1; attempt <= limit; attempt++) {
    const c =
      o.templateId === 'urn_exactly_j'
        ? exactlyJ(o.seed, attempt, next)
        : tableTerm(o.seed, attempt, next);
    const fresh = freshCandidateOk(o.parent ?? {}, c.answer).ok;
    // one of its own wrong methods giving the right value would hide the difference
    const ownCoincidence = c.wrong.some(w => equals(w, c.answer));
    if (fresh && !ownCoincidence) {
      return { templateId: o.templateId, seed: o.seed, attempts: attempt, ...c };
    }
  }
  throw new EngineError(
    `no fresh ${o.templateId} variant after ${limit} attempts (seed ${o.seed})`,
  );
}

/** Up to `count` different fresh variants, seeds from `fromSeed` (a helper for authors of `afterReveal` transfers). */
export function proposeUrnVariants(
  templateId: UrnTemplateId,
  parent: FreshParent,
  count: number,
  fromSeed = 1,
): UrnVariant[] {
  const out: UrnVariant[] = [];
  const seen = new Set<string>();
  for (let seed = fromSeed; out.length < count && seed < fromSeed + 500; seed++) {
    try {
      const v = generateUrnVariant({ templateId, seed, parent });
      const key = `${v.urn.reds},${v.urn.blacks},${v.urn.k},${v.j}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(v);
      }
    } catch {
      // this seed found nothing: try the next
    }
  }
  return out;
}
