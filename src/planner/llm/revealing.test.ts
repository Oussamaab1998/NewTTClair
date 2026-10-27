import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent } from '../../lesson/session/lesson';
import { revealingNotes, revealsAnswer } from './revealing';

const load = (raw: unknown, mis: unknown) => {
  const r = loadExercise(raw, mis);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
};
const c1b = buildContent(load(ex2, ex2Misconceptions), '1b');
const c2a = buildContent(load(ex2, ex2Misconceptions), '2a');
const cA1 = buildContent(load(ex4, ex4Misconceptions), 'A1');
const spec = (component: string, props: Record<string, unknown> = {}) => ({
  component,
  props,
});
const zero = { id: 'any_value', args: { value: 0 } };

describe('components that show the answer by construction (derived from the answer)', () => {
  it.each([
    // 2.a/s9: the values of X -> every product coloured by value; the law chart.
    [c2a, '2a/s9', spec('OutcomeSpace', { valueFn: 'product', colorBy: 'value' }), true],
    [c2a, '2a/s9', spec('OutcomeSpace', { valueFn: 'product', colorBy: 'none' }), false],
    [c2a, '2a/s9', spec('LawChart', { valueFn: 'product' }), true],
    // 2.a sum: the law chart checks the sum is 1.
    [c2a, '2a/sum', spec('LawChart', { valueFn: 'product' }), true],
    // 2.a/s6: how many draws -> the outcome space shows its count unless told not to.
    [c2a, '2a/s6', spec('OutcomeSpace', {}), true],
    [c2a, '2a/s6', spec('OutcomeSpace', { showCount: false }), false],
    // 1.b/s5: draws with no 0 -> the space coloured by the event (or its complement) with a count.
    [c1b, '1b/s5', spec('OutcomeSpace', { colorBy: 'event', event: zero }), true],
    [c1b, '1b/s5', spec('OutcomeSpace', { colorBy: 'event', event: zero, showCount: false }), false],
    // 1.b/s8: p(B) -> the complement bar shows both probabilities.
    [c1b, '1b/s8', spec('ComplementView', { event: zero }), true],
    [c1b, '1b/s8', spec('ComplementView', { event: { id: 'any_value', args: { value: 2 } } }), false],
    // 2.a/s10 (EventPicker X = 0): products coloured by value show which draws give 0.
    [c2a, '2a/s10', spec('OutcomeSpace', { valueFn: 'product', colorBy: 'value' }), true],
    [c2a, '2a/s10', spec('Urn', { mode: 'select' }), false],
    // Inside a container too.
    [c2a, '2a/sum', spec('PredictReveal', { reveal: spec('LawChart', {}) }), true],
    // A1/s9: nothing of this kind.
    [cA1, 'A1/s9', spec('FoldSymmetry', { fn: 'f_ex4' }), false],
  ])('%#: %s', (content, key, s, expected) => {
    expect(revealsAnswer(content, key as string, s) !== null).toBe(expected);
  });

  it('notes for the per-step pack say what not to show', () => {
    expect(revealingNotes(c2a, '2a/sum').join(' ')).toMatch(/LawChart/);
    expect(revealingNotes(c2a, '2a/s9').join(' ')).toMatch(
      /OutcomeSpace with colorBy "value"/,
    );
    expect(revealingNotes(cA1, 'A1/s9')).toEqual([]);
  });
});

describe('values a component displays, compared with the answer (engine)', () => {
  it.each([
    // LawChart shows p(X = 0) = 7/10: the answer of 2.a/s10 (X = 0) and of 1.b/s8 (p(B)).
    [c2a, '2a/s10', spec('LawChart', { valueFn: 'product' }), true],
    [c1b, '1b/s8', spec('LawChart', { valueFn: 'product' }), true],
    // No value of the answer on screen.
    [c1b, '1b/s3', spec('LawChart', { valueFn: 'product' }), false],
    [c2a, '2a/s10', spec('OutcomeSpace', { showCount: false }), false],
  ])('%#: %s', (content, key, s, expected) => {
    expect(revealsAnswer(content, key as string, s) !== null).toBe(expected);
  });
});

