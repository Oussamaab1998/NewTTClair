/**
 * Phase 4a: the two pictures on the main path of question 1 of
 * bac2022c-sc-ex2 (docs/COMPONENTS_PROBABILITY_V2_DECISIONS.md, change 1):
 * GroupBoxes before s4 and ChoiceProduct before s6, each a predict-first
 * step on a twin urn (3 red, 4 black) so that no answer is on screen before
 * its question; s4 and s6 hints with the meaning first and the notation
 * last, every value from the engine.
 */
// Frozen copy of question 1 as it was in exsc2-0.3.0 (before the method-lesson slice, docs/METHOD_LESSON_PROGRESS.md). Its assertions are unchanged; the live content has its own tests (scEx2.method.test.ts).
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import exSc2 from '../../content/fixtures/scEx2.v030.json';
import exSc2Misconceptions from '../../content/fixtures/scEx2Misconceptions.v030.json';
import { ComponentHost } from '../../components/ComponentHost';
import type { ComponentEvent, ComponentSpec } from '../../components/contract';
import { boxesModel, choiceModel } from '../../components/probability2/logic';
import {
  ChoiceProductPropsSchema,
  GroupBoxesPropsSchema,
} from '../../components/probability2/schemas';
import { componentKind, isGate, resolveSpec } from '../../components/registry';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { SKILLS } from '../../content/skills';
import { parseNumeric } from '../../engine/format';
import { equals, type Fraction } from '../../engine/rational';
import { revealsAnswer } from '../../planner/llm/revealing';
import { createRulesPlanner } from '../../planner/rules';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson, type LessonContent } from './lesson';
import { stepSync } from './orchestrate';
import { actionsFromEvents } from './replay';
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
const specOf = (id: string): ComponentSpec => {
  const s = byId(id);
  if (s.kind !== 'component') {
    throw new Error(`${id} is not a component step`);
  }
  return s.component;
};

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

class Session {
  readonly content: LessonContent = buildContent(loaded, '1');
  readonly log = new EventLog(
    {
      sessionId: 'sess-pic',
      studentId: 'anon-1',
      exerciseId: ex.id,
      contentVersion: ex.contentVersion,
    },
    fixedClock(),
  );
  state: LessonState;
  private t = 0;
  private readonly planner = createRulesPlanner(this.content.menu);
  constructor() {
    const r = startLesson(this.content);
    this.state = r.state;
    this.log.append(r.events);
  }
  act(action: ActionInput): Event[] {
    this.t += 1500;
    const before = this.log.all().length;
    this.state = stepSync(
      this.content,
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
  /** What the screen does for a gate component: log its `explored`, then the lesson goes on. */
  explore(stepId: string, component: string, how: 'done' | 'skipped' = 'done') {
    this.log.append([
      {
        t: 'component_event',
        questionId: '1',
        stepId,
        component,
        name: 'explored',
        payload: {
          instanceId: stepId,
          why: how === 'done' ? 'tap' : 'reveal',
          how,
        },
      },
    ]);
    return this.act({
      type: 'gate_passed',
      stepId,
      ...(how === 'skipped' && { how: 'skipped' as const }),
    });
  }
  /** Id of the open question card, or of the step the lesson waits on. */
  where(): string {
    if (this.state.gate) {
      return `gate:${this.state.gate.stepId}`;
    }
    const c = this.state.items.at(-1);
    if (c?.kind !== 'question' || c.ref.scope !== 'main') {
      throw new Error(`last item is ${c?.kind}`);
    }
    return c.ref.stepId;
  }
  get items() {
    return this.state.items;
  }
}

const frac = (f: Fraction) => `${f[0]}/${f[1]}`;

describe('the two pictures are main-path steps, before s4 and before s6', () => {
  it('order of the steps of question 1', () => {
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

  it('both are visuals that hold the lesson (explored gate), with no hints and no answer', () => {
    for (const id of ['boxes', 'choice']) {
      const spec = specOf(id);
      expect(componentKind(spec)).toBe('visual');
      expect(isGate(spec.component)).toBe(true);
      expect(resolveSpec(spec, ex.experiment)).toMatchObject({ ok: true });
      const s = byId(id);
      expect('hints' in s).toBe(false);
      expect('answer' in s).toBe(false);
    }
    expect(specOf('boxes').component).toBe('GroupBoxes');
    expect(specOf('choice').component).toBe('ChoiceProduct');
  });

  it('the version is 0.3.0 after Stop 2 (0.2.0 was 4a), in the exercise and in every block it carries', () => {
    expect(ex.contentVersion).toBe('exsc2-0.3.0');
    expect(JSON.stringify(exSc2)).not.toContain('exsc2-0.1.0');
    expect(JSON.stringify(exSc2Misconceptions)).not.toContain('exsc2-0.1.0');
    expect(JSON.stringify(exSc2)).not.toContain('exsc2-0.2.0');
    expect(JSON.stringify(exSc2Misconceptions)).not.toContain('exsc2-0.2.0');
  });

  it('the older exercises keep their versions (D23)', () => {
    const ex2 = require('../../content/exercises/bac2022c-ex2.json');
    const ex4 = require('../../content/exercises/bac2022c-ex4.json');
    expect(ex2.contentVersion).toBe('ex2-0.5.0');
    expect(ex4.contentVersion).toBe('ex4-0.1.0');
  });

  it('the new skills are in the skill map and taught by the new steps', () => {
    expect(SKILLS.has('ordering-vs-choosing')).toBe(true);
    expect(SKILLS.has('choices-and-product')).toBe(true);
    for (const id of ['boxes-intro', 'boxes', 'choice-intro', 'choice']) {
      for (const skill of byId(id).skills) {
        expect(SKILLS.has(skill)).toBe(true);
      }
    }
  });

  it('everything is unreviewed', () => {
    expect(ex.reviewed).toBe(false);
    const trusts = JSON.stringify(exSc2).match(/"reviewed":(true|false)/g)!;
    expect(new Set(trusts)).toEqual(new Set(['"reviewed":false']));
  });
});

describe('twin urns: no number on screen is an answer or a known wrong value of s4, s6 or s8', () => {
  /** Every value a student could meet as the answer, or as a slip, on s4, s6 and s8. */
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

  const shown = () => {
    const b = GroupBoxesPropsSchema.parse(specOf('boxes').props);
    const c = ChoiceProductPropsSchema.parse(specOf('choice').props);
    const bm = boxesModel(b);
    const cm = choiceModel(c);
    return {
      boxes: [bm.boxes, bm.perBox, bm.ordered],
      choice: [...cm.counts, cm.product, cm.sum],
    };
  };

  it('both pictures use the same small box: 3 red and 4 black balls', () => {
    const b = GroupBoxesPropsSchema.parse(specOf('boxes').props);
    const c = ChoiceProductPropsSchema.parse(specOf('choice').props);
    expect(b.balls.filter(x => x.color === 'red')).toHaveLength(3);
    expect(b.balls.filter(x => x.color === 'black')).toHaveLength(4);
    expect(b.k).toBe(3);
    expect(c.stages.map(s => [s.balls?.length, s.size])).toEqual([
      [3, 1],
      [4, 2],
    ]);
  });

  it('the numbers of the pictures: 35 boxes x 6 = 210; 3 x 6 = 18 (and 3 + 6 = 9)', () => {
    expect(shown()).toEqual({ boxes: [35, 6, 210], choice: [3, 6, 18, 9] });
  });

  it('none of them equals a forbidden value', () => {
    const bad = forbidden();
    const all = [...shown().boxes, ...shown().choice];
    for (const n of all) {
      expect(bad.some(f => equals(f, [n, 1]))).toBe(false);
    }
    // the check is real: the numbers of the exercise's own urn would be caught
    expect(bad.some(f => equals(f, [120, 1]))).toBe(true);
    expect(bad.some(f => equals(f, [60, 1]))).toBe(true);
  });

  it('the AI guard agrees: neither picture reveals the answer of the step it comes before; the real urn would', () => {
    const boxes = specOf('boxes');
    const choice = specOf('choice');
    expect(revealsAnswer(new Session().content, '1/s4', boxes)).toBeNull();
    expect(revealsAnswer(new Session().content, '1/s6', choice)).toBeNull();
    // negative controls: the same components on the exercise's own urn
    const real = (n: number, r: number) => [
      ...Array.from({ length: r }, (_, i) => ({
        id: `r${i + 1}`,
        value: 1,
        color: 'red',
      })),
      ...Array.from({ length: n }, (_, i) => ({
        id: `n${i + 1}`,
        value: 0,
        color: 'black',
      })),
    ];
    expect(
      revealsAnswer(new Session().content, '1/s4', {
        component: 'GroupBoxes',
        props: { balls: real(6, 4), k: 3 },
      }),
    ).not.toBeNull();
    expect(
      revealsAnswer(new Session().content, '1/s6', {
        component: 'ChoiceProduct',
        props: {
          stages: [
            { balls: real(0, 4), size: 1 },
            { balls: real(6, 0), size: 2 },
          ],
        },
      }),
    ).not.toBeNull();
  });
});

describe('hints: the picture and the grouping first, the notation last, values from the engine', () => {
  const raw = (id: string) => {
    const s = (
      exSc2.parts[0]!.groups[0]!.steps as {
        id: string;
        hints?: { math?: string; ar?: unknown }[];
      }[]
    ).find(x => x.id === id)!;
    return s.hints!;
  };
  const loadedHints = (id: string) => {
    const s = byId(id);
    return s.kind === 'typed' ? s.hints ?? [] : [];
  };

  it('s4: three hints; the first has words only, the notation is in the last one and only there', () => {
    const h = loadedHints('s4');
    expect(h).toHaveLength(3);
    expect(h[0]!.math).toBeUndefined();
    expect(h.slice(0, 2).some(x => /C_|binom/.test(x.math ?? ''))).toBe(false);
    expect(h[2]!.math).toMatch(/^C_\{10\}\^\{3\} = /);
  });

  it('s4: the last hint is written from the engine values (nOrd = 720, perBox = 6)', () => {
    expect(loadedHints('s4')[2]!.math).toBe('C_{10}^{3} = \\frac{720}{6}');
    expect(raw('s4')[2]!.math).toBe(
      'C_{10}^{3} = \\frac{\\val{nOrd}}{\\val{perBox}}',
    );
    expect(loaded.values.get('perBox')).toEqual([6, 1]);
  });

  it('s6: the picture and the pair list first, then "and means multiply", the printed C(6,2) = 15 last', () => {
    const h = loadedHints('s6');
    expect(h).toHaveLength(3);
    expect(h[0]!.math).toBeUndefined();
    expect(h[1]!.math).toBeUndefined();
    expect(h[2]!.math).toBe('C_{6}^{2} = 15');
    expect(raw('s6')[2]!.math).toBe('C_{6}^{2} = \\val{c62}');
    expect(JSON.stringify(h.slice(0, 2))).not.toMatch(/15/);
  });

  it('no digits are typed into a hint formula that the engine can give', () => {
    for (const id of ['s4', 's6']) {
      const last = raw(id)[2]!.math!;
      expect(last).toMatch(/\\val\{/);
      // the operands of the notation (C_{10}^{3}) are the question's own; every computed number is a \val
      const rest = last
        .replace(/\\val\{[A-Za-z0-9]+\}/g, '')
        .replace(/C_\{\d+\}\^\{\d+\}/g, '');
      expect(rest.match(/\d{2,}/)).toBeNull();
    }
  });

  it('the textbook form C_n^k everywhere in question 1: no \\binom left', () => {
    expect(JSON.stringify(exSc2)).not.toContain('binom');
    const s5 = byId('s5');
    expect(s5.kind === 'math' && s5.latex).toBe('C_{10}^{3} = 120');
  });
});

describe('the new wrong values are named', () => {
  const answerOf = (s: Session) =>
    s.log
      .all()
      .filter(e => e.t === 'answer')
      .at(-1);
  const lineFor = (s: Session) => s.items.some(i => i.kind === 'feedback');

  function toS4(): Session {
    const s = new Session();
    s.choose('at_once');
    s.explore('boxes', 'GroupBoxes');
    expect(s.where()).toBe('s4');
    return s;
  }

  it('240 = 720 / 3 (the balls in a box, not the orderings) is divides_by_balls_not_orderings, with its line', () => {
    const s = toS4();
    s.type('240');
    expect(answerOf(s)).toMatchObject({
      t: 'answer',
      correct: false,
      misconceptionId: 'divides_by_balls_not_orderings',
      inferredBy: 'procedure',
    });
    expect(lineFor(s)).toBe(true);
  });

  it('48 = 4 x 12 (C(6,2) read as 6 x 2) is reads_choose_as_product', () => {
    const s = toS4();
    s.type('120');
    s.explore('choice', 'ChoiceProduct');
    expect(s.where()).toBe('s6');
    s.type('48');
    expect(answerOf(s)).toMatchObject({
      t: 'answer',
      correct: false,
      misconceptionId: 'reads_choose_as_product',
    });
  });

  it('720 keeps its authored line (a valid ordered count) and now offers the boxes', () => {
    const s = toS4();
    s.type('720');
    expect(answerOf(s)).toMatchObject({
      correct: false,
      misconceptionId: 'counts_ordered_draws',
    });
    expect(JSON.stringify(s.items)).toContain('alt-1-s4-boxes');
  });
});

describe('repair alternatives for the new components', () => {
  const variant = (id: string) => ex.variants.find(v => v.id === id)!;

  it('alt-1-s4-boxes: 4 balls, 3 at once: 4 boxes; 24 / 3 = 8 is a named slip', () => {
    const v = variant('alt-1-s4-boxes');
    expect(v).toMatchObject({
      kind: 'alternative',
      forSteps: ['1/s4'],
      representation: 'GroupBoxes',
    });
    const a = loaded.answers.get('var:alt-1-s4-boxes');
    expect(a).toMatchObject({ kind: 'number', value: [4, 1] });
    const slips = (a?.kind === 'number' ? a.procedures ?? [] : []).map(p => [
      p.id,
      frac(p.values[0]!),
    ]);
    expect(slips).toEqual(
      expect.arrayContaining([
        ['ordered_draw', '24/1'],
        ['ordered_divided_by_k', '8/1'],
      ]),
    );
  });

  it('alt-1-s6-choice: 2 red and 4 black, exactly one red: 2 x 6 = 12', () => {
    const v = variant('alt-1-s6-choice');
    expect(v).toMatchObject({
      kind: 'alternative',
      forSteps: ['1/s6'],
      representation: 'ChoiceProduct',
    });
    expect(loaded.answers.get('var:alt-1-s6-choice')).toMatchObject({
      kind: 'number',
      value: [12, 1],
    });
  });

  it('their pictures are valid and use their own urn', () => {
    for (const id of ['alt-1-s4-boxes', 'alt-1-s6-choice']) {
      const v = variant(id);
      const comp = v.intro.find(b => b.type === 'component');
      expect(comp).toBeDefined();
      if (comp?.type === 'component') {
        expect(
          resolveSpec(comp.spec, v.experiment ?? ex.experiment),
        ).toMatchObject({ ok: true });
      }
    }
  });

  it('the misconceptions point at the pictures', () => {
    const m = (id: string) => loaded.misconceptions.get(id);
    expect(m('counts_ordered_draws')?.repairComponent).toBe('GroupBoxes');
    expect(m('divides_by_balls_not_orderings')?.repairComponent).toBe(
      'GroupBoxes',
    );
    expect(m('adds_instead_of_multiplying')?.repairComponent).toBe(
      'ChoiceProduct',
    );
    expect(m('wrong_group_size')?.repairComponent).toBe('ChoiceProduct');
    expect(m('reads_choose_as_product')?.repairComponent).toBe('ChoiceProduct');
  });
});

describe('the no-mistake path of question 1: interactions before and after', () => {
  /** Presses until the component emits `explored`; the number of presses is its cost. */
  async function tapsToGate(
    spec: ComponentSpec,
    presses: string[],
  ): Promise<number> {
    const events: ComponentEvent[] = [];
    await render(
      <ComponentHost
        spec={spec}
        defaultInstanceId="g"
        mode="interactive"
        onEvent={e => events.push(e)}
        onError={() => undefined}
      />,
    );
    for (let i = 0; i < presses.length; i++) {
      await fireEvent.press(screen.getByTestId(presses[i]!));
      if (events.some(e => e.name === 'explored')) {
        return i + 1;
      }
    }
    throw new Error('the gate never opened');
  }

  it('before: 4 (a choice and three typed answers); after: 7, so +3 (the box tap and the two picks)', async () => {
    const asked = steps.filter(s => s.kind === 'choice' || s.kind === 'typed');
    expect(asked.map(s => s.id)).toEqual(['s3', 's4', 's6', 's8']);
    const boxTaps = await tapsToGate(specOf('boxes'), [
      'group-next',
      'group-next',
    ]);
    const choiceTaps = await tapsToGate(specOf('choice'), [
      'choice-option-0-0',
      'choice-option-1-0',
      'choice-option-1-1',
    ]);
    expect([boxTaps, choiceTaps]).toEqual([1, 2]);
    const before = asked.length;
    const after = before + boxTaps + choiceTaps;
    expect([before, after, after - before]).toEqual([4, 7, 3]);
  });

  it('played as a student would: the lesson waits at each picture and only moves on at its gate', () => {
    const s = new Session();
    expect(s.where()).toBe('s3');
    s.choose('at_once');
    expect(s.where()).toBe('gate:boxes');
    s.explore('boxes', 'GroupBoxes');
    expect(s.where()).toBe('s4');
    s.type('120');
    expect(s.where()).toBe('gate:choice');
    s.explore('choice', 'ChoiceProduct');
    expect(s.where()).toBe('s6');
    s.type('60');
    expect(s.where()).toBe('s8');
    const ev = s.type('1/2');
    expect(s.state.finished).toBe(true);
    // the bar now counts the gates: s3, boxes, s4, choice, s6, s8
    expect(ev.find(e => e.t === 'part_done')).toMatchObject({
      counted: 6,
      answered: 6,
      revealed: 0,
    });
  });

  it('a student who uses the escape on both pictures: the lesson goes on, and the steps count as revealed', () => {
    const s = new Session();
    s.choose('at_once');
    s.explore('boxes', 'GroupBoxes', 'skipped');
    expect(s.where()).toBe('s4');
    s.type('120');
    s.explore('choice', 'ChoiceProduct', 'skipped');
    s.type('60');
    const ev = s.type('1/2');
    expect(ev.find(e => e.t === 'part_done')).toMatchObject({
      counted: 6,
      answered: 4,
      revealed: 2,
    });
  });

  it('replays from the log to the same feed, with the escape recorded', () => {
    const s = new Session();
    s.choose('at_once');
    s.explore('boxes', 'GroupBoxes', 'skipped');
    s.type('120');
    s.explore('choice', 'ChoiceProduct');
    s.type('60');
    s.type('1/2');
    const replay = new Session();
    for (const a of actionsFromEvents(s.log.all())) {
      replay.act(a);
    }
    expect(replay.state.items).toEqual(s.state.items);
    expect(replay.state.skippedGates).toEqual(['boxes']);
  });
});
