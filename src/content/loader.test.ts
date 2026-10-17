import { runEngineCall } from '../engine/calls';
import { fractionToLatex, parseNumeric } from '../engine/format';
import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, stepKey, type LoadedExercise } from './loader';
import type { Rich } from './schema';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
type Raw = typeof ex2;

function load(raw: unknown = ex2): LoadedExercise {
  const r = loadExercise(raw, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}
const errorsOf = (raw: unknown) => {
  const r = loadExercise(raw, ex2Misconceptions);
  return r.ok ? [] : r.errors;
};
const steps = (raw: Raw) =>
  raw.parts[0]!.groups[0]!.steps as unknown as Record<string, unknown>[];

describe('engine calls', () => {
  it('rejects unknown functions and bad args without throwing', () => {
    expect(runEngineCall({ fn: 'eval', args: {} }, {})).toEqual({
      ok: false,
      error: 'unknown engine call eval',
    });
    expect(runEngineCall({ fn: 'choose', args: { n: 'x' } }, {}).ok).toBe(
      false,
    );
    expect(
      runEngineCall({ fn: 'count', args: { event: { id: 'all_equal' } } }, {})
        .ok,
    ).toBe(false);
  });
  it('computes C(5,2) and 1 − 2/5', () => {
    expect(runEngineCall({ fn: 'choose', args: { n: 5, k: 2 } }, {})).toEqual({
      ok: true,
      value: [10, 1],
    });
    expect(runEngineCall({ fn: 'oneMinus', args: { p: [2, 5] } }, {})).toEqual({
      ok: true,
      value: [3, 5],
    });
  });
});

describe('format', () => {
  it('formats fractions as LaTeX', () => {
    expect(fractionToLatex([7, 10])).toBe('\\frac{7}{10}');
    expect(fractionToLatex([3, 1])).toBe('3');
    expect(fractionToLatex([-1, 10])).toBe('-\\frac{1}{10}');
  });
  it('parses numeric input exactly and rejects the rest', () => {
    expect(parseNumeric('0,7')).toEqual({ ok: true, value: [7, 10] });
    expect(parseNumeric('1 - 3/10')).toEqual({ ok: true, value: [7, 10] });
    expect(parseNumeric('3/0')).toEqual({ ok: false, reason: 'not_a_number' });
    expect(parseNumeric('3/')).toEqual({ ok: false, reason: 'syntax' });
    expect(parseNumeric('x')).toEqual({ ok: false, reason: 'syntax' });
    expect(parseNumeric('alert(1)')).toEqual({ ok: false, reason: 'syntax' });
  });
});

describe('Exercise 2 question 1.b content', () => {
  const loaded = load();
  const q = loaded.exercise.parts[0]!;

  it('loads without errors', () => {
    expect(errorsOf(ex2)).toEqual([]);
  });

  it('gets every answer from the engine (EX2_PROBABILITY.md facts)', () => {
    expect(loaded.answers.get(stepKey.main('1b', 's3'))).toEqual({
      kind: 'option',
      optionId: 'none',
    });
    expect(loaded.answers.get(stepKey.main('1b', 's5'))).toEqual({
      kind: 'number',
      value: [3, 1],
    });
    expect(loaded.answers.get(stepKey.main('1b', 's7'))).toEqual({
      kind: 'option',
      optionId: 'p3_10',
    });
    expect(loaded.answers.get(stepKey.main('1b', 's8'))).toEqual({
      kind: 'number',
      value: [7, 10],
    });
    expect(loaded.answers.get(stepKey.mini('contraire_sens'))).toEqual({
      kind: 'number',
      value: [3, 5],
    });
    expect(loaded.answers.get(stepKey.mini('total_one'))).toEqual({
      kind: 'option',
      optionId: 'one',
    });
    // The deep dive has its own 3-ball urn (Phase 3 follow-up): C(3, 2) = 3.
    expect(loaded.answers.get(stepKey.mini('pairs_listing'))).toEqual({
      kind: 'number',
      value: [3, 1],
    });
  });

  it('substitutes engine values into math and the writeup', () => {
    expect(q.goal.math).toBe('p(B) = \\frac{7}{10}');
    const s6 = q.groups[0]!.steps.find(s => s.id === 's6') as { text: Rich };
    expect(s6.text.math).toBe('\\binom{5}{2} = 10');
    expect(q.writeup.modelFr[3]).toBe(
      'Par conséquent p(B) = 1 − p(B̄) = 1 − 3/10 = 7/10.',
    );
  });

  it('derives numeric option labels from their values', () => {
    const s7 = q.groups[0]!.steps.find(s => s.id === 's7');
    expect(s7?.kind === 'choice' && s7.options.map(o => o.label?.math)).toEqual(
      ['\\frac{3}{10}', '\\frac{3}{5}', '\\frac{7}{10}'],
    );
  });

  it('keeps every Arabic string unreviewed', () => {
    expect(JSON.stringify(ex2)).not.toContain('"reviewed":true');
  });
});

describe('loader rejects bad content', () => {
  it('when no option equals the engine value', () => {
    const raw = clone(ex2);
    const s7 = steps(raw)[6] as { options: { value?: string }[] };
    s7.options[0]!.value = '4/10';
    expect(errorsOf(raw)).toContain(
      '1b/s7: 0 options equal the engine value 3/10',
    );
  });
  it('when a known wrong answer equals the answer', () => {
    const raw = clone(ex2);
    (
      steps(raw)[4] as { wrongAnswers: { value: string }[] }
    ).wrongAnswers[0]!.value = '3';
    expect(errorsOf(raw)).toContain('1b/s5: wrong answer 3 equals the answer');
  });
  it('when a value or misconception is unknown', () => {
    const raw = clone(ex2);
    raw.parts[0]!.goal.math = 'p(B) = \\val{nope}';
    (
      steps(raw)[4] as { wrongAnswers: { misconceptionId?: string }[] }
    ).wrongAnswers[0]!.misconceptionId = 'ghost';
    expect(errorsOf(raw)).toEqual(
      expect.arrayContaining([
        'unknown value \\val{nope}',
        '1b/s5: unknown misconception ghost',
      ]),
    );
  });
  it('when a formula cannot be rendered natively', () => {
    const raw = clone(ex2);
    raw.parts[0]!.goal.math = '\\hologram{B}';
    expect(errorsOf(raw).join()).toContain('Unsupported command \\hologram');
  });
  it('when an asked step has no hint ladder', () => {
    const raw = clone(ex2);
    delete steps(raw)[2]!.hints;
    expect(errorsOf(raw)).toContain(
      '1b/s3: asked steps need at least one hint',
    );
  });
  it('when an engine call is unknown', () => {
    const raw = clone(ex2);
    (raw.values as Record<string, unknown>).pB = { fn: 'magic', args: {} };
    expect(errorsOf(raw)).toContain('values.pB: unknown engine call magic');
  });
});
