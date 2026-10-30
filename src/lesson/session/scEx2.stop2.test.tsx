/**
 * Phase 4b (Stop 2): two purely additive, repair-only pieces in question 1 of
 * bac2022c-sc-ex2 (exsc2-0.3.0): a SlotsPattern bridge deep dive about
 * choosing k balls among n (dd_choose_bridge), and a PartWholeBar repair for a
 * probability written upside down (a value above 1). Neither is on the main
 * path: the no-mistake path of question 1 costs what it cost after 4a.
 *
 * Product owner (2026-10-27): "deep-dive priority for clarify answers depends
 * on array order in bac2022c-sc-ex2; dd_choose_bridge is first on purpose;
 * pinned by tests".
 */
// Frozen copy of question 1 as it was in exsc2-0.3.0 (before the method-lesson slice, docs/METHOD_LESSON_PROGRESS.md). Its assertions are unchanged; the live content has its own tests (scEx2.method.test.ts).
import exSc2 from '../../content/fixtures/scEx2.v030.json';
import exSc2Misconceptions from '../../content/fixtures/scEx2Misconceptions.v030.json';
import { isGate, resolveSpec } from '../../components/registry';
import { partWholeModel } from '../../components/probability2/partWhole';
import {
  PartWholeBarPropsSchema,
  SlotsPatternPropsSchema,
} from '../../components/probability2/schemas';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { choose } from '../../engine/combinatorics';
import { parseNumeric } from '../../engine/format';
import { div, equals, type Fraction } from '../../engine/rational';
import { revealsAnswer } from '../../planner/llm/revealing';
import { createRulesPlanner, RULES } from '../../planner/rules';
import type { Situation } from '../../planner/situation';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson, type LessonContent } from './lesson';
import { stepSync } from './orchestrate';
import type { LessonAction, LessonState } from './types';

function load(): LoadedExercise {
  const r = loadExercise(exSc2, exSc2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}
const loaded = load();
const ex = loaded.exercise;
const steps = ex.parts[0]!.groups.flatMap(g => g.steps);
const byId = (id: string) => steps.find(s => s.id === id)!;
const content: LessonContent = buildContent(loaded, '1');
const planner = createRulesPlanner(content.menu);
const deepDive = (id: string) => ex.deepDives.find(d => d.id === id)!;
const variant = (id: string) => ex.variants.find(v => v.id === id)!;

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

class Session {
  readonly log = new EventLog(
    {
      sessionId: 'sess-stop2',
      studentId: 'anon-1',
      exerciseId: ex.id,
      contentVersion: ex.contentVersion,
    },
    fixedClock(),
  );
  state: LessonState;
  private t = 0;
  private readonly planner = createRulesPlanner(content.menu);
  constructor() {
    const r = startLesson(content);
    this.state = r.state;
    this.log.append(r.events);
  }
  act(action: ActionInput): Event[] {
    this.t += 1500;
    const before = this.log.all().length;
    this.state = stepSync(
      content,
      this.state,
      { ...action, at: this.t } as LessonAction,
      this.log,
      this.planner,
    );
    return this.log.all().slice(before);
  }
  choose(optionId: string) {
    return this.act({ type: 'answer', value: { optionId } });
  }
  type(raw: string) {
    return this.act({ type: 'answer', value: { raw }, keys: raw.split('') });
  }
  explore(stepId: string, component: string) {
    this.log.append([
      {
        t: 'component_event',
        questionId: '1',
        stepId,
        component,
        name: 'explored',
        payload: { instanceId: stepId, why: 'tap', how: 'done' },
      },
    ]);
    return this.act({ type: 'gate_passed', stepId });
  }
  toS8(): this {
    this.choose('at_once');
    this.explore('boxes', 'GroupBoxes');
    this.type('120');
    this.explore('choice', 'ChoiceProduct');
    this.type('60');
    return this;
  }
  get items() {
    return this.state.items;
  }
}

const frac = (f: Fraction) => `${f[0]}/${f[1]}`;

/** A planner situation on a main step of question 1 (the shape of planner/rules.test.ts). */
function sit(key: string, o: Partial<Situation> = {}): Situation {
  return {
    trigger: 'clarify',
    exerciseId: ex.id,
    contentVersion: ex.contentVersion,
    questionId: '1',
    stack: [],
    depth: 0,
    detours: [],
    componentsShown: [],
    representationsTried: [],
    decisions: [],
    requests: [],
    declinedOffers: [],
    clarify: ['counting'],
    selfReports: [],
    skills: {},
    session: { selfReportsAsked: 0 },
    step: {
      key,
      scope: 'main',
      skills: [],
      wrong: 2,
      notSure: 1,
      struggle: 3,
      hintsUsed: 0,
      hintCount: 3,
      wrongValues: [],
      revealed: false,
    },
    question: {
      cleanStreak: 0,
      cleanStreakActed: false,
      selfReportsAsked: 0,
      compressOffered: false,
      compressed: false,
      transfersDone: [],
      variantsShown: [],
      deepDivesShown: [],
      exampleRounds: [],
      prerequisiteLevel: 0,
      teacherNotes: 0,
    },
    ...o,
  } as Situation;
}

describe('the main path is exactly what 4a left (Phase 4b adds nothing to it)', () => {
  it('the same fifteen steps in the same order', () => {
    expect(steps.map(s => s.id)).toEqual([
      's1',
      'urn',
      's2',
      'compare',
      's3',
      'boxes-intro',
      'boxes',
      's4',
      's5',
      'choice-intro',
      'choice',
      's6',
      's7',
      's8',
      's9',
    ]);
  });

  it('the student still acts on the same four questions and two gates: no interaction was added', () => {
    expect(
      steps
        .filter(s => s.kind === 'choice' || s.kind === 'typed')
        .map(s => s.id),
    ).toEqual(['s3', 's4', 's6', 's8']);
    expect(
      steps
        .filter(
          s =>
            s.kind === 'component' &&
            isGate(s.component.component, s.component.props),
        )
        .map(s => s.id),
    ).toEqual(['boxes', 'choice']);
  });

  it('s8 gained one procedure row and nothing else: three hints, the same answer call, the same wrong values', () => {
    const s8 = byId('s8');
    if (s8.kind !== 'typed') {
      throw new Error('s8 is typed');
    }
    expect((s8.procedures ?? []).map(p => p.id)).toEqual([
      'balls_in_event',
      'with_replacement',
      'earlier_result',
      'total_over_favourable',
    ]);
    expect(s8.hints).toHaveLength(3);
    expect(s8.answer).toMatchObject({
      type: 'fraction',
      compute: { fn: 'probability' },
    });
    expect((s8.wrongAnswers ?? []).map(w => w.value)).toEqual([
      '5/6',
      '1/12',
      '19/120',
    ]);
  });

  it('the version is 0.3.0 in the exercise and in every block it carries (Exercise 2 and 4 keep theirs, D23)', () => {
    expect(ex.contentVersion).toBe('exsc2-0.3.0');
    expect(JSON.stringify(exSc2)).not.toContain('exsc2-0.2.0');
    expect(JSON.stringify(exSc2Misconceptions)).not.toContain('exsc2-0.2.0');
    const ex2 = require('../../content/exercises/bac2022c-ex2.json');
    const ex4 = require('../../content/exercises/bac2022c-ex4.json');
    expect([ex2.contentVersion, ex4.contentVersion]).toEqual([
      'ex2-0.5.0',
      'ex4-0.1.0',
    ]);
  });

  it('everything new is unreviewed', () => {
    const trusts = JSON.stringify(exSc2).match(/"reviewed":(true|false)/g)!;
    expect(new Set(trusts)).toEqual(new Set(['"reviewed":false']));
    const mine =
      JSON.stringify(exSc2Misconceptions).match(/"reviewed":(true|false)/g) ??
      [];
    expect(mine.every(m => m === '"reviewed":false')).toBe(true);
  });
});

describe('dd_choose_bridge: the SlotsPattern bridge deep dive (priority pinned by array order)', () => {
  const dd = () => deepDive('dd_choose_bridge');

  it('is first in the deepDives array, on purpose: the order decides which tagged dive a clarify answer reaches', () => {
    expect(ex.deepDives.map(d => d.id)).toEqual([
      'dd_choose_bridge',
      'dd_count_draws',
      'dd_and_times',
      'dd_fav_total',
    ]);
    expect(content.menu.deepDivesAddressing('counting')).toEqual([
      'dd_choose_bridge',
      'dd_count_draws',
      'dd_fav_total',
    ]);
  });

  it('clarify "counting": at s6 the bridge, at s4 the boxes alternative (its own), at s8 its own deep dive', () => {
    const d6 = planner.decideSync(sit('1/s6'));
    expect(d6.ruleId).toBe(RULES.clarifyCounting);
    expect(d6.next).toEqual({
      kind: 'deep_dive',
      deepDiveId: 'dd_choose_bridge',
    });
    const d4 = planner.decideSync(sit('1/s4'));
    expect(d4.next).toEqual({ kind: 'variant', variantId: 'alt-1-s4-boxes' });
    const d8 = planner.decideSync(sit('1/s8'));
    expect(d8.next).toEqual({ kind: 'deep_dive', deepDiveId: 'dd_fav_total' });
  });

  it('shown once: the next "counting" at s6 moves on to the next tagged dive', () => {
    const shown = sit('1/s6');
    shown.question.deepDivesShown = ['dd_choose_bridge'];
    const d = planner.decideSync(shown);
    expect(d.next).toEqual({ kind: 'deep_dive', deepDiveId: 'dd_count_draws' });
  });

  it('the older deep dives keep their tags and their own step', () => {
    expect(deepDive('dd_count_draws').addresses).toEqual(['counting']);
    expect(deepDive('dd_and_times').addresses).toEqual(['why']);
    expect(deepDive('dd_fav_total').addresses).toEqual(['counting']);
    expect(content.menu.deepDiveOf('1/s6')).toBe('dd_and_times');
  });

  it('shape: a short text, then the one SlotsPattern bridge block, no mini question, all unreviewed', () => {
    const d = dd();
    expect(d.addresses).toEqual(['counting']);
    expect(d.mini).toBeUndefined();
    expect(d.blocks.map(b => b.type)).toEqual(['tutor_text', 'component']);
    const text = d.blocks[0];
    if (text?.type !== 'tutor_text') {
      throw new Error('first block is text');
    }
    const chars = (text.text.ar ?? []).reduce(
      (n, r) => n + ('ar' in r ? r.ar.length : 0),
      0,
    );
    expect(chars).toBeLessThanOrEqual(240);
    expect(d.trust).toMatchObject({
      reviewed: false,
      contentVersion: 'exsc2-0.3.0',
    });
  });

  it('its picture is valid: a bridge over the n balls of the small box, k >= 3, the coincidence guard on', () => {
    const comp = dd().blocks[1];
    if (comp?.type !== 'component') {
      throw new Error('second block is the picture');
    }
    expect(comp.spec.component).toBe('SlotsPattern');
    expect(resolveSpec(comp.spec, ex.experiment)).toMatchObject({ ok: true });
    const p = SlotsPatternPropsSchema.parse(comp.spec.props);
    expect(p.mode).toBe('bridge');
    expect(2 * p.k).not.toBe(p.n);
    expect(p.meantToDistinguish).toBe(true);
  });
});

/** Every value a student could meet as the answer, or as a slip, on s4, s6 and s8 (the A1 rule). */
function forbidden(): Fraction[] {
  const out: Fraction[] = [];
  for (const id of ['s4', 's6', 's8']) {
    const a = loaded.answers.get(`1/${id}`);
    if (a?.kind !== 'number') {
      throw new Error(`${id} has no number answer`);
    }
    out.push(a.value, ...(a.procedures ?? []).flatMap(p => p.values));
    const step = byId(id);
    if (step.kind === 'typed') {
      for (const w of step.wrongAnswers ?? []) {
        const p = parseNumeric(w.value);
        if (p.ok) {
          out.push(p.value);
        }
      }
    }
  }
  return out;
}
const isForbidden = (n: number | Fraction) =>
  forbidden().some(f => equals(f, typeof n === 'number' ? [n, 1] : n));

describe('twin numbers: nothing on screen is an answer or a known wrong value of s4, s6 or s8', () => {
  it('the check is real: the numbers of the exercise itself are caught', () => {
    for (const n of [120, 60, 720, 240, 48, 360]) {
      expect(isForbidden(n)).toBe(true);
    }
    expect(isForbidden([1, 2])).toBe(true);
    // the new slip of s8 (total over favourable) is one of them
    expect(isForbidden(2)).toBe(true);
  });

  it('the bridge: k, C(n,k) and n x k are clean; the only overlap is the index n - k = 4 of C(7,4) in the flip line', () => {
    const comp = deepDive('dd_choose_bridge').blocks[1];
    if (comp?.type !== 'component') {
      throw new Error('picture');
    }
    const p = SlotsPatternPropsSchema.parse(comp.spec.props);
    expect([p.n, p.k]).toEqual([7, 3]);
    for (const n of [p.k, choose(p.n, p.k), p.n * p.k]) {
      expect({ n, forbidden: isForbidden(n) }).toEqual({ n, forbidden: false });
    }
    // no (n, k) with n <= 7 has n - k clean as well (the forbidden set holds 2 and 4): this is the documented exception
    expect(isForbidden(p.n - p.k)).toBe(true);
    expect(p.n - p.k).toBe(4);
    // and the shown numbers are the A1 box's own: 7 balls, 3 red + 4 black, 35 boxes
    expect(choose(p.n, p.k)).toBe(35);
    expect(p.bridge?.balls.map(b => b.label)).toEqual([
      'R1',
      'R2',
      'R3',
      'N1',
      'N2',
      'N3',
      'N4',
    ]);
  });

  it('the bar of the s8 repair: 6 and 12 are clean; the ratio 2 is exactly the engine value of the slip it answers', () => {
    const v = variant('alt-1-s8-partwhole');
    const comp = v.intro.find(b => b.type === 'component');
    if (comp?.type !== 'component') {
      throw new Error('picture');
    }
    const m = partWholeModel(PartWholeBarPropsSchema.parse(comp.spec.props));
    expect(m.part).not.toBeNull();
    expect(isForbidden(m.whole)).toBe(false);
    expect(isForbidden(m.part!)).toBe(false);
    const ratio = div(m.part!, m.whole);
    const a = loaded.answers.get('1/s8');
    const slip =
      a?.kind === 'number'
        ? (a.procedures ?? []).find(x => x.id === 'total_over_favourable')
        : undefined;
    expect(slip?.values).toHaveLength(1);
    expect(equals(ratio, slip!.values[0]!)).toBe(true);
    expect(frac(ratio)).toBe('2/1');
  });

  it('the repair step is on the small box of the two pictures: 18 / 35, its slip 35 / 18, and none of it is a forbidden value', () => {
    const a = loaded.answers.get('var:alt-1-s8-partwhole');
    expect(a).toMatchObject({ kind: 'number', value: [18, 35] });
    const slips = (a?.kind === 'number' ? a.procedures ?? [] : []).map(p => [
      p.id,
      frac(p.values[0]!),
    ]);
    expect(slips).toEqual(
      expect.arrayContaining([['total_over_favourable', '35/18']]),
    );
    expect(isForbidden([18, 35])).toBe(false);
    expect(isForbidden([35, 18])).toBe(false);
  });

  it('the AI guard agrees: neither piece reveals the answer of the step it repairs; a bar of 60 would', () => {
    const comp = deepDive('dd_choose_bridge').blocks[1];
    if (comp?.type !== 'component') {
      throw new Error('picture');
    }
    expect(revealsAnswer(content, '1/s6', comp.spec)).toBeNull();
    const bar = variant('alt-1-s8-partwhole').intro.find(
      b => b.type === 'component',
    );
    if (bar?.type !== 'component') {
      throw new Error('picture');
    }
    expect(revealsAnswer(content, '1/s8', bar.spec)).toBeNull();
    // negative control: feedback of 60 over 6 writes 60, the answer of s6
    expect(
      revealsAnswer(content, '1/s6', {
        component: 'PartWholeBar',
        props: { whole: '6', mode: 'feedback', part: '60' },
      }),
    ).not.toBeNull();
  });
});

describe('probability_above_one: a probability written upside down is named, and repaired with the bar', () => {
  it('the misconception points at PartWholeBar, with its two lines and no digit in an Arabic run', () => {
    const m = loaded.misconceptions.get('probability_above_one');
    expect(m).toMatchObject({
      skillId: 'probability-by-counting',
      repairComponent: 'PartWholeBar',
    });
    expect(m?.feedback).toBeDefined();
    expect(m?.feedbackConfirmed).toBeDefined();
    expect(JSON.stringify([m?.feedback, m?.feedbackConfirmed])).not.toMatch(
      /[0-9]/,
    );
  });

  it('s8 names the slip: 120 / 60 = 2 comes from the engine as total_over_favourable', () => {
    const a = loaded.answers.get('1/s8');
    expect(a).toMatchObject({ kind: 'number', value: [1, 2] });
    const slips = (a?.kind === 'number' ? a.procedures ?? [] : []).map(p => [
      p.id,
      frac(p.values[0]!),
    ]);
    expect(slips).toEqual(
      expect.arrayContaining([['total_over_favourable', '2/1']]),
    );
  });

  it('typing 2 on s8 is diagnosed by the procedure, shows the line, and opens the bar repair (not the main path)', () => {
    const s = new Session().toS8();
    s.type('2');
    const answer = s.log
      .all()
      .filter(e => e.t === 'answer')
      .at(-1);
    expect(answer).toMatchObject({
      t: 'answer',
      correct: false,
      misconceptionId: 'probability_above_one',
      inferredBy: 'procedure',
    });
    expect(s.items.some(i => i.kind === 'feedback')).toBe(true);
    expect(JSON.stringify(s.items)).toContain('alt-1-s8-partwhole');
  });

  it('typing 120 / 60 (the same slip, as a fraction) is the same diagnosis', () => {
    const s = new Session().toS8();
    s.type('120/60');
    const answer = s.log
      .all()
      .filter(e => e.t === 'answer')
      .at(-1);
    expect(answer).toMatchObject({
      correct: false,
      misconceptionId: 'probability_above_one',
    });
  });

  it('the no-mistake path never meets it: the right answers finish the question at once', () => {
    const s = new Session().toS8();
    s.type('1/2');
    expect(s.state.finished).toBe(true);
    expect(JSON.stringify(s.items)).not.toContain('alt-1-s8-partwhole');
    expect(JSON.stringify(s.items)).not.toContain('dd_choose_bridge');
  });

  it('the repair: a PartWholeBar in feedback mode, then a typed probability with two hints and no \\val', () => {
    const v = variant('alt-1-s8-partwhole');
    expect(v).toMatchObject({
      kind: 'alternative',
      forSteps: ['1/s8'],
      representation: 'PartWholeBar',
      addresses: ['why'],
    });
    const comp = v.intro.find(b => b.type === 'component');
    if (comp?.type !== 'component') {
      throw new Error('picture');
    }
    expect(resolveSpec(comp.spec, v.experiment ?? ex.experiment)).toMatchObject(
      { ok: true },
    );
    expect(isGate('PartWholeBar', comp.spec.props)).toBe(false);
    expect(v.step.kind).toBe('typed');
    expect(v.step.kind === 'typed' ? v.step.hints : []).toHaveLength(2);
    expect(JSON.stringify(v.step)).not.toContain('\\\\val');
    expect(v.experiment).toMatchObject({ draw: 'simultaneous', k: 3 });
  });
});
