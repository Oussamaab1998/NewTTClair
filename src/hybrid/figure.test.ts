/**
 * The exercise figure as the board draws it (figure.ts): printed, live on
 * the step card (filled, marked, the one "?" asked for), in «اللي لقيناه»,
 * and a small tree example counted whole. Every props object it builds is
 * one the registry accepts.
 */
import { mutationsFor } from '../method/mutations';
import { buildGraphFor } from '../method/templates';
import '../method/library';
import { CATALOG } from '../app/exercises';
import type { CaseSpec } from '../ai/session/state';
import { resolveSpec } from '../components/registry';
import type { MethodFrameStep } from '../content/schema';
import {
  act,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from './conductor/conductor';
import {
  TO_FIRST_LINES,
  TREE_MINI_FRAMES,
  treeMini,
} from './conductor/treeFixture';
import type { ConductorState } from './conductor/types';
import {
  foundFigure,
  printedFigure,
  stepFigure,
  treeCaseView,
  type TreeProps,
} from './figure';

const { ctx, loaded } = treeMini();

/** The fixture's state on a frame of its route (nothing credited). */
function on(frameId: string, from: ConductorState = startQuestion(ctx)) {
  const s = JSON.parse(JSON.stringify(from)) as ConductorState;
  s.at = s.route.indexOf(frameId);
  return s;
}

const propsOf = (f: { spec: { props: unknown } } | null) =>
  f!.spec.props as TreeProps;
const edge = (p: TreeProps, id: string) =>
  p.branches.flatMap(b => [b, ...(b.children ?? [])]).find(e => e.id === id)!;

/** The second question's graph (its nodes are branches of the figure), on the fixture's exercise. */
function conditionalCtx(card: 'not_a' | 'f_given_na'): QuestionCtx {
  const graph = buildGraphFor(
    {
      template: 'tree_conditional',
      args: { pA: [3, 5], pFgA: [1, 2], pF: [7, 10] },
    },
    { inputs: {} },
  );
  const frame = {
    id: 'q.c',
    group: 'c',
    frame: { type: 'lines', cardId: 'c', key: card },
  } as unknown as MethodFrameStep;
  return {
    ...ctx,
    frames: new Map([['q.c', frame]]),
    pack: {
      ...ctx.pack,
      main: { id: 'main', graph, table: mutationsFor(graph), extra: [] },
    },
  };
}
const conditionalState = (credited: string[]): ConductorState => {
  const s = startQuestion(ctx);
  return {
    ...s,
    route: ['q.c'],
    at: 0,
    session: { ...s.session, credited: { main: credited } },
  };
};

describe('printedFigure', () => {
  it('is the figure exactly as authored: an empty branch stays empty', () => {
    const spec = printedFigure(ctx);
    expect(spec).toBe(loaded.exercise.figure!.spec);
    expect(edge(propsOf({ spec: spec! }), 'na').show).toBe('blank');
    expect(resolveSpec(spec!, undefined).ok).toBe(true);
  });

  it('an exercise without a figure has none, anywhere', () => {
    const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
    const urn = entry.result.ok ? entry.result.loaded : null;
    const urnCtx = questionCtx(urn!, entry.raw as never, '1');
    const s = act(urnCtx, startQuestion(urnCtx), { kind: 'continue' }).state;
    expect(printedFigure(urnCtx)).toBeNull();
    expect(stepFigure(urnCtx, s)).toBeNull();
    expect(foundFigure(urnCtx, s)).toBeNull();
  });
});

describe('stepFigure', () => {
  it('is compact, marks what the step is about, and hides what he must find', () => {
    const f = stepFigure(ctx, on(TREE_MINI_FRAMES.path));
    const p = propsOf(f);
    expect(p.compact).toBe(true);
    expect(p.mark).toEqual(['a', 'a.f']);
    // No branch carries this step's own quantity (a path): nothing is asked on the picture.
    expect(p.ask).toBeUndefined();
    // What the statement prints stays as printed.
    expect(edge(p, 'a')).toMatchObject({ show: 'given', p: '3/5' });
    expect(edge(p, 'a.f')).toMatchObject({ show: 'given', p: '1/2' });
    // A branch he must find is a "?" with no value in it.
    for (const id of ['a.nf', 'na', 'na.f', 'na.nf']) {
      expect(edge(p, id).show).toBe('hidden');
      expect(edge(p, id).p).toBeUndefined();
    }
    expect(resolveSpec(f!.spec, undefined).ok).toBe(true);
  });

  it('a pick marks the card it belongs to; the plan marks nothing', () => {
    expect(propsOf(stepFigure(ctx, on(TREE_MINI_FRAMES.split))).mark).toEqual([
      'a.f',
      'na.f',
    ]);
    expect(propsOf(stepFigure(ctx, on(TREE_MINI_FRAMES.plan))).mark).toEqual(
      [],
    );
  });

  it('shows nothing while the trip is on and once the question is done', () => {
    const touring = { ...ctx, tour: {} as NonNullable<QuestionCtx['tour']> };
    expect(
      stepFigure(touring, {
        ...on(TREE_MINI_FRAMES.path),
        tour: { kind: 'trip', at: 0 },
      }),
    ).toBeNull();
    expect(
      stepFigure(ctx, { ...on(TREE_MINI_FRAMES.path), done: true }),
    ).toBeNull();
  });

  it('fills a branch with the engine value of a node he was credited', () => {
    const c = conditionalCtx('f_given_na');
    const before = propsOf(stepFigure(c, conditionalState([])));
    expect(edge(before, 'na').show).toBe('hidden');
    const p = propsOf(stepFigure(c, conditionalState(['not_a'])));
    expect(edge(p, 'na')).toMatchObject({ show: 'found', p: '2/5' });
    // The branch of the step he is on is the one "?" asked for.
    expect(p.ask).toBe('na.f');
    expect(edge(p, 'na.f').show).toBe('hidden');
    expect(
      resolveSpec(stepFigure(c, conditionalState(['not_a']))!.spec).ok,
    ).toBe(true);
    // Once he has it, nothing is asked on the picture any more.
    const done = propsOf(
      stepFigure(c, conditionalState(['not_a', 'f_given_na'])),
    );
    expect(done.ask).toBeUndefined();
    expect(edge(done, 'na.f')).toMatchObject({ show: 'found', p: '1' });
  });

  it('fills a branch with a value carried from an earlier question', () => {
    const s = {
      ...on(TREE_MINI_FRAMES.path),
      carried: { 't0/nf_given_a': { line: '1-1/2=1/2', value: '1/2' } },
    };
    const p = propsOf(stepFigure(ctx, s));
    expect(edge(p, 'a.nf')).toMatchObject({ show: 'found', p: '1/2' });
    expect(edge(p, 'na').show).toBe('hidden');
  });

  it('has a signature that changes exactly when the picture does', () => {
    const s = on(TREE_MINI_FRAMES.path);
    const copy = JSON.parse(JSON.stringify(s)) as ConductorState;
    const sig = stepFigure(ctx, s)!.signature;
    // The conductor copies the state on every act: the same picture, the same signature.
    expect(stepFigure(ctx, copy)!.signature).toBe(sig);
    expect(
      stepFigure(ctx, { ...s, progress: { ...s.progress, attempts: 3 } })!
        .signature,
    ).toBe(sig);
    // Another step, or a value found: another picture.
    expect(stepFigure(ctx, on(TREE_MINI_FRAMES.rest))!.signature).not.toBe(sig);
    expect(
      stepFigure(ctx, {
        ...s,
        carried: { 't0/not_a': { line: '1-3/5=2/5', value: '2/5' } },
      })!.signature,
    ).not.toBe(sig);
  });

  it('drops a mark that names no branch (the picture never falls back for it)', () => {
    const figure = loaded.exercise.figure!;
    const typo: QuestionCtx = {
      ...ctx,
      loaded: {
        ...loaded,
        exercise: {
          ...loaded.exercise,
          figure: { ...figure, marks: { a_and_f: ['a', 'nope'] } },
        },
      },
    };
    const f = stepFigure(typo, on(TREE_MINI_FRAMES.path));
    expect(propsOf(f).mark).toEqual(['a']);
    expect(resolveSpec(f!.spec, undefined).ok).toBe(true);
  });

  it('a similar question shows its own figure as authored, compact, nothing filled', () => {
    const own = {
      component: 'ProbabilityTree' as const,
      props: {
        branches: [
          { id: 'a', latex: 'A', p: '1/4' },
          { id: 'na', latex: '\\overline{A}', show: 'blank', node: 'not_a' },
        ],
      },
    };
    const frame = (figure: boolean) =>
      ({
        id: 'q.sim',
        frame: {
          type: 'similar',
          slot: {
            id: 'same',
            ...(figure && { figure: { spec: own, marks: {} } }),
          },
        },
      } as unknown as MethodFrameStep);
    const s: ConductorState = {
      ...startQuestion(ctx),
      route: ['q.sim'],
      at: 0,
      // What he found in the question is not shown on another tree.
      carried: { 't0/not_a': { line: '1-3/5=2/5', value: '2/5' } },
    };
    const withFigure = { ...ctx, frames: new Map([['q.sim', frame(true)]]) };
    const f = stepFigure(withFigure, s);
    const p = propsOf(f);
    expect(p.compact).toBe(true);
    expect(edge(p, 'na').show).toBe('blank');
    expect(edge(p, 'na').p).toBeUndefined();
    expect(f!.signature).toBe('similar|same');
    expect(resolveSpec(f!.spec, undefined).ok).toBe(true);
    // No figure of its own: none (the exercise's tree is another question's).
    expect(
      stepFigure({ ...ctx, frames: new Map([['q.sim', frame(false)]]) }, s),
    ).toBeNull();
  });
});

describe('foundFigure', () => {
  it('is the same filling, full size, with nothing marked or asked', () => {
    const c = conditionalCtx('f_given_na');
    const f = foundFigure(c, {
      ...conditionalState(['not_a']),
      // Still there once the question is done.
      done: true,
    });
    const p = propsOf(f);
    expect(p.compact).toBe(false);
    expect(p.mark).toEqual([]);
    expect(p.ask).toBeUndefined();
    expect(edge(p, 'na')).toMatchObject({ show: 'found', p: '2/5' });
    expect(edge(p, 'na.f').show).toBe('hidden');
    expect(f!.signature).not.toBe(
      stepFigure(c, conditionalState(['not_a']))!.signature,
    );
    expect(resolveSpec(f!.spec, undefined).ok).toBe(true);
  });
});

describe('treeCaseView', () => {
  const spec = (node: string, template = 'tree_other_path'): CaseSpec => ({
    kind: 'tree',
    template,
    node,
    n: 20,
    a: 8,
    af: 2,
    naf: 3,
  });

  it('draws the case in counts: people at the root and at the end of every branch', () => {
    const v = treeCaseView(spec('a_and_f'))!;
    expect(v.props.rootCount).toBe(20);
    expect(v.props.mark).toEqual(['a', 'a.f']);
    expect(v.props.ask).toBeUndefined();
    expect(v.props.branches).toEqual([
      {
        id: 'a',
        latex: 'A',
        count: 8,
        children: [
          { id: 'a.f', latex: 'F', count: 2 },
          { id: 'a.nf', latex: '\\overline{F}', count: 6 },
        ],
      },
      {
        id: 'na',
        latex: '\\overline{A}',
        count: 12,
        children: [
          { id: 'na.f', latex: 'F', count: 3 },
          { id: 'na.nf', latex: '\\overline{F}', count: 9 },
        ],
      },
    ]);
    expect(v.total).toBeNull();
    expect(v.visible).toEqual([20, 8, 12, 2, 6, 3, 9]);
    expect(resolveSpec(v.spec, undefined).ok).toBe(true);
  });

  it('hides the asked end when it is found as what is left, and gives everyone in F apart', () => {
    const v = treeCaseView(spec('na_and_f'))!;
    expect(edge(v.props, 'na.f')).toMatchObject({
      count: 3,
      countShow: 'hidden',
    });
    expect(v.props.mark).toEqual(['na', 'na.f']);
    expect(v.props.ask).toBe('na.f');
    expect(v.total).toBe(5);
    // The hidden count is not one of the numbers on screen; the total is.
    expect(v.visible).toEqual([20, 8, 12, 2, 6, 5, 9]);
    expect(resolveSpec(v.spec, undefined).ok).toBe(true);
    // The same node on another template is read on the tree: nothing hidden.
    expect(
      treeCaseView(spec('na_and_f', 'tree_conditional'))!.total,
    ).toBeNull();
  });

  it('marks the branch or the path each quantity is about', () => {
    const mark = (node: string) => treeCaseView(spec(node))!.props.mark;
    expect(mark('not_a')).toEqual(['na']);
    expect(mark('f_given_na')).toEqual(['na.f']);
    expect(mark('nf_given_a')).toEqual(['a.nf']);
    expect(mark('not_f')).toEqual(['a.nf', 'na.nf']);
    expect(mark('na_given_nf')).toEqual(['na', 'na.nf']);
    expect(mark('unknown_node')).toEqual([]);
  });

  it('takes a prepared entry as well, and is null for a case that is not a tree', () => {
    const s = spec('a_and_f');
    expect(treeCaseView({ spec: s })).toEqual(treeCaseView(s));
    expect(treeCaseView(s)!.signature).not.toBe(
      treeCaseView(spec('na_and_f'))!.signature,
    );
    expect(treeCaseView({ kind: 'box', n: 4, k: 2 })).toBeNull();
  });
});

it('the fixture reaches its first lines frame by the plan and the word', () => {
  let s = startQuestion(ctx);
  for (const a of TO_FIRST_LINES) {
    s = act(ctx, s, a).state;
  }
  expect(s.route[s.at]).toBe(TREE_MINI_FRAMES.path);
});
