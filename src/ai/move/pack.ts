/**
 * The question pack of the move mode (plan v2 A5): the second cached system
 * block, this question only (at most 8,000 characters, tested). What a
 * single move needs and the core prompt does not carry: the statement and
 * the question, the plan cards, the private solution graph and its known
 * slips, the route notes (src/ai/packs/notes.ts), this question's components
 * with their props, and prepared small cases S1..S4 whose values the engine
 * computed (make_case), so a move can use one without an extra call.
 * Deterministic: built once per question and content version.
 */
import { CATALOG_META } from '../../components/catalogMeta';
import type { ComponentName } from '../../components/contract';
import { REGISTRY } from '../../components/registry';
import type { Experiment } from '../../engine/calls';
import type { Rich } from '../../content/schema';
import type { QuestionCtx } from '../../hybrid/conductor/conductor';
import type { GraphNode } from '../../method/graph';
import { propsOf } from '../../planner/llm/catalog';
import { plain, type GraphRuntime } from '../checks/lines';
import { richText } from '../packs/build';
import { newSession, type CaseSpec } from '../session/state';
import { COMPUTE } from '../tools/compute';
import { PREPARED_IDS, type CaseFacts } from './tool';

export const PACK_MAX = 8_000;

/** A prepared small case and what it is for (model-facing, English). */
interface PreparedSpec {
  spec: CaseSpec;
  use: string;
}

/**
 * Small cases per question, chosen so their values do not collide with the
 * question's unearned values; their coincidences are listed in the pack and
 * a move is refused on a case where his own slip gives the right number.
 */
const PREPARED: Readonly<
  Record<string, Readonly<Record<string, readonly PreparedSpec[]>>>
> = {
  'bac2022c-sc-ex2': {
    '1': [
      {
        spec: { kind: 'box', n: 4, k: 2 },
        use: 'pairs: with order against together (the link between the two counts). Never to check a division by k (k = 2 hides it).',
      },
      {
        spec: { kind: 'box', n: 4, k: 3 },
        use: 'triples: his rule tested beyond pairs; one group is written in several orders.',
      },
      {
        spec: { kind: 'urn', reds: 2, blacks: 4, k: 3, j: 1 },
        use: 'the favourable count in small: one red with every black pair, listed by hand.',
      },
      {
        spec: { kind: 'box', n: 7, k: 3 },
        use: 'a bigger box when his rule must hold beyond what he can list (the engine counts, he predicts).',
      },
    ],
    '2': [
      {
        spec: { kind: 'urn', reds: 2, blacks: 3, k: 3, j: 0 },
        use: 'what a draw with no red ball is: he lists them by hand.',
      },
      {
        spec: { kind: 'urn', reds: 3, blacks: 4, k: 3, j: 0 },
        use: 'his claim «B is the opposite of A» tested on a new urn: he lists the no-red draws and compares with what the claim predicts.',
      },
      {
        spec: { kind: 'box', n: 5, k: 3 },
        use: 'groups of 3 among 5: each group is written in several orders (after a missing division at the favourable count).',
      },
      {
        spec: { kind: 'box', n: 4, k: 2 },
        use: 'pairs: with order against together.',
      },
    ],
    '3a': [
      {
        spec: { kind: 'box', n: 5, k: 3 },
        use: 'the places of 3 successes among 5 trials, as groups of 3 letters among 5 (his Question 1 rule).',
      },
      {
        spec: { kind: 'box', n: 4, k: 2 },
        use: 'the places of 2 successes among 4 trials (SSFF, SFSF...), listed by hand.',
      },
      {
        spec: { kind: 'box', n: 4, k: 3 },
        use: 'the places of 3 successes among 4 trials.',
      },
    ],
    '3b': [
      {
        spec: { kind: 'urn', reds: 1, blacks: 3, k: 1, j: 1 },
        use: 'one trial with p = 1/4 (success: the red ball): a twin law for the mean and the spread of one trial.',
      },
      {
        spec: { kind: 'urn', reds: 2, blacks: 3, k: 1, j: 1 },
        use: 'one trial with p = 2/5: a second twin, where p q and p p differ.',
      },
    ],
  },
};

/** What each urn-template node counts (model-facing; as in src/ai/packs/build.ts). */
const NODE_MEANING: Readonly<Record<string, string>> = {
  ord: 'ordered draws of the k balls',
  orderings: 'orderings of k balls (k!)',
  total: 'all draws of k balls together',
  fav_red: 'ways to choose the red part',
  fav_black: 'ways to choose the black part',
  none: 'draws with no red ball',
  fav: 'favourable draws (the parts multiplied)',
  result: 'the probability asked',
  seq: 'probability of one sequence of successes and failures',
  count: 'number of sequences with exactly k successes',
  mean1: 'mean of one trial',
  meann: 'mean of n trials',
  var1: 'variance of one trial',
  varn: 'variance of n trials',
};

/**
 * Route lines the engine plays without the AI (opening, plan, read tap,
 * paper, recipe). The similar questions' line goes in the situation, only on
 * a similar question (src/ai/move/situation.ts).
 */
const ROUTE_SKIPPED = /^(Opening|Plan|Read|Paper|Recipe|Similar)\b/;

export interface PreparedCase {
  id: string;
  spec: CaseSpec;
  use: string;
  facts: CaseFacts;
}

export interface MovePack {
  text: string;
  prepared: PreparedCase[];
  experiment: Experiment | null;
}

/** The engine's values of a case (make_case on a scratch session). */
export function caseFacts(spec: CaseSpec, known: readonly string[]): CaseFacts {
  const rt = newSession('scratch', 'scratch', null, known);
  const r = COMPUTE.make_case!({ rt, experiment: null }, {
    case: spec,
    purpose: 'smaller',
  } as never);
  if (!r.ok) {
    throw new Error(`prepared case ${JSON.stringify(spec)}: ${r.error}`);
  }
  const res = r.result as {
    private_values: Record<string, string>;
    coincidences: string[];
    reused_numbers: string[];
  };
  return {
    values: res.private_values,
    coincidences: res.coincidences,
    reused: res.reused_numbers,
  };
}

export function experimentOf(ctx: QuestionCtx): Experiment | null {
  const ex = ctx.loaded.exercise;
  return 'experiment' in ex && ex.experiment
    ? (ex.experiment as Experiment)
    : null;
}

const caseLabel = (spec: CaseSpec): string =>
  spec.kind === 'box'
    ? `box of ${spec.n} letters ${'abcdefgh'
        .slice(0, spec.n)
        .split('')
        .join(' ')}, ${spec.k} drawn together`
    : `urn of ${spec.reds} red and ${spec.blacks} black, ${spec.k} drawn${
        spec.k > 1 ? ' together' : ''
      }, exactly ${spec.j} red wanted`;

function nodeLine(n: GraphNode): string {
  const meaning = NODE_MEANING[n.id] ?? `${n.role} (${n.unit})`;
  return `- ${n.id} = ${plain(n.value)}: ${meaning}; card ${n.planCard}${
    n.main ? '' : ' (supporting)'
  }; forms ${n.forms.slice(0, 2).join(' | ')}`;
}

/** The known slips, one example per slip id and node. */
function slipLines(rt: GraphRuntime): string[] {
  const byNode = new Map<string, Map<string, string>>();
  for (const c of rt.table.kept) {
    const list = byNode.get(c.nodeId) ?? new Map<string, string>();
    if (!list.has(c.id)) {
      list.set(c.id, `${c.id} ${c.exprs[0] ?? '?'} = ${plain(c.value)}`);
    }
    byNode.set(c.nodeId, list);
  }
  const lines = [...byNode].map(
    ([node, list]) => `- at ${node}: ${[...list.values()].join('; ')}`,
  );
  const hidden = rt.table.dropped
    .filter(d => d.why === 'equals_right_value')
    .map(d => `${d.id} at ${d.nodeId}`);
  if (hidden.length > 0) {
    lines.push(
      `- hidden here (they give the right number): ${[...new Set(hidden)].join(
        ', ',
      )}`,
    );
  }
  return lines;
}

/**
 * A component with its props and rules. What it reveals is left out (size):
 * the "when" says the moment, and a component that would show an unearned
 * value is refused with the reason (verifyAsk).
 */
function componentLines(name: string, when: string): string[] {
  const id = name as ComponentName;
  if (!REGISTRY[id]) {
    return [`- ${name}: ${when}`];
  }
  const note = CATALOG_META[id]?.propsNote;
  return [
    `- ${name}: ${when}`,
    `  props: ${propsOf(id)}`,
    ...(note ? [`  rules: ${note}`] : []),
  ];
}

function build(ctx: QuestionCtx): MovePack {
  const q = ctx.pack;
  const ex = ctx.loaded.exercise;
  const experiment = experimentOf(ctx);
  const out: string[] = [
    `# Question pack: exercise ${ex.id}, question ${q.label} (id "${q.questionId}")`,
    `Statement (exam French): ${richText(ex.statement as Rich)}`,
  ];
  if (experiment) {
    const reds = experiment.urn.filter(b => b.color === 'red').length;
    out.push(
      `Urn: ${reds} red, ${experiment.urn.length - reds} black, ${
        experiment.k
      } drawn, draw ${experiment.draw}.`,
    );
  }
  out.push(`Question (exam French): ${q.wording}`);
  const target = [...ctx.frames.values()].find(f => f.target)?.target;
  if (target) {
    out.push(`Result the exam gives: ${richText(target as Rich)}`);
  }
  if (q.plan.length > 0) {
    out.push(
      'Plan cards (he ordered them; a card comes after the cards it needs):',
      ...q.plan.map(c => `- ${c.id} «${c.text}» needs [${c.needs.join(', ')}]`),
    );
  }
  if (q.read.length > 0) {
    out.push(
      `The word he taps in the statement: ${q.read
        .map(t => `«${t.token}» -> ${JSON.stringify(t.effect)}`)
        .join('; ')}`,
    );
  }
  if (q.main) {
    out.push(
      'Private solution graph "main" (a value he has not earned is refused in your messages):',
      ...q.main.graph.nodes.map(nodeLine),
      'Known slips (id, an example line = its engine value):',
      ...slipLines(q.main),
    );
  }
  const notes = q.notes;
  if (notes) {
    out.push(
      'Route notes (how this question usually goes):',
      ...notes.route.filter(r => !ROUTE_SKIPPED.test(r)).map(r => `- ${r}`),
      notes.notationAfter
        ? `Exam notation (C(n,k)) only after he computed node "${notes.notationAfter}" himself.`
        : 'No exam notation gate.',
      `Older skills to probe if he stalls: ${notes.prerequisites.join(', ')}.`,
      'Components that fit this question (after his own try or «ما نعرفش», never before; one that would show a value he has not earned is refused):',
      ...notes.components.flatMap(c => componentLines(c.name, c.when)),
    );
  }
  const known = [...q.given];
  // A prepared value equal to one of this question's values is not printed.
  const own = new Set(
    (q.main?.graph.nodes ?? [])
      .filter(n => !(n.value[1] === 1 && Math.abs(n.value[0]) <= 10))
      .map(n => plain(n.value))
      .filter(v => !known.includes(v)),
  );
  const prepared: PreparedCase[] = (PREPARED[ex.id]?.[q.questionId] ?? [])
    .slice(0, PREPARED_IDS.length)
    .map((p, i) => ({
      id: PREPARED_IDS[i]!,
      spec: p.spec,
      use: p.use,
      facts: caseFacts(p.spec, known),
    }));
  if (prepared.length > 0) {
    out.push(
      'Prepared small cases (case {kind "prepared", id}; engine values, his to find, never to tell first):',
      ...prepared.map(
        c =>
          `- ${c.id}: ${caseLabel(c.spec)}. Values: ${Object.entries(
            c.facts.values,
          )
            .map(([k, v]) =>
              own.has(v)
                ? `${k} (a value of this question: never show)`
                : `${k} ${v}`,
            )
            .join(', ')}. For: ${c.use}${
            c.facts.coincidences.length > 0
              ? ` Coincidences: ${[...new Set(c.facts.coincidences)].join(
                  ', ',
                )}.`
              : ''
          }`,
      ),
    );
  }
  return { text: out.join('\n'), prepared, experiment };
}

const cache = new Map<string, MovePack>();

/** The pack of a question, built once per content version (it is a cached prefix). */
export function movePack(ctx: QuestionCtx): MovePack {
  const key = `${ctx.exerciseId}@${ctx.loaded.exercise.contentVersion}/${ctx.questionId}`;
  let p = cache.get(key);
  if (!p) {
    p = build(ctx);
    cache.set(key, p);
  }
  return p;
}
