/**
 * B4 (round 2, 2026-10-22): a guided walk-through never states the step's
 * answer (rule 6: the final value is the student's to type). Every line is
 * checked like an AI answer: values (digits and words), the answer's words
 * and authored phrases, and formulas that evaluate to it.
 */
import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from '../content/loader';
import { checkWalkthroughs } from './walkthroughCheck';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const checked = (raw: unknown, lib: unknown) => {
  const r = loadExercise(raw, lib);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return checkWalkthroughs(r.loaded);
};
type Walk = { walkthrough?: { lines: Record<string, unknown>[] } };
const s5 = (raw: typeof ex2) =>
  raw.parts[0]!.groups[0]!.steps.find(s => s.id === 's5') as unknown as Walk;

describe('walk-through lines never state the answer', () => {
  it('the authored walk-throughs pass (Ex 2 and Ex 4)', () => {
    expect(checked(ex2, ex2Misconceptions)).toEqual([]);
    expect(checked(ex4, ex4Misconceptions)).toEqual([]);
  });

  it('three are authored, 2 lines by default and 3 only where needed', () => {
    const transfer = ex2.variants.find(v => v.id === 'tr-1b-s5-noneg')!
      .step as unknown as Walk;
    const s8 = ex2.parts[0]!.groups[0]!.steps.find(
      s => s.id === 's8',
    ) as unknown as Walk;
    expect(s5(ex2).walkthrough?.lines).toHaveLength(2);
    expect(s8.walkthrough?.lines).toHaveLength(2);
    expect(transfer.walkthrough?.lines).toHaveLength(3);
  });

  it.each([
    ['a digit', { math: '3' }],
    ['a number word', { ar: [{ ar: 'تلقى ثلاثة تيراجات.' }] }],
    ['a formula worth the answer', { math: '\\binom{3}{2}' }],
  ])('rejects a line with %s (1b/s5, answer 3)', (_what, line) => {
    const raw = clone(ex2);
    s5(raw).walkthrough!.lines[1] = line;
    expect(checked(raw, ex2Misconceptions)).toEqual([
      '1b/s5: walk-through line 2 states the answer',
    ]);
  });
});
