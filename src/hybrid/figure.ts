/**
 * The figure an exam prints beside its statement (a probability tree), as
 * the lesson board draws it. Pure, zero AI, opt-in by data: an exercise
 * without a `figure` gets null everywhere.
 * - printed: exactly as authored (an empty branch stays empty), for
 *   «التمرين» and the trip;
 * - live: on the step card and in «اللي لقيناه», a branch that names a
 *   method-graph node shows his value once he has it (credited in this
 *   question, or carried from an earlier one) and a "?" until then; the step
 *   card's copy is compact and marks what the step he is on is about;
 * - a small tree example (a case counted whole): the same picture with
 *   counts of people instead of probabilities.
 * Nothing here shows a value he has not earned: a "?" carries no value at
 * all. Each live figure has a signature that changes exactly when the
 * picture does (the conductor state is a new object after every act, so the
 * view is memoised on the signature, not on identity).
 */
import type { z } from 'zod';

import type { PreparedEntry } from '../ai/move/prepared';
import { treeCaseCounts, type CaseSpec } from '../ai/session/state';
import type { ComponentSpec, JsonObject } from '../components/contract';
import type { ProbabilityTreePropsSchema } from '../components/probability2/schemas';
import type { LoadedExercise } from '../content/loader';
import type { Figure, MethodFrameStep } from '../content/schema';
import { parseRat, ratToString } from '../engine/rationalFormat';
import type { QuestionCtx } from './conductor/conductor';
import type { ConductorState } from './conductor/types';
import { isTouring, planStep } from './tour/tour';

/** The tree's props as content writes them (defaults not applied yet). */
export type TreeProps = z.input<typeof ProbabilityTreePropsSchema>;
type Branch = TreeProps['branches'][number];
type Leaf = NonNullable<Branch['children']>[number];
export type TreeCase = Extract<CaseSpec, { kind: 'tree' }>;

const TREE = 'ProbabilityTree';

/** A figure to draw, and the string the view is memoised on. */
export interface LiveFigure {
  spec: ComponentSpec;
  signature: string;
}

/** The authored props when the figure is a tree (the only figure the lesson can fill). */
function treeOf(spec: ComponentSpec): TreeProps | null {
  const p = spec.props as unknown as Partial<TreeProps>;
  return spec.component === TREE && Array.isArray(p.branches)
    ? (p as TreeProps)
    : null;
}

const specOf = (spec: ComponentSpec, props: TreeProps): ComponentSpec => ({
  ...spec,
  props: props as unknown as JsonObject,
});

const edgesOf = (branches: readonly Branch[]): Leaf[] =>
  branches.flatMap(b => [b, ...(b.children ?? [])]);

/** The exercise figure exactly as authored (blank branches stay blank), or null. */
export function printedFigure(ctx: {
  loaded: LoadedExercise;
}): ComponentSpec | null {
  return ctx.loaded.exercise.figure?.spec ?? null;
}

/**
 * His value of a node, as a rational string, or null: credited on this
 * question's graph (the engine's value of the node), else carried from an
 * earlier question (the value its record kept).
 */
function valueFinder(
  ctx: QuestionCtx,
  s: ConductorState,
): (node: string) => string | null {
  const credited = new Set(s.session.credited.main ?? []);
  const nodes = ctx.pack.main?.graph.nodes ?? [];
  const carried = Object.entries(s.carried ?? {});
  return node => {
    const own = credited.has(node) ? nodes.find(n => n.id === node) : undefined;
    if (own) {
      return ratToString(own.value);
    }
    for (const [key, c] of carried) {
      const v = key.endsWith(`/${node}`) ? parseRat(c.value) : null;
      if (v) {
        return ratToString(v);
      }
    }
    return null;
  };
}

/** The plan-card key of the frame he is on (a pick or a script frame: its card's). */
function cardKeyOf(ctx: QuestionCtx, step: MethodFrameStep): string | null {
  const f = step.frame;
  if (f.type === 'lines') {
    return f.key;
  }
  if (f.type !== 'cards' && f.type !== 'repair') {
    return null;
  }
  const plan = planStep(ctx)?.frame;
  return plan?.type === 'plan'
    ? plan.cards.find(c => c.id === step.group)?.key ?? null
    : null;
}

/** The figure with his values filled in; a tree only (another figure is drawn as authored). */
function fill(
  figure: Figure,
  found: (node: string) => string | null,
  o: { kind: 'step' | 'found'; cardKey: string | null },
): LiveFigure {
  const tree = treeOf(figure.spec);
  if (!tree) {
    return { spec: figure.spec, signature: `${o.kind}|as-authored` };
  }
  const edge = (e: Leaf): Leaf => {
    if (e.node === undefined) {
      return e;
    }
    const value = found(e.node);
    if (value !== null) {
      return { ...e, p: value, show: 'found' };
    }
    // A "?" holds no value at all, even one the content wrote on the branch.
    const hidden: Leaf = { ...e, show: 'hidden' };
    delete hidden.p;
    return hidden;
  };
  const branches: Branch[] = tree.branches.map(b =>
    b.children ? { ...edge(b), children: b.children.map(edge) } : edge(b),
  );
  const edges = edgesOf(branches);
  const ids = new Set(edges.map(e => e.id));
  const step = o.kind === 'step';
  // A mark the content mistyped is dropped: the picture never falls back for it.
  const mark =
    step && o.cardKey !== null
      ? (figure.marks[o.cardKey] ?? []).filter(id => ids.has(id))
      : [];
  const ask = step
    ? edges.find(e => e.node === o.cardKey && e.show === 'hidden')?.id
    : undefined;
  const props: TreeProps = {
    ...tree,
    branches,
    mark,
    compact: step,
  };
  if (ask !== undefined) {
    props.ask = ask;
  } else {
    delete props.ask;
  }
  return {
    spec: specOf(figure.spec, props),
    signature: [
      o.kind,
      mark.join(','),
      ask ?? '',
      ...edges.map(e => `${e.id}:${e.show ?? 'given'}:${e.p ?? ''}`),
    ].join('|'),
  };
}

/**
 * The compact figure of the step card: null without a figure, while the
 * trip is shown and once the question is done. A similar question shows its
 * own figure as authored (another tree, nothing filled: it is without help).
 */
export function stepFigure(
  ctx: QuestionCtx,
  s: ConductorState,
): LiveFigure | null {
  if (s.done || isTouring(ctx, s)) {
    return null;
  }
  const step = ctx.frames.get(s.route[s.at] ?? '');
  if (!step) {
    return null;
  }
  if (step.frame.type === 'similar') {
    const own = step.frame.slot.figure?.spec;
    if (!own) {
      return null;
    }
    const tree = treeOf(own);
    return {
      spec: tree ? specOf(own, { ...tree, compact: true }) : own,
      signature: `similar|${step.frame.slot.id}`,
    };
  }
  const figure = ctx.loaded.exercise.figure;
  return figure
    ? fill(figure, valueFinder(ctx, s), {
        kind: 'step',
        cardKey: cardKeyOf(ctx, step),
      })
    : null;
}

/** The figure with everything he found so far, full size, nothing marked («اللي لقيناه»). */
export function foundFigure(
  ctx: QuestionCtx,
  s: ConductorState,
): LiveFigure | null {
  const figure = ctx.loaded.exercise.figure;
  return figure
    ? fill(figure, valueFinder(ctx, s), { kind: 'found', cardKey: null })
    : null;
}

// ---------------------------------------------------------------------------
// A small tree example, counted whole.

const NOT_A = '\\overline{A}';
const NOT_F = '\\overline{F}';

/** The branches a quantity is about: a path, one branch, or the two ends of an event. */
const ABOUT: Readonly<Record<string, readonly string[]>> = {
  a: ['a'],
  not_a: ['na'],
  f_given_a: ['a.f'],
  nf_given_a: ['a.nf'],
  f_given_na: ['na.f'],
  nf_given_na: ['na.nf'],
  a_and_f: ['a', 'a.f'],
  a_and_nf: ['a', 'a.nf'],
  na_and_f: ['na', 'na.f'],
  na_and_nf: ['na', 'na.nf'],
  f: ['a.f', 'na.f'],
  not_f: ['a.nf', 'na.nf'],
  a_given_f: ['a', 'a.f'],
  na_given_f: ['na', 'na.f'],
  a_given_nf: ['a', 'a.nf'],
  na_given_nf: ['na', 'na.nf'],
};

/** The one shape whose asked end is not printed: he finds it as what is left of everyone in F. */
const foundByDifference = (spec: TreeCase): boolean =>
  spec.template === 'tree_other_path' && spec.node === 'na_and_f';

/** What a small tree case is, as one string (its views are memoised on it). */
export const treeCaseSignature = (spec: TreeCase): string =>
  `case|${spec.template}|${spec.node}|${spec.n}|${spec.a}|${spec.af}|${spec.naf}`;

export interface TreeCaseView {
  /** The ProbabilityTree props, counts mode. */
  props: TreeProps;
  /** The same as a spec the component host draws. */
  spec: ComponentSpec;
  /** Everyone in F, shown on its own line when the asked end is hidden; else null. */
  total: number | null;
  /** Every count the card shows (they become known numbers of the session). */
  visible: number[];
  /** What the view of this case is memoised on. */
  signature: string;
}

/** A small tree case as its card draws it; null for a case that is not a tree. */
export function treeCaseView(
  from: CaseSpec | Pick<PreparedEntry, 'spec'>,
): TreeCaseView | null {
  const spec = 'spec' in from ? from.spec : from;
  if (spec.kind !== 'tree') {
    return null;
  }
  const c = treeCaseCounts(spec);
  const rest = foundByDifference(spec);
  const props: TreeProps = {
    rootCount: c.n,
    mark: [...(ABOUT[spec.node] ?? [])],
    branches: [
      {
        id: 'a',
        latex: 'A',
        count: c.a,
        children: [
          { id: 'a.f', latex: 'F', count: c.af },
          { id: 'a.nf', latex: NOT_F, count: c.anf },
        ],
      },
      {
        id: 'na',
        latex: NOT_A,
        count: c.na,
        children: [
          {
            id: 'na.f',
            latex: 'F',
            count: c.naf,
            ...(rest && { countShow: 'hidden' as const }),
          },
          { id: 'na.nf', latex: NOT_F, count: c.nanf },
        ],
      },
    ],
    // The hidden end is the one "?" he is asked for.
    ...(rest && { ask: 'na.f' }),
  };
  return {
    props,
    spec: { component: TREE, props: props as unknown as JsonObject },
    total: rest ? c.f : null,
    visible: [c.n, c.a, c.na, c.af, c.anf, ...(rest ? [c.f] : [c.naf]), c.nanf],
    signature: treeCaseSignature(spec),
  };
}
