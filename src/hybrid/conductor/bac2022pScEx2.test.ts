/**
 * The probability-tree exercise (bac2022p-sc-ex2) on the conductor, every
 * question on the instant path (no AI call): the right lines to the end
 * (trip, steps, pick, recipe, the two similar questions), the typical wrong
 * lines, the right value by a wrong road, the value alone, «ما نعرفش» twice
 * then the small example and its bridge back, and results reused from one
 * question to the next. Every expected value comes from the engine.
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { CASE_FILE_ISSUES, preparedFor } from '../../ai/move/prepared';
import { CATALOG } from '../../app/exercises';
import { fractionToPlain } from '../../engine/format';
import { frac, type Fraction } from '../../engine/rational';
import { solveTwoEventTree, type TreeQuantity } from '../../engine/tree';
import { fillSkeleton } from '../../method/findings';
import { exerciseSheet } from '../board';
import { passTour } from '../tour/passTour';
import { TRIP_FILE_ISSUES, roadView, type Carried } from '../tour/tour';
import {
  act,
  applyFallback,
  questionCtx,
  soloPossible,
  startQuestion,
  view,
  type QuestionCtx,
} from './conductor';
import type { ActOut, ConductorState } from './types';

/**
 * The old hints path (a step without a help ladder, src/content/help):
 * these tests switch the ladders off, so «ما نعرفش» gives the hints and the AI as before.
 */
const mockLadders = { off: false };
jest.mock('../../content/help/help', () => {
  const actual = jest.requireActual<typeof import('../../content/help/help')>(
    '../../content/help/help',
  );
  return {
    ...actual,
    ladderFor: (...a: Parameters<typeof actual.ladderFor>) =>
      mockLadders.off ? null : actual.ladderFor(...a),
  };
});
afterEach(() => {
  mockLadders.off = false;
});

const ID = 'bac2022p-sc-ex2';
const entry = CATALOG.find(e => e.id === ID)!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const ctxOf = (q: string): QuestionCtx =>
  questionCtx(loaded!, entry.raw as never, q);

const T = solveTwoEventTree({
  pA: frac(2, 3),
  pFgA: frac(1, 4),
  pF: frac(5, 12),
});
const p = (v: Fraction): string => fractionToPlain(v);
/** A value as an operand of a line. */
const o = (v: Fraction): string => (v[1] === 1 ? p(v) : `(${p(v)})`);

/** The right line of each step, written from the engine's values. */
const RIGHT: Record<string, string> = {
  a_and_f: `${o(T.a)}*${o(T.f_given_a)}=${p(T.a_and_f)}`,
  na_and_f: `${o(T.f)}-${o(T.a_and_f)}=${p(T.na_and_f)}`,
  not_a: `1-${o(T.a)}=${p(T.not_a)}`,
  f_given_na: `${o(T.na_and_f)}/${o(T.not_a)}=${p(T.f_given_na)}`,
  nf_given_a: `1-${o(T.f_given_a)}=${p(T.nf_given_a)}`,
  nf_given_na: `1-${o(T.f_given_na)}=${p(T.nf_given_na)}`,
  not_f: `1-${o(T.f)}=${p(T.not_f)}`,
  na_and_nf: `${o(T.not_a)}*${o(T.nf_given_na)}=${p(T.na_and_nf)}`,
  na_given_nf: `${o(T.na_and_nf)}/${o(T.not_f)}=${p(T.na_given_nf)}`,
};

/** What he carries into a question from the ones before (as the records give it). */
const carriedFrom = (...refs: [string, TreeQuantity][]): Carried =>
  Object.fromEntries(
    refs.map(([q, node]) => [
      `${q}/${node}`,
      { line: RIGHT[node]!, value: p(T[node]) },
    ]),
  );
const CARRIED: Record<string, Carried> = {
  t1: {},
  t2: carriedFrom(['t1', 'a_and_f'], ['t1', 'na_and_f']),
  t3: carriedFrom(['t1', 'na_and_f'], ['t2', 'not_a'], ['t2', 'f_given_na']),
  t4: carriedFrom(
    ['t1', 'na_and_f'],
    ['t2', 'not_a'],
    ['t2', 'f_given_na'],
    ['t3', 'nf_given_a'],
    ['t3', 'nf_given_na'],
  ),
};

const DK: StudentAct = { kind: 'dont_know' };
const line = (raw: string): StudentAct => ({ kind: 'line', raw });

function play(ctx: QuestionCtx, acts: StudentAct[], from: ConductorState) {
  let state = from;
  const outs: ActOut[] = [];
  for (const a of acts) {
    const r = act(ctx, state, a);
    state = applyFallback(r.state, r.out);
    outs.push(r.out);
  }
  return { state, outs, out: outs[outs.length - 1]! };
}

/** The question started: the trip passed («نبداو»). */
function started(q: string, carried: Carried = CARRIED[q]!) {
  const ctx = ctxOf(q);
  const { state } = play(ctx, passTour(ctx), startQuestion(ctx, { carried }));
  return { ctx, state };
}

/** The lines of a similar question: its own graph's right roads, from its forms. */
function similarLines(ctx: QuestionCtx, frameId: string): string[] {
  const answer = ctx.loaded.answers.get(`${ctx.questionId}/${frameId}`) as
    | {
        kind: string;
        graph: { nodes: { forms: string[]; value: Fraction; role: string }[] };
      }
    | undefined;
  return (answer?.graph.nodes ?? [])
    .filter(n => n.role !== 'support')
    .map(n => `${n.forms[0]!}=${p(n.value)}`);
}

/** The act that is right on the frame he is on. */
function rightAct(ctx: QuestionCtx, state: ConductorState): StudentAct[] {
  const frameId = view(ctx, state)!.frameId;
  const f = ctx.frames.get(frameId)!.frame;
  switch (f.type) {
    case 'lines':
      return [line(RIGHT[f.key]!)];
    case 'cards':
      return [
        { kind: 'choice', optionId: f.cards.find(c => c.truth === 'true')!.id },
      ];
    case 'recipe':
      return [{ kind: 'order', ids: [...f.clean] }];
    case 'similar':
      return [...similarLines(ctx, frameId).map(line), { kind: 'continue' }];
    default:
      throw new Error(`no scripted act for a ${f.type} frame`);
  }
}

/** Plays the right acts to the end of the question; returns every output. */
function toTheEnd(q: string) {
  const { ctx, state: from } = started(q);
  let state = from;
  const outs: ActOut[] = [];
  const frames: string[] = [];
  for (let guard = 0; guard < 40 && view(ctx, state); guard++) {
    frames.push(view(ctx, state)!.frameId);
    const r = play(ctx, rightAct(ctx, state), state);
    state = r.state;
    outs.push(...r.outs);
  }
  return { ctx, state, outs, frames };
}

/** On the lines frame of a card key, everything before it done right. */
function onCard(q: string, key: string) {
  const { ctx, state: from } = started(q);
  let state = from;
  for (let guard = 0; guard < 20; guard++) {
    const v = view(ctx, state);
    const f = v ? ctx.frames.get(v.frameId)!.frame : null;
    if (!f || (f.type === 'lines' && f.key === key)) {
      break;
    }
    state = play(ctx, rightAct(ctx, state), state).state;
  }
  const f = ctx.frames.get(view(ctx, state)!.frameId)!.frame;
  expect(f.type === 'lines' && f.key).toBe(key);
  return { ctx, state };
}

const slipOf = (out: ActOut): string[] =>
  out.reply.flatMap(part =>
    part.kind === 'feedback' && part.tone === 'warning' ? ['warned'] : [],
  );

describe(`${ID}: the content is wired`, () => {
  it('loads, with its trips and its small examples', () => {
    expect(entry.result.ok).toBe(true);
    expect(TRIP_FILE_ISSUES).toEqual([]);
    expect(CASE_FILE_ISSUES).toEqual([]);
    for (const q of ['t1', 't2', 't3', 't4']) {
      const ctx = ctxOf(q);
      expect(ctx.tour).not.toBeNull();
      expect(ctx.frames.size).toBeGreaterThan(0);
      expect(ctx.pack.main?.graph.domain).toBe('tree');
      expect(preparedFor(ID, q).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe.each(['t1', 't2', 't3', 't4'])(
  '%s: the right lines, to the end, with no AI call',
  q => {
    const run = toTheEnd(q);

    it('every answer is instant and the question ends', () => {
      expect(run.state.done).toBe(true);
      expect(run.outs.map(x => x.tier)).toEqual(run.outs.map(() => 'instant'));
      expect(run.outs.filter(x => x.reason === 'similar_review')).toHaveLength(
        2,
      );
      expect(run.outs.some(x => x.reason === 'recipe')).toBe(true);
    });

    it('every step of the map is done, with his own line', () => {
      const road = roadView(run.ctx, run.state);
      expect(road.steps.map(x => x.status)).toEqual(
        road.steps.map(() => 'done'),
      );
      expect(road.after.map(x => x.status)).toEqual(['done', 'done']);
    });
  },
);

describe('t1: the other path («Montrer que»)', () => {
  it('walks path, pick, rest', () => {
    expect(toTheEnd('t1').frames.slice(0, 3)).toEqual([
      'mt1.c_path',
      'mt1.c_split',
      'mt1.c_rest',
    ]);
  });

  it('names the branch taken for the path, at once', () => {
    const { ctx, state } = onCard('t1', 'a_and_f');
    const r = play(ctx, [line(p(T.f_given_a))], state);
    expect(r.out).toMatchObject({ tier: 'instant', reason: 'slip_first' });
    expect(slipOf(r.out)).toEqual(['warned']);
    expect(r.state.session.credited.main ?? []).not.toContain('a_and_f');
  });

  it("the statement's number alone is not his result; the calculation is", () => {
    const { ctx, state } = onCard('t1', 'na_and_f');
    const bare = play(ctx, [line(p(T.na_and_f))], state);
    expect(bare.out).toMatchObject({
      tier: 'instant',
      reason: 'line_note',
      advanced: false,
    });
    expect(bare.state.progress.attempts).toBe(0);
    expect(bare.state.session.credited.main).not.toContain('na_and_f');
    // Not simplified yet, then simplified: the step closes with the whole line.
    const unreduced = sub12(T.f, T.a_and_f);
    const first = play(
      ctx,
      [line(`${o(T.f)}-${o(T.a_and_f)}=${unreduced}`)],
      state,
    );
    expect(first.out).toMatchObject({ reason: 'line_note', advanced: false });
    const then = play(
      ctx,
      [line(`${unreduced}=${p(T.na_and_f)}`)],
      first.state,
    );
    expect(then.out).toMatchObject({ reason: 'credit', advanced: true });
    expect(then.state.nodeLines.na_and_f).toBe(
      `${o(T.f)}-${o(T.a_and_f)}=${unreduced}=${p(T.na_and_f)}`,
    );
  });

  it('the two printed numbers subtracted give the right value: refused', () => {
    const { ctx, state } = onCard('t1', 'na_and_f');
    const r = play(ctx, [line(`${o(T.a)}-${o(T.f)}=${p(T.na_and_f)}`)], state);
    expect(r.out).toMatchObject({
      tier: 'instant',
      reason: 'slip_first',
      advanced: false,
    });
    expect(r.state.session.credited.main).not.toContain('na_and_f');
  });

  it('«ما نعرفش»: the three help levels, then the solution, never an AI call', () => {
    const { ctx, state } = onCard('t1', 'a_and_f');
    expect(view(ctx, state)?.ladder).toBe(0);
    const r = play(ctx, [DK, DK, DK, DK], state);
    expect(r.outs.map(x => `${x.tier}:${x.reason}`)).toEqual([
      'instant:ladder',
      'instant:ladder',
      'instant:ladder',
      'instant:reveal',
    ]);
    expect(view(ctx, r.state)?.ladder).toBe(3);
    // The small example is solved on the card now: no case to work on.
    expect(r.state.onCase).toBeNull();
    // He still writes the line himself, and it is credited.
    const back = play(ctx, [line(RIGHT.a_and_f!)], r.state);
    expect(back.out).toMatchObject({ reason: 'credit', advanced: true });
  });

  it('a question to the teacher on a ladder step never uses up a level', () => {
    const { ctx, state } = onCard('t1', 'a_and_f');
    const r = play(ctx, [{ kind: 'free', text: 'chnwa ma3neha' }, DK], state);
    expect(r.outs[0]!.hintPending).toBeUndefined();
    expect(r.out.reason).toBe('ladder');
    expect(view(ctx, r.state)?.ladder).toBe(1);
  });
});

describe('t2: a branch of the second level', () => {
  it('walks complement, rule, quotient', () => {
    expect(toTheEnd('t2').frames.slice(0, 3)).toEqual([
      'mt2.c_other',
      'mt2.c_rule',
      'mt2.c_branch',
    ]);
  });

  it('the complement of the other node gives the right value here: refused as a slip', () => {
    const { ctx, state } = onCard('t2', 'f_given_na');
    const r = play(
      ctx,
      [line(`1-${o(T.f_given_a)}=${p(T.f_given_na)}`)],
      state,
    );
    expect(r.out).toMatchObject({
      tier: 'instant',
      reason: 'slip_first',
      advanced: false,
    });
    expect(slipOf(r.out)).toEqual(['warned']);
    expect(r.state.session.credited.main).not.toContain('f_given_na');
    // The same road again is the light tier, as for any repeated slip.
    const again = play(
      ctx,
      [line(`1-${o(T.f_given_a)}=${p(T.f_given_na)}`)],
      r.state,
    );
    expect(again.out).toMatchObject({ tier: 'light', reason: 'slip_again' });
  });

  it('the value alone asks for the calculation; wrong quotients are named', () => {
    const { ctx, state } = onCard('t2', 'f_given_na');
    expect(play(ctx, [line(p(T.f_given_na))], state).out).toMatchObject({
      tier: 'instant',
      reason: 'line_note',
    });
    for (const wrong of [
      `${o(T.na_and_f)}/${o(T.f)}`,
      `${o(T.not_a)}/${o(T.na_and_f)}`,
      p(T.na_and_f),
    ]) {
      const r = play(ctx, [line(wrong)], state);
      expect(['slip_first', 'line_note']).toContain(r.out.reason);
      expect(r.state.session.credited.main).not.toContain('f_given_na');
    }
  });

  it('the small example of the conditional counts among one side only', () => {
    mockLadders.off = true;
    const { ctx, state } = onCard('t2', 'f_given_na');
    const stuck = play(ctx, [DK, DK], state);
    expect(stuck.out).toMatchObject({ tier: 'instant', reason: 'case_open' });
    const spec = stuck.state.session.cases[stuck.state.onCase!]!;
    if (spec.kind !== 'tree') {
      throw new Error('a tree case');
    }
    expect(spec.node).toBe('f_given_na');
    // Over everyone (the path, not the branch): the example names the slip at once.
    const slip = play(ctx, [line(`${spec.naf}/${spec.n}`)], stuck.state);
    expect(slip.out).toMatchObject({ tier: 'instant', reason: 'case_note' });
    expect(slip.state.onCase).not.toBeNull();
    const done = play(
      ctx,
      [line(`${spec.naf}/${spec.n - spec.a}`)],
      slip.state,
    );
    expect(done.out).toMatchObject({ tier: 'instant', reason: 'case_done' });
  });
});

describe('t3: the missing branches', () => {
  it('reuses the two branches of question 2: only two lines are left', () => {
    const run = toTheEnd('t3');
    expect(run.frames.slice(0, 3)).toEqual([
      'mt3.c_up',
      'mt3.c_last',
      'mt3.p_check',
    ]);
    const road = roadView(run.ctx, run.state);
    expect(road.steps.map(x => x.reused)).toEqual([true, true, false, false]);
  });

  it('opened alone, the four branches are played', () => {
    const { ctx, state } = started('t3', {});
    expect(view(ctx, state)?.frameId).toBe('mt3.c_first');
  });

  it('a copied branch and the right value through the other node are slips', () => {
    const { ctx, state } = onCard('t3', 'nf_given_a');
    const copied = play(ctx, [line(p(T.f_given_a))], state);
    expect(copied.out).toMatchObject({ tier: 'instant', reason: 'slip_first' });
    const trap = play(
      ctx,
      [line(`${o(T.na_and_f)}/${o(T.not_a)}=${p(T.nf_given_a)}`)],
      state,
    );
    expect(trap.out).toMatchObject({ tier: 'instant', reason: 'slip_first' });
    expect(trap.state.session.credited.main).not.toContain('nf_given_a');
  });
});

describe('t4: the tree read backwards', () => {
  it('walks what is known, the path, the quotient, then the pick', () => {
    expect(toTheEnd('t4').frames.slice(0, 4)).toEqual([
      'mt4.c_cond',
      'mt4.c_path',
      'mt4.c_back',
      'mt4.p_order',
    ]);
  });

  it("the tree's own branch for the reversed question is named", () => {
    const { ctx, state } = onCard('t4', 'na_given_nf');
    const branch = play(ctx, [line(p(T.nf_given_na))], state);
    expect(branch.out).toMatchObject({ tier: 'instant', reason: 'slip_first' });
    const divided = play(
      ctx,
      [line(`${o(T.na_and_nf)}/${o(T.not_a)}=${p(T.nf_given_na)}`)],
      state,
    );
    expect(divided.out).toMatchObject({
      tier: 'instant',
      reason: 'slip_first',
    });
  });

  it('a sum that lands on the right value by chance is refused', () => {
    const { ctx, state } = onCard('t4', 'not_f');
    const r = play(
      ctx,
      [line(`${o(T.not_a)}+${o(T.f_given_a)}=${p(T.not_f)}`)],
      state,
    );
    expect(r.out).toMatchObject({ tier: 'instant', reason: 'slip_first' });
    expect(r.state.session.credited.main ?? []).not.toContain('not_f');
  });

  it('a branch of the completed tree written again is named, not counted wrong', () => {
    const { ctx, state } = onCard('t4', 'na_and_nf');
    const r = play(ctx, [line(RIGHT.not_a!)], state);
    expect(r.out).toMatchObject({ tier: 'instant', reason: 'line_note' });
    expect(r.state.progress.attempts).toBe(0);
  });

  it('the small example of the last step counts among those who are not F', () => {
    mockLadders.off = true;
    const { ctx, state } = onCard('t4', 'na_given_nf');
    const stuck = play(ctx, [DK, DK], state);
    const spec = stuck.state.session.cases[stuck.state.onCase!]!;
    if (spec.kind !== 'tree') {
      throw new Error('a tree case');
    }
    const notF = spec.n - spec.af - spec.naf;
    const done = play(
      ctx,
      [line(`${spec.n - spec.a - spec.naf}/${notF}`)],
      stuck.state,
    );
    expect(done.out).toMatchObject({ tier: 'instant', reason: 'case_done' });
  });
});

describe('nothing of the method is on the paper before he finds it (rule 6)', () => {
  it.each(['t1', 't2', 't3', 't4'])(
    '%s: a calculation line of the write-up appears only with his own values',
    q => {
      const ctx = ctxOf(q);
      const plan = [...ctx.frames.values()].find(s => s.sheet !== undefined)!;
      const skeleton = plan.sheet!.skeleton;
      const graph = ctx.pack.main!.graph;
      const withMath = skeleton.filter(l => l.math !== undefined);
      expect(withMath.length).toBeGreaterThan(0);
      // Nothing found: no line with a calculation is shown.
      const empty = fillSkeleton({ skeleton, graph, lines: {} });
      expect(empty.filter(r => r.math !== undefined)).toEqual([]);
      // Everything found: every line, his values in it, no gap left.
      const lines = Object.fromEntries(
        graph.nodes.map(n => [n.id, RIGHT[n.id] ?? '']),
      );
      const full = fillSkeleton({ skeleton, graph, lines });
      expect(full.map(r => r.id)).toEqual(skeleton.map(l => l.id));
      for (const row of full) {
        expect(row.math ?? '').not.toContain('\\ldots');
        expect(row.math ?? '').not.toContain('\\his');
      }
    },
  );

  it('«التمرين» underlines no number word: the data are on the tree', () => {
    const sheet = exerciseSheet(loaded!, 't1', new Set(), []);
    expect(sheet.statement.marks).toEqual([]);
    expect(sheet.figure).not.toBeNull();
  });
});

/** `x - y` written over their common denominator 12, not reduced (3/12). */
function sub12(x: Fraction, y: Fraction): string {
  const num = (x[0] * 12) / x[1] - (y[0] * 12) / y[1];
  return `${num}/12`;
}

describe('written alone (the solo sheet, student test 2026-11-18)', () => {
  /** The question opened on the paper, then «نكتب الحل وحدي». */
  function solo(q: string) {
    const ctx = ctxOf(q);
    const from = startQuestion(ctx, { carried: CARRIED[q]! });
    return { ctx, ...play(ctx, [{ kind: 'solo' }], from) };
  }

  it('from the paper: the trip ends and the sheet opens', () => {
    const { ctx, state, out } = solo('t1');
    expect(out).toMatchObject({ tier: 'instant', reason: 'solo_start' });
    expect(state.solo).toEqual({ on: true, from: 0, done: [] });
    expect(soloPossible(ctx, state)).toBe(true);
  });

  it('credits any step, in any order, and ends the question when every line step is his', () => {
    const { ctx, state } = solo('t1');
    // The second line step first (the first one's value written in it).
    const second = play(ctx, [line(RIGHT.na_and_f!)], state);
    expect(second.out).toMatchObject({
      tier: 'instant',
      reason: 'solo_credit',
    });
    expect(second.state.solo?.done).toEqual(['mt1.c_rest']);
    expect(second.state.done).toBe(false);
    const first = play(ctx, [line(RIGHT.a_and_f!)], second.state);
    expect(first.out).toMatchObject({ reason: 'solo_credit', advanced: true });
    expect(first.state.done).toBe(true);
    expect(first.state.session.credited.main).toEqual(
      expect.arrayContaining(['a_and_f', 'na_and_f']),
    );
  });

  it('a wrong line is answered at once with no AI call, and nothing is credited', () => {
    const { ctx, state } = solo('t1');
    const r = play(ctx, [line(`${o(T.a)}-${o(T.f)}=${p(T.na_and_f)}`)], state);
    expect(r.out).toMatchObject({ tier: 'instant', reason: 'solo_wrong' });
    expect(r.state.session.credited.main ?? []).not.toContain('na_and_f');
  });

  it('«تعطّلت؟» after the first step: the steps go on at the next one, his line stays', () => {
    const { ctx, state } = solo('t1');
    const one = play(ctx, [line(RIGHT.a_and_f!)], state);
    const handed = play(ctx, [{ kind: 'steps' }], one.state);
    expect(handed.out).toMatchObject({ reason: 'handoff', advanced: true });
    expect(handed.state.solo?.on).toBe(false);
    // The reason card between the two paths comes next, then the other path.
    expect(view(ctx, handed.state)?.frameId).toBe('mt1.c_split');
    expect(handed.state.session.credited.main).toContain('a_and_f');
  });

  it('a step finished alone is skipped when the steps reach it', () => {
    const { ctx, state } = solo('t1');
    const rest = play(ctx, [line(RIGHT.na_and_f!), { kind: 'steps' }], state);
    expect(view(ctx, rest.state)?.frameId).toBe('mt1.c_path');
    const path = play(ctx, rightAct(ctx, rest.state), rest.state);
    expect(view(ctx, path.state)?.frameId).toBe('mt1.c_split');
    const pick = play(ctx, rightAct(ctx, path.state), path.state);
    // mt1.c_rest was his already: the recipe comes next.
    expect(view(ctx, pick.state)?.frameId).toBe('mt1.recipe');
  });

  it('every question of the tree can be written alone to the end', () => {
    for (const q of ['t1', 't2', 't3', 't4']) {
      const { ctx, state } = solo(q);
      let s = state;
      const keys = s.route
        .map(id => ctx.frames.get(id)!.frame)
        .flatMap(f => (f.type === 'lines' ? [f.key] : []));
      for (const k of keys) {
        s = play(ctx, [line(RIGHT[k]!)], s).state;
      }
      expect([q, s.done]).toEqual([q, true]);
    }
  });
});

describe('written alone: a line no step accepts is never called right', () => {
  it('two sides that differ get "does not count", with the board\'s note', () => {
    const ctx = ctxOf('t1');
    const from = startQuestion(ctx, { carried: CARRIED.t1! });
    const s = play(ctx, [{ kind: 'solo' }], from).state;
    // Seen on the simulator 2026-11-18: «2/3 1/4 = 1/3» was answered «صحيح».
    const r = play(ctx, [line(`${o(T.a)}*${o(T.f_given_a)}=1/3`)], s);
    expect(r.out).toMatchObject({ tier: 'instant', reason: 'solo_wrong' });
    expect(
      r.out.reply.some(x => x.kind === 'message' && x.tone === 'success'),
    ).toBe(false);
  });
});
