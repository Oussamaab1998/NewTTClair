import type { StudentAct } from '../../ai/checks/autoCheck';
import { CATALOG } from '../../app/exercises';
import {
  act,
  applyFallback,
  applyMove,
  questionCtx,
  startQuestion,
  view,
} from './conductor';
import type { ConductorState } from './types';
import { passTour } from '../tour/passTour';
import { roadView } from '../tour/tour';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const ctx = questionCtx(loaded!, entry.raw as never, '1');

/** Plays acts (prepared replies shown, as with no AI) and returns the last output. */
function play(acts: StudentAct[], from = startQuestion(ctx)) {
  let state = from;
  let last = act(ctx, state, { kind: 'continue' }).out;
  for (const a of acts) {
    const r = act(ctx, state, a);
    state = applyFallback(r.state, r.out);
    last = r.out;
  }
  return { state, out: last };
}

const TOUR: StudentAct[] = passTour(ctx);
const line = (raw: string, readback?: 'grouped'): StudentAct =>
  readback ? { kind: 'line', raw, readback } : { kind: 'line', raw };
const atTotal = () => play(TOUR).state;

describe('conductor: the trip', () => {
  it('shows the trip first: no step until «نبداو», then his first step', () => {
    const start = startQuestion(ctx);
    expect(view(ctx, start)).toBeNull();
    expect(start.route).not.toContain('m1.plan');
    expect(start.route).not.toContain('m1.read');
    // Nothing to tap or order on the map: only «نبداو» starts.
    expect(
      act(ctx, start, { kind: 'tap_word', token: 'quatre' }).out.reason,
    ).toBe('not_now');
    const { state, out } = play(TOUR);
    expect(out).toMatchObject({ tier: 'instant', reason: 'tour_done' });
    expect(view(ctx, state)?.frameId).toBe('m1.c_total');
    expect(state.planOrder).toEqual(['c_total', 'c_fav', 'c_ratio']);
    // What the word frame said still holds.
    expect(state.facts).toMatchObject({ order: 'unordered' });
  });

  it('the map: the exercise from above, what we have, the goal, the steps, the end', () => {
    const road = roadView(ctx, startQuestion(ctx));
    expect(road.ready).toBe(false);
    expect(road.overview?.questions.map(q => `${q.id}:${q.current}`)).toEqual([
      '1:true',
      '2:false',
      '3a:false',
      '3b:false',
    ]);
    expect(road.have).toHaveLength(2);
    expect(road.goal?.fr).toBe('Montrer que P(A) = 0,5');
    expect(road.steps.map(x => `${x.cardId}:${x.status}`)).toEqual([
      'c_total:now',
      'c_fav:later',
      'c_ratio:later',
    ]);
    expect(road.after.map(x => x.kind)).toEqual(['recipe', 'similar']);
  });

  it('ticks the map as he solves', () => {
    const { state } = play([...TOUR, line('10*9*8/(3*2*1)=120')]);
    const road = roadView(ctx, state);
    expect(road.ready).toBe(true);
    expect(road.steps.map(x => `${x.cardId}:${x.status}`)).toEqual([
      'c_total:done',
      'c_fav:now',
      'c_ratio:later',
    ]);
    expect(road.steps[0]!.line).toBe('10*9*8/(3*2*1)=120');
  });

  it('keeps a step "now" while he picks why, after its line is credited', () => {
    const { state } = play([
      ...TOUR,
      line('10*9*8/(3*2*1)=120'),
      line('4*15=60'),
    ]);
    expect(view(ctx, state)?.frameId).toBe('m1.p_reason');
    expect(roadView(ctx, state).steps.map(x => x.status)).toEqual([
      'done',
      'now',
      'later',
    ]);
  });

  it('reuses a result he found in an earlier question: the step is done and skipped', () => {
    const ctx2 = questionCtx(loaded!, entry.raw as never, '2');
    const carried = { '1/total': { line: '10×9×8÷6=120', value: '120' } };
    let s = startQuestion(ctx2, { carried });
    // On the map before «نبداو»: already done, with his question 1 line.
    expect(roadView(ctx2, s).steps.slice(0, 2)).toMatchObject([
      { cardId: 'c_total', reused: true, status: 'done', line: '10×9×8÷6=120' },
      { cardId: 'c_fav', status: 'now' },
    ]);
    for (const a of passTour(ctx2)) {
      s = act(ctx2, s, a).state;
    }
    expect(s.session.credited.main).toContain('total');
    expect(s.route).not.toContain('m2.c_total');
    expect(view(ctx2, s)?.frameId).toBe('m2.c_fav');
    expect(roadView(ctx2, s).steps[0]).toMatchObject({
      status: 'done',
      line: '10×9×8÷6=120',
    });
    // Without his question 1, he computes it.
    let fresh = startQuestion(ctx2);
    for (const a of passTour(ctx2)) {
      fresh = act(ctx2, fresh, a).state;
    }
    expect(view(ctx2, fresh)?.frameId).toBe('m2.c_total');
  });
});

describe('conductor: lines', () => {
  it('credits a line and moves on, with the evidence in the shared session', () => {
    const { state, out } = play([line('10*9*8/(3*2*1)=120')], atTotal());
    expect(out).toMatchObject({ reason: 'credit', advanced: true });
    expect(state.session.credited.main).toContain('total');
    expect(state.session.lines.map(l => l.id)).toEqual(['L1']);
    expect(view(ctx, state)?.frameId).toBe('m1.c_fav');
  });

  it('names a right intermediate without moving', () => {
    const { state, out } = play([line('10*9*8=720')], atTotal());
    expect(out).toMatchObject({ tier: 'instant', reason: 'line_note' });
    expect(view(ctx, state)?.frameId).toBe('m1.c_total');
  });

  it('asks how an ambiguous division is meant before judging it', () => {
    const asked = play([line('720/3*2*1=120')], atTotal());
    expect(asked.out).toMatchObject({
      reason: 'readback',
      readback: { grouped: '720/(3*2*1)=120' },
    });
    expect(asked.state.session.lines).toHaveLength(0);
    const { out } = play([line('720/3*2*1=120', 'grouped')], asked.state);
    expect(out.reason).toBe('credit');
  });

  it('explains a known slip at once, then light, then deep', () => {
    const slip = line('10*3=30');
    expect(play([slip], atTotal()).out).toMatchObject({
      tier: 'instant',
      reason: 'slip_first',
    });
    expect(play([slip, slip], atTotal()).out).toMatchObject({
      tier: 'light',
      reason: 'slip_again',
    });
    expect(play([slip, slip, slip], atTotal()).out).toMatchObject({
      tier: 'deep',
      reason: 'slip_third',
    });
  });

  it('sends an undiagnosed line deep, with a hint that counts only if shown', () => {
    const start = play([...TOUR, line('10*9*8/6=120')]).state;
    const r = act(ctx, start, line('4*6=24'));
    expect(r.out).toMatchObject({
      tier: 'deep',
      reason: 'undiagnosed',
      hintPending: true,
    });
    // The AI answered: the hint is still there for later.
    expect(r.state.progress.hints).toBe(0);
    // The prepared reply was shown: the hint is used up.
    expect(applyFallback(r.state, r.out).progress.hints).toBe(1);
  });
});

describe('conductor: help and free text', () => {
  it('gives the first hint at once and sends a second «ما نعرفش» deep', () => {
    const dk: StudentAct = { kind: 'dont_know' };
    expect(play([dk], atTotal()).out).toMatchObject({
      tier: 'instant',
      reason: 'hint',
    });
    expect(play([dk, dk], atTotal()).out).toMatchObject({
      tier: 'deep',
      reason: 'stuck_again',
    });
  });

  it('answers his use of a component an AI move showed light, without moving', () => {
    const { state, out } = play(
      [{ kind: 'component', events: [], result: null }],
      atTotal(),
    );
    expect(out).toMatchObject({
      tier: 'light',
      reason: 'component_result',
      advanced: false,
    });
    expect(view(ctx, state)?.frameId).toBe('m1.c_total');
  });

  it('sends free text light, and a sentence with a calculation deep', () => {
    expect(
      play([{ kind: 'free', text: 'ma fhemtch chnowa n7seb' }], atTotal()).out,
    ).toMatchObject({ tier: 'light', reason: 'free_text' });
    expect(
      play([{ kind: 'free', text: 'ya3ni 10*3 = 30' }], atTotal()).out,
    ).toMatchObject({ tier: 'deep', reason: 'claim' });
  });
});

describe('conductor: picks, similar questions and the end', () => {
  const toPick = () =>
    play([...TOUR, line('10*9*8/6=120'), line('4*15=60')]).state;

  it('answers a first wrong pick at once and a second one light', () => {
    const wrong: StudentAct = { kind: 'choice', optionId: 'r_add' };
    expect(play([wrong], toPick()).out.reason).toBe('pick_wrong');
    expect(play([wrong, wrong], toPick()).out).toMatchObject({
      tier: 'light',
      reason: 'pick_again',
    });
    expect(
      play([{ kind: 'choice', optionId: 'r_true' }], toPick()).out,
    ).toMatchObject({ reason: 'pick_ok', advanced: true });
  });

  it('reviews a similar question on submit and ends the question', () => {
    const atSimilar = play(
      [
        { kind: 'choice', optionId: 'r_true' },
        line('60/120=1/2'),
        {
          kind: 'order',
          ids: ['rc_read', 'rc_total', 'rc_fav', 'rc_divide'],
        },
      ],
      toPick(),
    ).state;
    expect(view(ctx, atSimilar)?.type).toBe('similar');
    const same = play(
      [line('14*13*12/(3*2*1)=364'), { kind: 'continue' }],
      atSimilar,
    );
    expect(same.out).toMatchObject({
      reason: 'similar_review',
      advanced: true,
    });
    const twist = play([line('abc+1'), { kind: 'continue' }], same.state);
    expect(twist.out).toMatchObject({ tier: 'light', reason: 'similar_other' });
    expect(twist.state.done).toBe(true);
    expect(view(ctx, twist.state)).toBeNull();
  });

  it('lets him simplify after an unsimplified result (only the conductor credits)', () => {
    const atRatio = play(
      [{ kind: 'choice', optionId: 'r_true' }],
      toPick(),
    ).state;
    const first = play([line('60/120')], atRatio);
    expect(first.out).toMatchObject({ reason: 'line_note', advanced: false });
    expect(first.state.session.credited.main).not.toContain('result');
    const then = play([line('60/120=1/2')], first.state);
    expect(then.out).toMatchObject({ reason: 'credit', advanced: true });
  });

  it('judges a line on the small case an AI move put him on, then comes back', () => {
    const moved = applyMove(atTotal(), {
      blocks: [],
      component: null,
      tier: 'light',
      costUsd: 0,
      case: { id: 'C1', spec: { kind: 'urn', reds: 2, blacks: 3, k: 3, j: 1 } },
    });
    expect(moved.onCase).toBe('C1');
    // 5*4*3/(3*2*1)=10 is not a line of the exam's urn: it is about the case.
    const onCase = play([line('5*4*3/(3*2*1)=10')], moved);
    expect(onCase.out).toMatchObject({ tier: 'light', reason: 'case_line' });
    expect(onCase.out.reply[1]).toMatchObject({ message: 'correct' });
    expect(onCase.state.session.lines.at(-1)?.graph).toBe('C1');
    expect(view(ctx, onCase.state)?.frameId).toBe('m1.c_total');
    // A line the exam's urn reads brings him back to the question.
    // He lists the case's groups: judged on the case.
    const listed = play(
      [
        {
          kind: 'list',
          groups: [
            ['r1', 'r2', 'n1'],
            ['r1', 'r2', 'n2'],
          ],
        },
      ],
      onCase.state,
    );
    expect(listed.out).toMatchObject({ reason: 'case_line' });
    expect(listed.out.reply[0]).toMatchObject({ message: 'wrong' });
    // «نرجعو للسؤال» leaves the case.
    expect(play([{ kind: 'continue' }], onCase.state).state.onCase).toBeNull();
    const back = play([line('10*9*8/(3*2*1)=120')], onCase.state);
    expect(back.out).toMatchObject({ reason: 'credit', advanced: true });
    expect(back.state.onCase).toBeNull();
  });

  it('is pure and its state is plain JSON', () => {
    const before = atTotal();
    const copy = JSON.stringify(before);
    const r = act(ctx, before, line('10*9*8/6=120'));
    expect(JSON.stringify(before)).toBe(copy);
    expect(JSON.parse(JSON.stringify(r.state)) as ConductorState).toEqual(
      r.state,
    );
  });
});
