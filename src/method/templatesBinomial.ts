/**
 * Binomial templates (Question 3): the law of X (one term, built from a
 * sequence and a count) and its mean and variance (one trial, then n trials).
 * Domain code, like the urn templates: a new kind of question adds a template
 * here, never a line of the reducer, the loader or the schema. The pad has no
 * letters and no power key, so every accepted form is written with products
 * and quotients of numbers (`1/2*1/2*...`), and the general formula is
 * chosen from cards the engine tests on the student's own numbers.
 */
import {
  choose,
  EngineError,
  frac,
  mul,
  sub,
  type Fraction,
} from '../engine/rational';
import {
  binomialMean,
  binomialVariance,
  oneTrialVariance,
  sequenceProbability,
} from './binomialMath';
import {
  chooseForms,
  type Graph,
  type GraphNode,
  type RawMutation,
} from './graph';
import {
  registerTemplate,
  type Args,
  type GraphCtx,
  type Template,
} from './templates';

const SPEC = { reds: 0, blacks: 0, k: 0, j: 0 };
const fr = (v: Fraction): string =>
  v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`;
const times = (s: string, n: number): string[] =>
  Array.from({ length: n }, () => s);

function int(args: Args, key: string): number {
  const v = args[key];
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw new EngineError(`template argument ${key} must be an integer`);
  }
  return v;
}

/** p: the `p` argument as [num, den], else the question before's result (`inputs.p`). */
function probabilityOf(args: Args, ctx: GraphCtx): Fraction {
  const a = args.p;
  if (Array.isArray(a) && a.length === 2 && a.every(x => Number.isInteger(x))) {
    return frac(a[0] as number, a[1] as number);
  }
  const p = ctx.inputs.p;
  if (!p) {
    throw new EngineError(
      'this template needs p (an argument [num, den] or an input named p)',
    );
  }
  return p;
}

const node = (
  n: Partial<GraphNode> &
    Pick<GraphNode, 'id' | 'planCard' | 'value' | 'forms'>,
): GraphNode => ({
  role: 'part',
  unit: 'ratio',
  bareOk: false,
  inputs: [],
  shape: { kind: 'product', of: [] },
  main: true,
  ...n,
});

// ---------------------------------------------------------------- binomial_term

const termTemplate: Template = {
  id: 'binomial_term',
  cardKeys: ['type', 'seq', 'count', 'law'],
  build(args, ctx) {
    const n = int(args, 'n');
    const k = int(args, 'k');
    const p = probabilityOf(args, ctx);
    const q = sub(frac(1), p);
    const pS = fr(p);
    const qS = fr(q);
    const seq = sequenceProbability(n, k, p);
    const count = frac(choose(n, k));
    const result = mul(count, seq);
    const factors = [...times(pS, k), ...times(qS, n - k)];
    const seqS = fr(seq);
    const [sn, sd] = seq;
    const seqProduct = factors.join('*');
    const seqParen = factors
      .map(f => (f.includes('/') ? `(${f})` : f))
      .join('*');
    const nodes: GraphNode[] = [
      node({
        id: 'seq',
        planCard: 'seq',
        value: seq,
        forms: [...new Set([seqProduct, seqParen, seqS])],
        shape: { kind: 'product', of: [] },
      }),
      node({
        id: 'count',
        planCard: 'count',
        unit: 'count',
        value: count,
        forms: chooseForms(n, k),
        bareOk: k === 1,
        shape: { kind: 'choose', n, k },
      }),
      node({
        id: 'result',
        planCard: 'law',
        role: 'result',
        value: result,
        forms: [
          ...new Set([
            `${count[0]}*${sn}/${sd}`,
            `${count[0]}*(${sn}/${sd})`,
            `${count[0]}*${seqProduct}`,
            fr(result),
          ]),
        ],
        inputs: ['seq', 'count'],
        shape: { kind: 'product', of: ['count', 'seq'] },
      }),
    ];
    const graph: Graph = {
      spec: SPEC,
      order: 'unordered',
      nodes,
      template: 'binomial_term',
      cards: ['type', 'seq', 'count', 'law'],
      vars: { n: frac(n), k: frac(k), p },
    };
    const fallingProduct = Array.from({ length: k }, (_, i) =>
      String(n - i),
    ).join('*');
    const mutate = (nd: GraphNode): RawMutation[] => {
      const add = (id: string, expr: string) => ({ id, nodeId: nd.id, expr });
      if (nd.id === 'seq') {
        return [
          add('p_single_trial', pS),
          add('forgets_failures', times(pS, k).join('*')),
          add('forgets_successes', times(qS, n - k).join('*')),
          add('adds_instead_of_multiplies', factors.join('+')),
        ];
      }
      if (nd.id === 'count') {
        return [
          ...(k >= 2
            ? [
                add('drop_division', fallingProduct),
                add('divide_by_k_not_k_factorial', `${fallingProduct}/${k}`),
              ]
            : []),
          add('reads_choose_as_fraction', `${n}/${k}`),
          add('n_times_k', `${n}*${k}`),
          add('n_for_count', String(n)),
          add('k_for_count', String(k)),
        ];
      }
      return [
        add('one_sequence_as_P_X_k', seqS),
        add('count_given_as_probability', String(count[0])),
        add('x_given_as_probability', String(k)),
        add('law_forgets_failures', `${count[0]}*${times(pS, k).join('*')}`),
        add('law_n_for_count', `${n}*${sn}/${sd}`),
      ];
    };
    return { ...graph, mutate };
  },
};

// ------------------------------------------------------------- binomial_moments

const momentsTemplate: Template = {
  id: 'binomial_moments',
  cardKeys: ['mean1', 'meann', 'var1', 'varn'],
  build(args, ctx) {
    const n = int(args, 'n');
    const p = probabilityOf(args, ctx);
    const q = sub(frac(1), p);
    const pS = fr(p);
    const qS = fr(q);
    const m1 = p;
    const mn = binomialMean(n, p);
    const v1 = oneTrialVariance(p);
    const vn = binomialVariance(n, p);
    if (fr(v1) !== fr(mul(p, q))) {
      throw new EngineError('the variance of one trial must equal p q');
    }
    const nodes: GraphNode[] = [
      node({
        id: 'mean1',
        planCard: 'mean1',
        value: m1,
        forms: [`0*(${qS})+1*(${pS})`, `0*${qS}+1*${pS}`, pS],
      }),
      node({
        id: 'meann',
        planCard: 'meann',
        value: mn,
        forms: [`${n}*(${pS})`, `${n}*${pS}`, times(pS, n).join('+'), fr(mn)],
        inputs: ['mean1'],
      }),
      node({
        id: 'var1',
        planCard: 'var1',
        value: v1,
        forms: [
          `(0-${pS})*(0-${pS})*(${qS})+(1-${pS})*(1-${pS})*(${pS})`,
          `(0-(${pS}))*(0-(${pS}))*(${qS})+(1-(${pS}))*(1-(${pS}))*(${pS})`,
          `${pS}*${qS}`,
          `(${pS})*(${qS})`,
          fr(v1),
        ],
        inputs: ['mean1'],
      }),
      node({
        id: 'varn',
        planCard: 'varn',
        role: 'result',
        value: vn,
        forms: [
          `${n}*(${fr(v1)})`,
          `${n}*${fr(v1)}`,
          `${n}*${pS}*${qS}`,
          fr(vn),
        ],
        inputs: ['var1'],
      }),
    ];
    const graph: Graph = {
      spec: SPEC,
      order: 'unordered',
      nodes,
      template: 'binomial_moments',
      cards: ['mean1', 'meann', 'var1', 'varn'],
      vars: { n: frac(n), p },
    };
    const mutate = (nd: GraphNode): RawMutation[] => {
      const add = (id: string, expr: string) => ({ id, nodeId: nd.id, expr });
      switch (nd.id) {
        case 'meann':
          return [
            add('mean_of_one_trial_for_n', pS),
            add('n_instead_of_np', String(n)),
          ];
        case 'var1':
          return [
            add('variance_as_mean', pS),
            add('variance_p_squared', `${pS}*${pS}`),
          ];
        case 'varn':
          return [
            add('variance_forgets_n', fr(v1)),
            add('variance_as_mean', `${n}*${pS}`),
            add('variance_p_squared', `${n}*${pS}*${pS}`),
          ];
        default:
          return [];
      }
    };
    return { ...graph, mutate };
  },
};

registerTemplate(termTemplate);
registerTemplate(momentsTemplate);
