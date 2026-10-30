/**
 * Urn templates beyond the first question (Question 2): "no red" reuses the
 * same graph as "exactly one red" (j = 0) but knows the numbers of the
 * question before it (its inputs), so it can recognise the slips that come
 * from them; "at least one red" is the complement of "no red".
 * Domain code: a new kind of question adds a template here, never a line of
 * the reducer, the loader or the schema.
 */
import { choose, EngineError, frac, type Fraction } from '../engine/rational';
import {
  buildUrnGraph,
  type Graph,
  type GraphNode,
  type RawMutation,
} from './graph';
import { rawFor } from './mutations';
import {
  registerTemplate,
  urnOf,
  type Args,
  type GraphCtx,
  type Template,
} from './templates';

const fr = (v: Fraction): string =>
  v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`;
const falling = (n: number, k: number): string =>
  Array.from({ length: k }, (_, i) => String(n - i)).join('*');
const fact = (k: number): string =>
  Array.from({ length: k }, (_, i) => String(k - i)).join('*');

const int = (args: Args, key: string, fallback: number): number => {
  const v = args[key];
  return typeof v === 'number' && Number.isInteger(v) ? v : fallback;
};

/** The slips that come from the question before ("the A count for B", "one minus P(A)"). */
export function inputSlips(
  node: GraphNode,
  inputs: GraphCtx['inputs'],
  total: Fraction,
): RawMutation[] {
  const out: RawMutation[] = [];
  const a = inputs.A_count;
  const p = inputs.P_A;
  if (node.id === 'fav' && a && a[1] === 1) {
    out.push({ id: 'a_count_for_b', nodeId: 'fav', expr: String(a[0]) });
  }
  if (node.id === 'result' && p && a && a[1] === 1 && total[1] === 1) {
    out.push(
      { id: 'complement_of_A', nodeId: 'result', expr: `1-${fr(p)}` },
      {
        id: 'complement_of_A',
        nodeId: 'result',
        expr: `1-${a[0]}/${total[0]}`,
      },
      {
        id: 'complement_of_A',
        nodeId: 'result',
        expr: `(${total[0]}-${a[0]})/${total[0]}`,
      },
      { id: 'complement_of_A', nodeId: 'result', expr: fr(p) },
    );
  }
  return out;
}

/** "Exactly j red", now aware of an earlier question's numbers. */
const exactly: Template = {
  id: 'urn_exactly_j',
  cardKeys: ['total', 'fav', 'ratio'],
  build(args, ctx) {
    const u = urnOf(args, ctx);
    const j = int(args, 'j', 1);
    const g = buildUrnGraph(
      { ...u, j },
      args.order === 'ordered' ? 'ordered' : 'unordered',
    );
    const nodes = g.nodes.map(n =>
      n.id === 'total' && args.reuseTotal === true ? { ...n, bareOk: true } : n,
    );
    const total = nodes.find(n => n.id === 'total')!.value;
    const fav = nodes.find(n => n.id === 'fav');
    // A twin box compares with another event of its own (`aJ` reds), computed here.
    const aJ = typeof args.aJ === 'number' ? args.aJ : undefined;
    const aTwin =
      aJ !== undefined
        ? frac(choose(u.reds, aJ) * choose(u.blacks, u.k - aJ))
        : undefined;
    const vars: Record<string, Fraction> = {
      t: total,
      ...(fav && { b: fav.value }),
      ...((aTwin ?? ctx.inputs.A_count) && {
        a: (aTwin ?? ctx.inputs.A_count)!,
      }),
      ...(ctx.inputs.P_A && { p: ctx.inputs.P_A }),
    };
    const extraMutate = (node: GraphNode): RawMutation[] => [
      ...(j === 0 && node.id === 'fav' && u.reds >= u.k && u.k >= 2
        ? [
            {
              id: 'colour_swapped',
              nodeId: 'fav',
              expr: `${falling(u.reds, u.k)}/(${fact(u.k)})`,
            },
          ]
        : []),
      ...inputSlips(node, ctx.inputs, total),
      // Draws WITHOUT replacement taken for independent trials (Question 3's twist).
      ...(args.dependentTrap === true && node.id === 'result'
        ? [
            {
              id: 'binomial_for_dependent',
              nodeId: 'result',
              expr: `${choose(u.k, j)}*${Array.from(
                { length: j },
                () => `${u.reds}/${u.reds + u.blacks}`,
              )
                .concat(
                  Array.from(
                    { length: u.k - j },
                    () => `${u.blacks}/${u.reds + u.blacks}`,
                  ),
                )
                .join('*')}`,
            },
          ]
        : []),
    ];
    return {
      ...g,
      nodes,
      template: 'urn_exactly_j',
      cards: ['total', 'fav', 'ratio'],
      vars,
      extraMutate,
    };
  },
  call(cardKey, args) {
    const event = {
      id: 'value_eq',
      args: {
        valueFn: { id: 'count_value', args: { value: 1 } },
        value: int(args, 'j', 1),
      },
    };
    return cardKey === 'total'
      ? { fn: 'outcomeCount', args: {} }
      : cardKey === 'fav'
      ? { fn: 'count', args: { event } }
      : cardKey === 'ratio'
      ? { fn: 'probability', args: { event } }
      : null;
  },
};

/** "At least one red": all the draws minus the draws with no red. */
const atLeastOne: Template = {
  id: 'urn_at_least_one',
  cardKeys: ['total', 'fav', 'ratio'],
  build(args, ctx) {
    const u = urnOf(args, ctx);
    if (int(args, 'j', 1) !== 1) {
      throw new EngineError('urn_at_least_one needs j = 1');
    }
    const base = buildUrnGraph({ ...u, j: 0 });
    const support = base.nodes.filter(n => n.planCard === 'total');
    const total = base.nodes.find(n => n.id === 'total')!;
    const noneBase = base.nodes.find(n => n.id === 'fav')!;
    const none: GraphNode = {
      ...noneBase,
      id: 'none',
      role: 'part',
      main: false,
      bareOk: false,
    };
    const slices: string[] = [];
    for (let i = 1; i <= Math.min(u.k, u.reds); i++) {
      if (u.k - i <= u.blacks) {
        slices.push(String(choose(u.reds, i) * choose(u.blacks, u.k - i)));
      }
    }
    const favValue = frac(total.value[0] - none.value[0]);
    const fav: GraphNode = {
      id: 'fav',
      planCard: 'fav',
      role: 'combine',
      unit: 'groups',
      value: favValue,
      forms: [
        `${total.value[0]}-${none.value[0]}`,
        ...total.forms.flatMap(t => none.forms.map(n => `(${t})-(${n})`)),
        slices.join('+'),
      ],
      bareOk: false,
      inputs: ['total', 'none'],
      shape: { kind: 'difference', of: ['total', 'none'] },
      main: true,
    };
    const resultBase = buildUrnGraph({ ...u, j: 0 }).nodes.find(
      n => n.id === 'result',
    )!;
    const resultValue = frac(
      favValue[0] * total.value[1],
      favValue[1] * total.value[0],
    );
    const pNone = fr(resultBase.value);
    const result: GraphNode = {
      ...resultBase,
      value: resultValue,
      forms: [
        `${fr(favValue)}/${fr(total.value)}`,
        fr(resultValue),
        `1-${pNone}`,
        `1-${none.value[0]}/${total.value[0]}`,
        `(${total.value[0]}-${none.value[0]})/${total.value[0]}`,
      ],
      inputs: ['fav', 'total'],
      shape: { kind: 'ratio', num: 'fav', den: 'total' },
    };
    const nodes = [...support, none, fav, result];
    const graph: Graph = { ...base, nodes };
    const a = ctx.inputs.A_count;
    const p = ctx.inputs.P_A;
    const mutate = (node: GraphNode): RawMutation[] => {
      if (node.id === 'total' || node.id === 'none') {
        return rawFor(graph, node);
      }
      if (node.id === 'fav') {
        return [
          {
            id: 'forgot_to_subtract',
            nodeId: 'fav',
            expr: String(none.value[0]),
          },
          ...(a && a[1] === 1
            ? [
                {
                  id: 'exactly_instead_of_at_least',
                  nodeId: 'fav',
                  expr: String(a[0]),
                },
              ]
            : []),
          { id: 'drop_division', nodeId: 'fav', expr: `${total.value[0]}` },
        ];
      }
      if (node.id === 'result') {
        return [
          { id: 'forgot_one_minus', nodeId: 'result', expr: pNone },
          ...(p
            ? [
                {
                  id: 'complement_of_wrong_event',
                  nodeId: 'result',
                  expr: `1-${fr(p)}`,
                },
              ]
            : []),
          ...(p
            ? [
                {
                  id: 'adds_wrong_cases',
                  nodeId: 'result',
                  expr: `${fr(p)}+${pNone}`,
                },
              ]
            : []),
          {
            id: 'swap_numerator_denominator',
            nodeId: 'result',
            expr: `${total.value[0]}/${favValue[0]}`,
          },
        ];
      }
      return [];
    };
    return {
      ...graph,
      template: 'urn_at_least_one',
      cards: ['total', 'fav', 'ratio'],
      vars: { t: total.value, b: favValue },
      mutate,
    };
  },
  call(cardKey) {
    return cardKey === 'total' ? { fn: 'outcomeCount', args: {} } : null;
  },
};

registerTemplate(exactly);
registerTemplate(atLeastOne);
