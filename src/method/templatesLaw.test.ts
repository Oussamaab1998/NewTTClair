/**
 * The numbered-ball templates on the exam's urn (Bac 2022, session de
 * contrôle, Mathématiques, exercice 2: balls −1, 0, 0, 1, 2, two drawn at
 * once): every value comes from the engine's enumeration, right roads are
 * credited, the slips of the real sessions are named, and the roads that land
 * on the right value with these numbers are refused (traps).
 */
import {
  enumerateOutcomes,
  expectation,
  law,
  probability,
  secondMoment,
  variance,
} from '../engine/probability';
import { evaluateExact, parseExpression } from '../engine/expression';
import { frac } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import { evaluateLine, type LineOutcome } from './frame';
import type { Graph } from './graph';
import { mutationsFor } from './mutations';
import { buildGraphFor, templateOf } from './templates';
import './library';
import { LAW_TEMPLATE_IDS, lawValues, valueNodeId } from './templatesLaw';

const BALLS = [-1, 0, 0, 1, 2];
const URN = BALLS.map((value, i) => ({ id: String.fromCharCode(97 + i), value }));
const OUTCOMES = enumerateOutcomes(URN, 'simultaneous', 2);
const LAW = law('product', OUTCOMES);

const graphOf = (template: string, args: object = {}): Graph =>
  buildGraphFor(
    { template, args: { balls: BALLS, ...args } as never },
    { inputs: {} },
  );

const SAME = graphOf('num_same');
const AT_LEAST = graphOf('num_at_least', { value: 0, reuseTotal: true });
const LAW_G = graphOf('num_law', { reuseValue: 0 });
const MOMENTS = graphOf('num_moments');

function judge(
  graph: Graph,
  card: string,
  raw: string,
  credited: string[] = [],
): LineOutcome {
  return evaluateLine({
    raw,
    graph,
    table: mutationsFor(graph),
    card,
    credited: new Set(credited),
  }).outcome;
}
const slip = (o: LineOutcome): string | null =>
  o.kind === 'mutation' ? o.id : null;
const value = (g: Graph, id: string) => g.nodes.find(n => n.id === id)!.value;

describe('the four templates', () => {
  it('are registered with their cards', () => {
    expect(LAW_TEMPLATE_IDS).toEqual([
      'num_same',
      'num_at_least',
      'num_law',
      'num_moments',
      'num_repeat_law',
      'num_repeat_mean',
    ]);
    expect(templateOf('num_same')!.cardKeys).toEqual(['total', 'fav', 'ratio']);
    expect(templateOf('num_at_least')!.cardKeys).toEqual([
      'total',
      'none',
      'result',
    ]);
    expect(templateOf('num_law')!.cardKeys).toEqual([
      'values',
      'reuse',
      'others',
      'check',
    ]);
    expect(templateOf('num_moments')!.cardKeys).toEqual([
      'mean',
      'square',
      'var',
    ]);
  });

  it('take their values from the engine', () => {
    const pA = probability({ id: 'all_equal' }, OUTCOMES).reduced;
    const pB = probability(
      { id: 'any_value', args: { value: 0 } },
      OUTCOMES,
    ).reduced;
    expect(value(SAME, 'total')).toEqual(frac(OUTCOMES.length));
    expect(value(SAME, 'result')).toEqual(pA);
    expect(value(AT_LEAST, 'result')).toEqual(pB);
    for (const row of LAW) {
      expect(value(LAW_G, valueNodeId(row.value))).toEqual(row.p);
    }
    expect(value(LAW_G, 'sum')).toEqual(frac(1));
    expect(value(MOMENTS, 'mean')).toEqual(expectation(LAW).fraction);
    expect(value(MOMENTS, 'square')).toEqual(secondMoment(LAW).fraction);
    expect(value(MOMENTS, 'var')).toEqual(variance(LAW).fraction);
    expect(lawValues({ balls: BALLS })).toEqual(LAW.map(r => r.value));
  });

  it('every accepted form evaluates to its node', () => {
    for (const g of [SAME, AT_LEAST, LAW_G, MOMENTS]) {
      for (const n of g.nodes) {
        for (const f of n.forms) {
          const p = parseExpression(f, { variables: [], constants: [] });
          expect(p.ok).toBe(true);
          const v = p.ok ? evaluateExact(p.ast) : null;
          expect(v !== null && sameRat(v, n.value)).toBe(true);
        }
      }
    }
  });

  it('refuses an urn it cannot use', () => {
    expect(() => graphOf('num_same', { balls: [1, 2, 3] })).toThrow(/no number is carried/);
    expect(() => graphOf('num_at_least', { value: 7 })).toThrow();
    expect(() => graphOf('num_law', { reuseValue: 5 })).toThrow(/never takes/);
    expect(() => graphOf('num_same', { balls: 'x' })).toThrow(/balls/);
  });
});

describe('1.a, the same number (num_same)', () => {
  it('credits the total with its calculation, C(5,2) included', () => {
    expect(judge(SAME, 'total', '5*4/(2*1)=10')).toMatchObject({
      kind: 'credit',
      completes: true,
    });
    expect(judge(SAME, 'total', 'C(5,2)=10')).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    });
  });

  it('asks for the calculation of a bare 10, and 5 × 2 = 10 is a trap', () => {
    expect(judge(SAME, 'total', '10').kind).toBe('unexplained');
    expect(slip(judge(SAME, 'total', '5*2=10'))).toBe('n_times_k');
  });

  it('names the slips of the total: ordered draws are a step, the two 0 taken as one ball is a slip', () => {
    expect(judge(SAME, 'total', '5*4=20').kind).toBe('support');
    expect(slip(judge(SAME, 'total', '4*3/(2*1)=6'))).toBe(
      'merges_identical_balls',
    );
  });

  it('the one draw {0 ; 0} is the favourable count, written alone or as C(2,2)', () => {
    expect(judge(SAME, 'fav', '1')).toMatchObject({ kind: 'credit' });
    expect(judge(SAME, 'fav', 'C(2,2)=1')).toMatchObject({ kind: 'credit' });
    expect(slip(judge(SAME, 'fav', '2'))).toBe('counts_balls_not_draws');
    expect(slip(judge(SAME, 'fav', '4'))).toBe('ball_drawn_twice');
  });

  it('the ratio, and the balls over the balls', () => {
    expect(judge(SAME, 'ratio', '1/10')).toMatchObject({
      kind: 'credit',
      completes: true,
    });
    expect(slip(judge(SAME, 'ratio', '2/5'))).toBe('counts_balls_not_pairs');
    expect(slip(judge(SAME, 'ratio', '10/1=10'))).toBe(
      'swap_numerator_denominator',
    );
  });
});

describe('1.b, at least one 0 through the opposite event (num_at_least)', () => {
  it('the total found in 1.a is reused as it is', () => {
    expect(judge(AT_LEAST, 'total', '10')).toMatchObject({ kind: 'credit' });
  });

  it('the opposite event: 3 draws, then 3/10, with the calculation', () => {
    expect(judge(AT_LEAST, 'none', 'C(3,2)=3').kind).toBe('credit');
    expect(judge(AT_LEAST, 'none', '3*2/(2*1)=3').kind).toBe('credit');
    // 3 balls without 0 happen to give 3 draws: a bare 3 says nothing of the road.
    expect(judge(AT_LEAST, 'none', '3').kind).toBe('unexplained');
    const p = judge(AT_LEAST, 'none', '3/10', ['none']);
    expect(p).toMatchObject({ kind: 'credit', completes: true });
  });

  it('the real session: 3 balls over 5 balls', () => {
    expect(slip(judge(AT_LEAST, 'none', '3/5', ['none']))).toBe(
      'counts_balls_not_pairs',
    );
  });

  it('the result: 1 − 3/10 or the draws counted directly; 7/10 alone is the printed target', () => {
    for (const raw of ['1-3/10=7/10', '(10-3)/10=7/10', '(2*3+1)/10=7/10']) {
      expect(judge(AT_LEAST, 'result', raw)).toMatchObject({
        kind: 'credit',
        completes: true,
      });
    }
    expect(judge(AT_LEAST, 'result', '7/10').kind).toBe('unexplained');
  });

  it('names the wrong results', () => {
    expect(slip(judge(AT_LEAST, 'result', '3/10'))).toBe('forgot_one_minus');
    expect(slip(judge(AT_LEAST, 'result', '2*3/10=6/10'))).toBe(
      'misses_double_draw',
    );
  });
});

describe('2.a, the law of X (num_law)', () => {
  it('P(X = 0) is P(B), reused as it is', () => {
    expect(judge(LAW_G, 'reuse', '7/10')).toMatchObject({
      kind: 'credit',
      completes: true,
    });
    expect(slip(judge(LAW_G, 'reuse', '3/10'))).toBe(
      'confuses_event_and_complement',
    );
  });

  it('the other values: the card closes with the last of its three lines', () => {
    const first = judge(LAW_G, 'others', '1/10');
    expect(first).toMatchObject({ kind: 'credit', completes: false });
    const node1 = first.kind === 'credit' ? first.node.id : '';
    const second = judge(LAW_G, 'others', '1/10', [node1]);
    expect(second).toMatchObject({ kind: 'credit', completes: false });
    const node2 = second.kind === 'credit' ? second.node.id : '';
    expect(node2).not.toBe(node1);
    expect(judge(LAW_G, 'others', '1/10', [node1, node2])).toMatchObject({
      kind: 'credit',
      completes: true,
    });
    expect(slip(judge(LAW_G, 'others', '1/5'))).toBe('counts_balls_not_pairs');
  });

  it('the check: the probabilities add up to 1, a value left out does not', () => {
    expect(
      judge(LAW_G, 'check', '1/10+1/10+7/10+1/10=1'),
    ).toMatchObject({ kind: 'credit', completes: true });
    expect(judge(LAW_G, 'check', '1').kind).toBe('unexplained');
    expect(slip(judge(LAW_G, 'check', '1/10+1/10+7/10=9/10'))).toBe(
      'law_sum_not_one',
    );
  });
});

describe('2.b, E(X), E(X²) and V(X) (num_moments)', () => {
  it('credits each with its calculation, and asks for it when the value is alone', () => {
    expect(
      judge(MOMENTS, 'mean', '-2*1/10-1*1/10+0*7/10+2*1/10=-1/10'),
    ).toMatchObject({ kind: 'credit', completes: true });
    expect(judge(MOMENTS, 'mean', '-1/10').kind).toBe('unexplained');
    expect(judge(MOMENTS, 'square', '4*1/10+1*1/10+4*1/10=9/10')).toMatchObject({
      kind: 'credit',
    });
    expect(judge(MOMENTS, 'var', '9/10-1/100=89/100')).toMatchObject({
      kind: 'credit',
      completes: true,
    });
  });

  it('names the slips of the moments', () => {
    expect(slip(judge(MOMENTS, 'mean', '(-2-1+0+2)/4=-1/4'))).toBe(
      'mean_of_values_unweighted',
    );
    expect(slip(judge(MOMENTS, 'square', '1/100'))).toBe('square_of_mean');
    expect(slip(judge(MOMENTS, 'var', '9/10+1/10=1'))).toBe(
      'variance_forgets_square',
    );
    expect(slip(judge(MOMENTS, 'var', '9/10+1/100=91/100'))).toBe(
      'variance_adds_square',
    );
  });
});
