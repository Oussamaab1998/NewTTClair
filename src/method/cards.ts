/**
 * What happens after a sentence card is picked (docs/METHOD_LESSON_PLAN.md G,
 * the specs of Questions 2 and 3): an EVALUATOR, registered by id, so a new
 * kind of claim is domain code here and the data of a question just names
 * it. The engine computes every prediction; the student's pick is never
 * graded by text.
 */
import type { CardOption } from '../content/schema';
import {
  parseCountingAnswer,
  substituteSymbols,
} from '../engine/expression/counting';
import { binomialMean, binomialTerm, binomialVariance } from './binomialMath';
import {
  claimSetOk,
  derivedTruth,
  evalWith,
  predictClaim,
  type Truth,
} from './claims';
import type { Graph } from './graph';
import type { MethodNote } from './note';
import { ratToString, sameRat } from '../engine/rationalFormat';
import type { Fraction } from '../engine/rational';

export interface CardCtx {
  card: CardOption;
  cards: readonly CardOption[];
  args: Readonly<Record<string, unknown>>;
  /** The block's expected graph. */
  graph?: Graph;
  /** His credited line by node id (a formula card is tested on his own numbers). */
  lines: Readonly<Record<string, string>>;
}

export interface CardVerdict {
  correct: boolean;
  notes: MethodNote[];
}

export type Evaluator = (c: CardCtx) => CardVerdict;

/** Load-time check of a set of cards for this evaluator: the problems found (none = fine). */
export type CardsValidator = (
  args: Readonly<Record<string, unknown>>,
  cards: readonly CardOption[],
  graph?: Graph,
) => string[];

const EVALUATORS = new Map<string, Evaluator>();
const VALIDATORS = new Map<string, CardsValidator>();
export function registerEvaluator(
  id: string,
  fn: Evaluator,
  validate?: CardsValidator,
): void {
  EVALUATORS.set(id, fn);
  if (validate) {
    VALIDATORS.set(id, validate);
  }
}

/** What the loader asks of the cards of a frame (unknown evaluator included). */
export function validateCards(
  evaluator: string,
  args: Readonly<Record<string, unknown>>,
  cards: readonly CardOption[],
  graph?: Graph,
): string[] {
  if (!EVALUATORS.has(evaluator)) {
    return [`unknown evaluator ${evaluator}`];
  }
  const one = cards.filter(c => c.truth === 'true').length;
  const problems =
    one === 1 ? [] : [`exactly one card must be true, found ${one}`];
  return [
    ...problems,
    ...(VALIDATORS.get(evaluator)?.(args, cards, graph) ?? []),
  ];
}
export const evaluatorOf = (id: string): Evaluator | undefined =>
  EVALUATORS.get(id);

/** Default: the card is right or wrong. */
registerEvaluator('pick', ({ card }) => ({
  correct: card.truth === 'true',
  notes: [],
}));

/**
 * "Always x2" on a new box: every card is a relation predicting the number of
 * groups from the ordered draws; the engine computes it on the test case in
 * `args` ({ n, k }) and shows the prediction against the real count.
 */
registerEvaluator(
  'groups_claim',
  ({ card, args }) => {
    const testCase = { n: Number(args.n), k: Number(args.k) };
    const expr = String(card.claim?.predictsGroups ?? '');
    const r = predictClaim(expr, testCase);
    return {
      correct: card.truth === 'true',
      notes: [
        {
          kind: 'claim_result',
          rows: [
            {
              predicted: ratToString(r.predicted),
              actual: ratToString(r.actual),
              holds: r.holds,
            },
          ],
        },
      ],
    };
  },
  (args, cards) => {
    const testCase = { n: Number(args.n), k: Number(args.k) };
    try {
      return claimSetOk(
        cards.map(c => {
          const predictsGroups = String(c.claim?.predictsGroups ?? '');
          const derived = derivedTruth(predictsGroups);
          return {
            id: c.id,
            predictsGroups,
            // A claim that only holds for pairs is a false card for the student (it breaks on a bigger box).
            truth: (c.truth === 'true'
              ? 'true'
              : derived === 'true_only_for_k2'
              ? 'true_only_for_k2'
              : 'false') as Truth,
          };
        }),
        testCase,
      ).problems;
    } catch (e) {
      return [(e as Error).message];
    }
  },
);

/**
 * "What the claim says about the COUNT of this event" (Question 2: the event
 * is the opposite of the earlier one, or the same size, or part of what is
 * left): `predicts` is an expression in the graph's named values (`t` all the
 * draws, `a` the earlier event's count, `b` this event's real count) and
 * `relation` says whether the real count must equal it or stay below it.
 * The engine computes both; his pick is never graded by its wording.
 */
const countClaimRow = (card: CardOption, graph: Graph | undefined) => {
  const vars = graph?.vars ?? {};
  const predicted = evalWith(String(card.claim?.predicts ?? ''), vars);
  const actual = evalWith(String(card.claim?.actual ?? 'b'), vars);
  const below = card.claim?.relation === 'le';
  const holds = below
    ? actual[0] * predicted[1] <= predicted[0] * actual[1]
    : sameRat(predicted, actual);
  return {
    predicted: `${below ? '\\le ' : ''}${ratToString(predicted)}`,
    actual: ratToString(actual),
    holds,
  };
};

registerEvaluator(
  'count_claim',
  ({ card, graph }) => {
    const row = countClaimRow(card, graph);
    return {
      correct: card.truth === 'true',
      notes: [{ kind: 'claim_result', rows: [row] }],
    };
  },
  (_args, cards, graph) => {
    if (!graph?.vars) {
      return ['count_claim needs a graph with named values'];
    }
    try {
      return cards.flatMap(c =>
        countClaimRow(c, graph).holds === (c.truth === 'true')
          ? []
          : [
              `${c.id}: the engine says it ${
                countClaimRow(c, graph).holds ? 'holds' : 'fails'
              }, authored ${c.truth}`,
            ],
      );
    } catch (e) {
      return [(e as Error).message];
    }
  },
);

/**
 * "The general formula" (Question 3): each card holds one or more formulas in
 * the letters n and k (`C(n,k)/2^n`, `n/4`), written for the paper, not for
 * the pad. The engine puts HIS numbers (and a few cases of its own) in place
 * of the letters and shows each prediction against the real value, so a wrong
 * formula is falsified by his own number. `claim.formulas` is a list of
 * `{ target: 'term' | 'mean' | 'variance', formula }`; `args.cases` lists the
 * other cases (`{ n, k? }`); his case comes from the graph's named values.
 */
interface FormulaSpec {
  target: 'term' | 'mean' | 'variance';
  formula: string;
}
const formulasOf = (card: CardOption): FormulaSpec[] => {
  const list = card.claim?.formulas;
  return Array.isArray(list)
    ? (list as unknown as FormulaSpec[]).filter(
        f =>
          typeof f?.formula === 'string' &&
          ['term', 'mean', 'variance'].includes(f.target),
      )
    : [];
};

function formulaRows(
  card: CardOption,
  graph: Graph | undefined,
  args: Readonly<Record<string, unknown>>,
) {
  const vars = graph?.vars ?? {};
  const p = vars.p;
  if (!p || !vars.n) {
    throw new Error('formula cards need a graph with n and p');
  }
  const own: { n: number; k?: number } = {
    n: vars.n[0],
    ...(vars.k && { k: vars.k[0] }),
  };
  const more = Array.isArray(args.cases)
    ? (args.cases as { n: number; k?: number }[])
    : [];
  const rows: {
    label: string;
    predicted: string;
    actual: string;
    holds: boolean;
  }[] = [];
  for (const f of formulasOf(card)) {
    for (const c of [own, ...more]) {
      if (f.target === 'term' && c.k === undefined) {
        continue;
      }
      const text = substituteSymbols(f.formula, {
        n: c.n,
        ...(c.k !== undefined && { k: c.k }),
      });
      const v = parseCountingAnswer(text);
      if (!v.ok) {
        throw new Error(
          `formula does not evaluate: ${f.formula} (${v.reason})`,
        );
      }
      const actual: Fraction =
        f.target === 'term'
          ? binomialTerm(c.n, c.k!, p)
          : f.target === 'mean'
          ? binomialMean(c.n, p)
          : binomialVariance(c.n, p);
      rows.push({
        label:
          f.target === 'term'
            ? `n = ${c.n},\\ k = ${c.k}`
            : `${f.target === 'mean' ? 'E(X)' : 'V(X)'},\\ n = ${c.n}`,
        predicted: ratToString(v.value),
        actual: ratToString(actual),
        holds: sameRat(v.value, actual),
      });
    }
  }
  return rows;
}

registerEvaluator(
  'formula',
  ({ card, graph, args }) => ({
    correct: card.truth === 'true',
    notes: [{ kind: 'claim_result', rows: formulaRows(card, graph, args) }],
  }),
  (args, cards, graph) => {
    try {
      return cards.flatMap(c => {
        const rows = formulaRows(c, graph, args);
        const holds = rows.length > 0 && rows.every(r => r.holds);
        return holds === (c.truth === 'true')
          ? []
          : [
              `${c.id}: the engine says it ${
                holds ? 'holds' : 'fails'
              }, authored ${c.truth}`,
            ];
      });
    } catch (e) {
      return [(e as Error).message];
    }
  },
);
