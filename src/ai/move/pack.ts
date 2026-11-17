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
import type { TreeQuantity } from '../../engine/tree';
import type { QuestionCtx } from '../../hybrid/conductor/conductor';
import type { Graph, GraphNode } from '../../method/graph';
import { treeLabel } from '../../method/templatesTree';
import { propsOf } from '../../planner/llm/catalog';
import { plain, type GraphRuntime } from '../checks/lines';
import { richText, type QuestionDomain } from '../packs/build';
import type { QuestionNotes } from '../packs/notes';
import { newSession, type CaseSpec } from '../session/state';
import { COMPUTE } from '../tools/compute';
import { preparedFor } from './prepared';
import { PREPARED_IDS, type CaseFacts } from './tool';

export const PACK_MAX = 8_000;

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
  // The two-event tree (src/method/templatesTree.ts).
  a_and_f: 'the path through A to F: p(A ∩ F), its two branches multiplied',
  na_and_f: 'the path through not A to F: p(Ā ∩ F)',
  not_a: 'the first-level branch to not A: p(Ā)',
  f_given_na: 'the branch to F after not A: p(F/Ā), F knowing not A',
  nf_given_a: 'the branch to not F after A (not F knowing A)',
  nf_given_na: 'the branch to not F after not A (not F knowing not A)',
  not_f: 'all of not F, by both paths',
  a_and_nf: 'the path through A to not F',
  na_and_nf: 'the path through not A to not F',
  na_given_nf:
    'not A knowing not F: the tree read backwards (a path over a total)',
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
  /** The question's domain (null: an urn question): it picks the prompt and the tools. */
  domain: QuestionDomain | null;
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

/** A small case in words (model-facing). */
export const caseLabel = (spec: CaseSpec): string =>
  spec.kind === 'box'
    ? `box of ${spec.n} letters ${'abcdefgh'
        .slice(0, spec.n)
        .split('')
        .join(' ')}, ${spec.k} drawn together`
    : spec.kind === 'tree'
    ? `tree of whole counts: ${spec.n} people, ${spec.a} in A (${
        spec.af
      } of them in F), ${spec.n - spec.a} not in A (${
        spec.naf
      } of them in F); it rehearses the step ${spec.node}`
    : `urn of ${spec.reds} red and ${spec.blacks} black, ${spec.k} drawn${
        spec.k > 1 ? ' together' : ''
      }, exactly ${spec.j} red wanted`;

function nodeLine(n: GraphNode): string {
  const meaning = NODE_MEANING[n.id] ?? `${n.role} (${n.unit})`;
  return `- ${n.id} = ${plain(n.value)}: ${meaning}; card ${n.planCard}${
    n.main ? '' : ' (supporting)'
  }; forms ${n.forms.slice(0, 2).join(' | ')}`;
}

/**
 * The known slips, one example per slip id and node. A tree question lists
 * the roads that give the right number as its traps (treeBlock), not here.
 */
function slipLines(rt: GraphRuntime, tree = false): string[] {
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
  const hidden = tree
    ? []
    : rt.table.dropped
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

// ---------------------------------------------------------------------------
// A tree question (two events: A or not A, then F or not F).

/** Ways a trap is written that the pack prints for one slip and node. */
const TRAP_EXAMPLES = 3;

/** The statement's branches are on the "not A" side (the labels of A and not A exchanged). */
const swapped = (g: Graph): boolean =>
  g.nodes.some(n => {
    const id = n.id as TreeQuantity;
    return (
      n.label !== undefined &&
      n.label === treeLabel(id, true) &&
      n.label !== treeLabel(id, false)
    );
  });

/** A node of a tree graph; with the labels exchanged only the exam's writing says what it is. */
function treeNodeLine(n: GraphNode, swap: boolean): string {
  const meaning = swap ? undefined : NODE_MEANING[n.id];
  return `- ${n.id} = ${plain(n.value)}: ${[
    ...(meaning ? [meaning] : []),
    ...(n.label ? [`the exam writes ${n.label}`] : []),
    `card ${n.planCard}${
      n.main ? '' : ' (support: named when he writes it, never the answer)'
    }`,
    ...(n.proof ? ['proof'] : []),
    `forms ${n.forms.slice(0, 3).join(' | ')}`,
  ].join('; ')}`;
}

/**
 * The "Tree:" block of a tree question's pack, from its graph: what the
 * statement gives (two of the three fractions are printed only on the
 * figure), how the exam writes a conditional, what a `proof` node asks, and
 * the wrong roads that reach the RIGHT value on these numbers (the traps of
 * the mutation table: the engine reports them as slips, the AI must never
 * accept one).
 */
export function treeBlock(rt: GraphRuntime): string[] {
  const g = rt.graph;
  const swap = swapped(g);
  const [a, fGivenA, f] = (g.givens ?? []).map(plain);
  const out = [
    'Tree: two events, A or not A at the first level, then F or not F. The lesson draws it on his step card (the given values, the values he found, "?" for the rest, the branch of the step marked).',
  ];
  if (a !== undefined && fGivenA !== undefined && f !== undefined) {
    out.push(
      `- Given: ${treeLabel(
        'a',
        swap,
      )} = ${a} (the first branch, drawn on top), ${treeLabel(
        'f_given_a',
        swap,
      )} = ${fGivenA} (the branch to F after it), ${treeLabel(
        'f',
        swap,
      )} = ${f} (the total of F: its two paths together). Two of them are printed only on the figure: they are numbers of the statement all the same.`,
    );
  }
  out.push(
    '- Notation: the exam writes a conditional with a slash: p(F/\\overline{A}) is "F knowing not A", a branch of the second level; p(\\overline{A} \\cap F) is a whole path from the start. Never \\mid.',
  );
  if (g.nodes.some(n => n.proof)) {
    out.push(
      '- "proof" on a node: the value alone is not accepted (the statement prints some results, and several values of this tree are equal by chance); he writes the calculation. A right value written alone comes back as "unexplained".',
    );
  }
  const traps = rt.table.traps ?? [];
  if (traps.length > 0) {
    out.push(
      '- Traps: wrong roads that reach the RIGHT value on these numbers. The engine reports each as a slip; never accept one, and never call its result right:',
      ...traps.map(
        c =>
          `  - ${c.id} at ${c.nodeId}: ${c.exprs
            .slice(0, TRAP_EXAMPLES)
            .join(' | ')}${
            c.exprs.length > TRAP_EXAMPLES
              ? ` (and ${c.exprs.length - TRAP_EXAMPLES} more)`
              : ''
          }`,
      ),
    );
  }
  return out;
}

/** The private graph of a tree question: the tree block, its nodes, its slips. */
function treeGraphLines(rt: GraphRuntime): string[] {
  return [
    ...treeBlock(rt),
    'Private solution graph "main" (a value he has not earned is refused in your messages, and so is its calculation):',
    ...rt.graph.nodes.map(n => treeNodeLine(n, swapped(rt.graph))),
    'Known slips (id, an example line = its engine value):',
    ...slipLines(rt, true),
  ];
}

/** The route notes of a tree question: no component, no C(n,k) gate. */
function treeNotesLines(notes: QuestionNotes): string[] {
  return [
    'Route notes (how this question usually goes):',
    ...notes.route.filter(r => !ROUTE_SKIPPED.test(r)).map(r => `- ${r}`),
    ...(notes.notationAfter
      ? [
          `The name of the rule only after he computed node "${notes.notationAfter}" himself.`,
        ]
      : []),
    `Older skills to probe if he stalls: ${notes.prerequisites.join(', ')}.`,
  ];
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
  const tree = q.domain === 'tree';
  if (q.plan.length > 0) {
    out.push(
      'Plan cards (he ordered them; a card comes after the cards it needs):',
      // On a tree a card's key is the step of the graph it settles.
      ...q.plan.map(
        c =>
          `- ${c.id}${tree ? ` (step ${c.key})` : ''} «${
            c.text
          }» needs [${c.needs.join(', ')}]`,
      ),
    );
  }
  if (q.read.length > 0) {
    out.push(
      `The word he taps in the statement: ${q.read
        .map(t => `«${t.token}» -> ${JSON.stringify(t.effect)}`)
        .join('; ')}`,
    );
  }
  if (q.main && tree) {
    out.push(...treeGraphLines(q.main));
  } else if (q.main) {
    out.push(
      'Private solution graph "main" (a value he has not earned is refused in your messages):',
      ...q.main.graph.nodes.map(nodeLine),
      'Known slips (id, an example line = its engine value):',
      ...slipLines(q.main),
    );
  }
  const notes = q.notes;
  if (notes && tree) {
    out.push(...treeNotesLines(notes));
  } else if (notes) {
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
  const prepared: PreparedCase[] = preparedFor(ex.id, q.questionId)
    .slice(0, PREPARED_IDS.length)
    .map(p => ({
      id: p.id,
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
            .join(', ')}. For: ${c.use}${/[.!?]$/.test(c.use) ? '' : '.'}${
            c.facts.coincidences.length > 0
              ? ` Coincidences: ${[...new Set(c.facts.coincidences)].join(
                  ', ',
                )}.`
              : ''
          }`,
      ),
    );
  }
  return {
    text: out.join('\n'),
    prepared,
    experiment,
    domain: q.domain ?? null,
  };
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
