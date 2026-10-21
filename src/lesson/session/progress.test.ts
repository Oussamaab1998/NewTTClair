import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import type { Step } from '../../content/schema';
import { buildContent, startLesson } from './lesson';
import { countsForProgress, mainProgress } from './progress';
import type { Frame } from './types';

const step = (id: string, kind: string, extra: object = {}) =>
  ({ id, kind, ...extra } as unknown as Step);
const component = (id: string, name: string, extra: object = {}) =>
  step(id, 'component', {
    component: { component: name, props: {} },
    ...extra,
  });

// text, choice | math, gate | typed, visual, optional task, task
const groups = [
  { steps: [step('t1', 'text'), step('q1', 'choice')] },
  { steps: [step('m1', 'math'), component('p1', 'PredictReveal')] },
  {
    steps: [
      step('q2', 'typed'),
      component('u1', 'Urn'),
      component('l1', 'LawBuilder', { optional: true }),
      component('e1', 'EventPicker'),
    ],
  },
];
const frameAt = (stepId: string) => ({ stepId } as Frame);
const at = (group: number, s: number) => ({
  cursor: { group, step: s },
  stack: [] as Frame[],
  finished: false,
});

describe('countsForProgress', () => {
  it('questions, lines, tasks and gates count; explanations and optional practice do not', () => {
    expect(
      [
        step('a', 'choice'),
        step('b', 'typed'),
        step('c', 'lines'),
        component('d', 'EventPicker'),
        component('e', 'PredictReveal'),
      ].every(countsForProgress),
    ).toBe(true);
    expect(
      [
        step('f', 'text'),
        step('g', 'math'),
        component('h', 'Urn'),
        component('i', 'LawBuilder', { optional: true }),
      ].some(countsForProgress),
    ).toBe(false);
  });
});

describe('mainProgress', () => {
  it('counts only the acting steps passed; the total leaves out optional ones', () => {
    expect(mainProgress(groups, at(0, 1))).toEqual({ passed: 0, total: 4 });
    expect(mainProgress(groups, at(0, 2))).toEqual({ passed: 1, total: 4 });
    expect(mainProgress(groups, at(2, 1))).toEqual({ passed: 3, total: 4 });
    // Past the optional practice and the visual: nothing new counted.
    expect(mainProgress(groups, at(2, 3))).toEqual({ passed: 3, total: 4 });
  });

  it('the open step (active card or gate) is not passed yet', () => {
    expect(
      mainProgress(groups, { ...at(0, 2), stack: [frameAt('q1')] }),
    ).toEqual({ passed: 0, total: 4 });
    expect(
      mainProgress(groups, { ...at(1, 2), gate: { stepId: 'p1' } }).passed,
    ).toBe(1);
    // An open optional task was never counted, so nothing is taken off.
    expect(
      mainProgress(groups, { ...at(2, 3), stack: [frameAt('l1')] }).passed,
    ).toBe(3);
  });

  it('a finished part is full; a part with nothing to do is 0 / 0', () => {
    expect(mainProgress(groups, { ...at(3, 0), finished: true })).toEqual({
      passed: 4,
      total: 4,
    });
    expect(mainProgress([{ steps: [step('t', 'text')] }], at(1, 0))).toEqual({
      passed: 0,
      total: 0,
    });
  });
});

describe('the real parts', () => {
  const load = (json: unknown, misconceptions: unknown): LoadedExercise => {
    const r = loadExercise(json, misconceptions);
    if (!r.ok) {
      throw new Error(r.errors.join('\n'));
    }
    return r.loaded;
  };
  const start = (loaded: LoadedExercise, part: string) => {
    const content = buildContent(loaded, part);
    return mainProgress(content.question.groups, startLesson(content).state);
  };

  it('A1: 4 acting steps, the bar starts at 0', () => {
    expect(start(load(ex4, ex4Misconceptions), 'A1')).toEqual({
      passed: 0,
      total: 4,
    });
  });

  // 2.a: typed, choice, 4 EventPicker, typed sum. Its LawBuilders do not count:
  // the progressive table is a visual, the full-table practice is optional.
  it('1.b: 4; 2.a: 7', () => {
    const loaded = load(ex2, ex2Misconceptions);
    expect(start(loaded, '1b')).toEqual({ passed: 0, total: 4 });
    expect(start(loaded, '2a')).toEqual({ passed: 0, total: 7 });
  });
});
