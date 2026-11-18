/**
 * The conductor on a probability tree (the small fixture, treeFixture.ts):
 * a prepared small example opens by itself on the second «ما نعرفش», its
 * lines are judged on the example first, the bridge brings him back, and a
 * `proof` node is credited only with its calculation. The urn exercise has
 * no prepared example of its own cards: nothing changes for it.
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { restoreRuntime, type CaseSpec } from '../../ai/session/state';
import { CATALOG } from '../../app/exercises';
import arTN from '../../i18n/ar-TN.json';
import type { ReplyPart } from '../../method/replies';
import { passTour } from '../tour/passTour';
import { treeBridge } from './bridge';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
  view,
} from './conductor';
import { TO_FIRST_LINES, TREE_MINI_FRAMES, treeMini } from './treeFixture';
import type { ConductorState } from './types';

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

const { ctx } = treeMini();
const WORDS = arTN.hybrid;

/** Plays acts (prepared replies shown, as with no AI) and returns the last output. */
function play(acts: StudentAct[], from: ConductorState = startQuestion(ctx)) {
  let state = from;
  let last = null as ReturnType<typeof act>['out'] | null;
  for (const a of acts) {
    const r = act(ctx, state, a);
    state = applyFallback(r.state, r.out);
    last = r.out;
  }
  return { state, out: last! };
}

const DK: StudentAct = { kind: 'dont_know' };
const line = (raw: string): StudentAct => ({ kind: 'line', raw });
/** On the first lines frame (the path A then F). */
const onPath = () => play(TO_FIRST_LINES).state;
/** On the small example of that card (two «ما نعرفش»). */
const onExample = () => play([DK, DK], onPath()).state;
/** On the last lines frame (the other path), the first path and the pick behind him. */
const onRest = () =>
  play([line('3/5*1/2=3/10'), { kind: 'choice', optionId: 's_true' }], onPath())
    .state;

const said = (parts: readonly ReplyPart[]) =>
  parts.flatMap(p =>
    p.kind === 'feedback'
      ? [(p.rich.ar ?? []).map(r => ('ar' in r ? r.ar : r.fr)).join('')]
      : [],
  );

describe('conductor: a prepared small tree example (S1)', () => {
  it('the first «ما نعرفش» is the hint; the second opens the example, free', () => {
    expect(play([DK], onPath()).out).toMatchObject({
      tier: 'instant',
      reason: 'hint',
    });
    const before = onPath();
    const { state, out } = play([DK, DK], before);
    expect(out).toMatchObject({
      tier: 'instant',
      reason: 'case_open',
      advanced: false,
    });
    expect(out.hintPending).toBeUndefined();
    expect(out.reply).toEqual([
      {
        kind: 'feedback',
        tone: 'info',
        rich: { ar: [{ ar: WORDS.case.treeOpen }] },
      },
    ]);
    expect(state.onCase).toBe('S1');
    expect(state.session.cases.S1).toMatchObject({
      kind: 'tree',
      node: 'a_and_f',
      n: 20,
    });
    // He stays on his step; only the first hint was used.
    expect(view(ctx, state)?.frameId).toBe(TREE_MINI_FRAMES.path);
    expect(state.progress.hints).toBe(1);
    // The counts on its card are numbers he has seen.
    for (const n of ['20', '8', '12', '2', '6', '3', '9']) {
      expect(state.session.known).toContain(n);
    }
    expect(before.session.known).not.toContain('20');
  });

  it('is not opened twice: once seen, a later «ما نعرفش» goes to the AI as before', () => {
    const closed = play([{ kind: 'continue' }], onExample());
    expect(closed.out).toMatchObject({ tier: 'instant', reason: 'case_back' });
    expect(closed.state.onCase).toBeNull();
    const again = play([DK], closed.state);
    expect(again.out).toMatchObject({ tier: 'deep', reason: 'stuck_again' });
    expect(again.state.onCase).toBeNull();
  });

  it('opens only on a card that has a prepared example', () => {
    // The last card has none: the second «ما نعرفش» is today's.
    const { state, out } = play([DK, DK], onRest());
    expect(view(ctx, onRest())?.frameId).toBe(TREE_MINI_FRAMES.rest);
    expect(out).toMatchObject({ tier: 'deep', reason: 'stuck_again' });
    expect(state.onCase).toBeNull();
  });

  it('the urn exercise still sends a second «ما نعرفش» deep', () => {
    mockLadders.off = true;
    const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
    const urn = questionCtx(
      entry.result.ok ? entry.result.loaded : (null as never),
      entry.raw as never,
      '1',
    );
    let s = startQuestion(urn);
    let last = null as ReturnType<typeof act>['out'] | null;
    for (const a of [...passTour(urn), DK, DK]) {
      const r = act(urn, s, a);
      s = applyFallback(r.state, r.out);
      last = r.out;
    }
    expect(last).toMatchObject({ tier: 'deep', reason: 'stuck_again' });
    expect(s.onCase).toBeNull();
    expect(s.session.cases).toEqual({});
  });
});

describe('conductor: lines while a small tree example is open', () => {
  it('a right line closes the example with the bridge back to the question', () => {
    const { state, out } = play([line('2/20=1/10')], onExample());
    expect(out).toMatchObject({
      tier: 'instant',
      reason: 'case_done',
      advanced: false,
    });
    expect(state.onCase).toBeNull();
    expect(out.reply[0]).toEqual({
      kind: 'student',
      content: { kind: 'typed', raw: '2/20=1/10' },
    });
    // His own line, what he did, then the question and his page.
    expect(out.reply[1]).toMatchObject({
      kind: 'feedback',
      tone: 'success',
      rich: { math: '\\frac{2}{20} = \\frac{1}{10}' },
    });
    expect(said(out.reply)).toEqual([
      WORDS.bridge.tree.done,
      WORDS.bridge.tree.path,
      WORDS.bridge.question,
      WORDS.bridge.write,
    ]);
    // The line is the example's; the question's step is untouched.
    expect(state.session.lines.at(-1)).toMatchObject({
      graph: 'S1',
      expected: 'a_and_f',
    });
    expect(state.session.credited.main ?? []).toEqual([]);
    expect(state.progress.attempts).toBe(0);
    expect(view(ctx, state)?.frameId).toBe(TREE_MINI_FRAMES.path);
  });

  it('a count over a count is the whole reasoning on the example', () => {
    expect(play([line('2/20')], onExample()).out.reason).toBe('case_done');
  });

  it('a known slip on the example gets its prepared text at once', () => {
    const { state, out } = play([line('8/20')], onExample());
    expect(out).toMatchObject({ tier: 'instant', reason: 'case_note' });
    expect(out.reply[1]).toMatchObject({ kind: 'feedback', tone: 'warning' });
    expect(said(out.reply)[0]).toMatch(/الفرع الأوّل برك/);
    expect(state.onCase).toBe('S1');
    expect(state.session.lines.at(-1)).toMatchObject({ graph: 'S1' });
    // Nothing is counted against him on the question's step.
    expect(state.progress.attempts).toBe(0);
    expect(state.progress.slips).toEqual({});
  });

  it('a slip nobody wrote a text for falls back to the light reply', () => {
    // The same slip, on a library that has no text for it.
    const bare = {
      ...ctx,
      loaded: { ...ctx.loaded, misconceptions: new Map() },
    };
    const { state, out } = act(bare, onExample(), line('8/20'));
    expect(out).toMatchObject({ tier: 'light', reason: 'case_line' });
    expect(out.reply[1]).toEqual({
      kind: 'message',
      tone: 'info',
      message: 'wrong',
    });
    expect(state.session.lines.at(-1)?.match).toMatchObject({
      verdict: 'slip',
      slip: 'first_branch_for_path',
    });
  });

  it('any other wrong line is about the example (light): nothing counted on the step', () => {
    for (const raw of ['5/20', '7/20=7/20']) {
      const { state, out } = play([line(raw)], onExample());
      expect(out).toMatchObject({ tier: 'light', reason: 'case_line' });
      expect(out.reply).toEqual([
        { kind: 'student', content: { kind: 'typed', raw } },
        { kind: 'message', tone: 'info', message: 'wrong' },
      ]);
      expect(state.onCase).toBe('S1');
      expect(state.session.lines.at(-1)).toMatchObject({ graph: 'S1' });
      expect(state.progress.attempts).toBe(0);
      expect(state.progress.slips).toEqual({});
    }
  });

  it('the bare value of the question is about the example too: nothing is credited', () => {
    const { state, out } = play([line('3/10')], onExample());
    expect(out.reason).toBe('case_line');
    expect(state.session.credited.main ?? []).toEqual([]);
    expect(state.onCase).toBe('S1');
  });

  it('a line the question credits brings him back to the question', () => {
    const { state, out } = play([line('3/5*1/2=3/10')], onExample());
    expect(out).toMatchObject({
      tier: 'instant',
      reason: 'credit',
      advanced: true,
    });
    expect(state.onCase).toBeNull();
    expect(state.session.credited.main).toEqual(['a_and_f']);
    expect(view(ctx, state)?.frameId).toBe(TREE_MINI_FRAMES.split);
  });

  it('an unfinished line, or sides that differ, keep their usual notes', () => {
    const unfinished = play([line('8-2')], onExample());
    expect(unfinished.out).toMatchObject({
      tier: 'instant',
      reason: 'line_note',
    });
    const mismatch = play([line('2/20=1/5')], onExample());
    expect(mismatch.out).toMatchObject({
      tier: 'instant',
      reason: 'line_note',
    });
    expect(mismatch.out.reply[1]).toMatchObject({ kind: 'note' });
    expect(mismatch.state.onCase).toBe('S1');
    expect(mismatch.state.progress.attempts).toBe(0);
  });

  it('«نرجعو للسؤال» closes it; «ما نعرفش» on it gives its own hint once', () => {
    const hint = play([DK], onExample());
    expect(hint.out).toMatchObject({ tier: 'instant', reason: 'case_note' });
    expect(hint.out.reply).toHaveLength(1);
    expect(said(hint.out.reply)[0]).toMatch(/آخر الطريق/);
    expect(hint.state.onCase).toBe('S1');
    // The question's own ladder is not spent by it.
    expect(hint.state.progress.hints).toBe(1);
    // Afterwards, as before: the AI is asked, the next hint is its prepared reply.
    const again = play([DK], hint.state);
    expect(again.out).toMatchObject({ tier: 'deep', reason: 'stuck_again' });
    const back = play([{ kind: 'continue' }], hint.state);
    expect(back.out.reason).toBe('case_back');
    expect(back.state.onCase).toBeNull();
  });

  it('survives a save and a reload (plain JSON)', () => {
    const s = play([DK], onExample()).state;
    const reloaded = JSON.parse(JSON.stringify(s)) as ConductorState;
    expect(play([DK], reloaded).out.reason).toBe('stuck_again');
    expect(play([line('2/20')], reloaded).out.reason).toBe('case_done');
  });
});

describe('conductor: a tree question asks for the calculation', () => {
  it('the right value alone gets a note: not credited, nothing counted', () => {
    const { state, out } = play([line('3/10')], onPath());
    expect(out).toMatchObject({ tier: 'instant', reason: 'line_note' });
    expect(out.advanced).toBe(false);
    expect(state.session.credited.main ?? []).toEqual([]);
    expect(state.progress.attempts).toBe(0);
    expect(view(ctx, state)?.frameId).toBe(TREE_MINI_FRAMES.path);
  });

  it('a result written unsimplified, then simplified, is credited with both lines as one', () => {
    const first = play([line('7/10-3/10=4/10')], onRest());
    expect(first.out).toMatchObject({ reason: 'line_note', advanced: false });
    expect(first.state.session.credited.main).toEqual(['a_and_f']);
    expect(first.state.nodeLines.na_and_f).toBeUndefined();
    const { state, out } = play([line('4/10=2/5')], first.state);
    expect(out).toMatchObject({ reason: 'credit', advanced: true });
    expect(state.session.credited.main).toEqual(['a_and_f', 'na_and_f']);
    // «الطريق» and the write-up show the calculation, not the simplification alone.
    expect(state.nodeLines.na_and_f).toBe('7/10-3/10=4/10=2/5');
    expect(state.done).toBe(true);
  });

  it('the value alone after the calculation continues it; a full line stands alone', () => {
    const first = play([line('7/10-3/10=4/10')], onRest()).state;
    expect(play([line('2/5')], first).state.nodeLines.na_and_f).toBe(
      '7/10-3/10=4/10=2/5',
    );
    expect(play([line('7/10-3/10=2/5')], first).state.nodeLines.na_and_f).toBe(
      '7/10-3/10=2/5',
    );
    // With no earlier line, his line is kept as he wrote it.
    expect(
      play([line('7/10-3/10=4/10=2/5')], onRest()).state.nodeLines.na_and_f,
    ).toBe('7/10-3/10=4/10=2/5');
  });
});

describe('the urn exercise keeps its lines as before', () => {
  it('a ratio simplified on a second line is stored as that line alone', () => {
    const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
    const urn = questionCtx(
      entry.result.ok ? entry.result.loaded : (null as never),
      entry.raw as never,
      '1',
    );
    let s = startQuestion(urn);
    const acts: StudentAct[] = [
      ...passTour(urn),
      line('10*9*8/(3*2*1)=120'),
      line('4*15=60'),
      { kind: 'choice', optionId: 'r_true' },
      line('60/120=30/60'),
      line('30/60=1/2'),
    ];
    for (const a of acts) {
      const r = act(urn, s, a);
      s = applyFallback(r.state, r.out);
    }
    expect(s.session.credited.main).toContain('result');
    expect(s.nodeLines.result).toBe('30/60=1/2');
  });
});

describe('treeBridge', () => {
  const tree = (node: string, counts = { n: 20, a: 8, af: 2, naf: 3 }) =>
    ({ kind: 'tree', template: 'tree_other_path', node, ...counts } as Extract<
      CaseSpec,
      { kind: 'tree' }
    >);
  const rt = (s: ConductorState) => restoreRuntime(s.session, ctx.pack.main);

  it('says what he did, by what the quantity is', () => {
    const idea = (node: string) =>
      said(treeBridge(ctx, rt(onPath()), tree(node), '2/20'))[1];
    expect(idea('a_and_f')).toBe(WORDS.bridge.tree.path);
    expect(idea('na_and_nf')).toBe(WORDS.bridge.tree.path);
    expect(idea('na_and_f')).toBe(WORDS.bridge.tree.rest);
    for (const node of ['not_a', 'nf_given_a', 'nf_given_na', 'not_f']) {
      expect(idea(node)).toBe(WORDS.bridge.tree.complement);
    }
    expect(idea('f_given_na')).toBe(WORDS.bridge.tree.branch);
    expect(idea('na_given_nf')).toBe(WORDS.bridge.tree.reverse);
    // A quantity with no sentence of its own: his line, then the way back.
    expect(said(treeBridge(ctx, rt(onPath()), tree('f'), '5/20'))).toEqual([
      WORDS.bridge.tree.done,
      WORDS.bridge.question,
      WORDS.bridge.write,
    ]);
  });

  it('leaves his line out when one of its values is a value the question still hides', () => {
    // On this example the path is 3/10: the question's own first step.
    const twin = tree('a_and_f', { n: 10, a: 6, af: 3, naf: 1 });
    const hidden = treeBridge(ctx, rt(onPath()), twin, '3/10');
    expect(hidden[0]).toEqual({
      kind: 'feedback',
      tone: 'success',
      rich: { ar: [{ ar: WORDS.bridge.tree.doneAlone }] },
    });
    expect(hidden.some(p => p.kind === 'feedback' && p.rich.math)).toBe(false);
    expect(said(hidden).slice(1)).toEqual([
      WORDS.bridge.tree.path,
      WORDS.bridge.question,
      WORDS.bridge.write,
    ]);
    // Once he has earned it, the same line is shown.
    const earned = play([line('3/5*1/2=3/10')], onPath()).state;
    expect(treeBridge(ctx, rt(earned), twin, '3/10')[0]).toMatchObject({
      rich: { math: '\\frac{3}{10}' },
    });
    // A value the statement prints is never hidden (« Montrer que … = 2/5 »).
    expect(
      treeBridge(ctx, rt(onPath()), tree('a_and_f'), '8/20=2/5')[0],
    ).toMatchObject({ rich: { math: '\\frac{8}{20} = \\frac{2}{5}' } });
  });
});
