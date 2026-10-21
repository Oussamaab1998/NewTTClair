import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent } from '../../lesson/session/lesson';
import { answerTokensFor, mainStepOf, shownValues } from './shown';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const c1b = buildContent(r.loaded, '1b');
const c2a = buildContent(r.loaded, '2a');

describe('shownValues: only what the student has seen', () => {
  it('a later step answer is not shown yet; it is once that step is done', () => {
    // 1b/s7 (choice) has the answer 3/10 and shows 7/10 as an option;
    // 1b/s8 (typed) has the answer 7/10.
    const atS3 = shownValues(c1b, { stepKey: '1b/s3', hintsUsed: 0 });
    expect(atS3.has('3/10')).toBe(false);
    // The exam question itself says "Montrer que p(B) = 7/10".
    expect(atS3.has('7/10')).toBe(true);
    const atS8 = shownValues(c1b, { stepKey: '1b/s8', hintsUsed: 0 });
    expect(atS8.has('3/10')).toBe(true);
    // Shown at s7 as an option; at s8 the final-answer check still forbids it.
    expect(atS8.has('7/10')).toBe(true);
    expect([...answerTokensFor(c1b, '1b/s8').values]).toEqual(['7/10']);
  });

  it('the urn and the statement are always shown', () => {
    const s = shownValues(c2a, { stepKey: '2a/s6', hintsUsed: 0 });
    for (const v of ['-1/1', '0/1', '1/1', '2/1']) {
      expect(s.has(v)).toBe(true);
    }
  });

  it('earlier task answers count as shown (solved or revealed)', () => {
    // 2a/s10 (X = 0): 7 draws, 7/10; done before 2a/s15.
    const s = shownValues(c2a, { stepKey: '2a/s15', hintsUsed: 0 });
    expect(s.has('7/10')).toBe(true);
    expect(
      shownValues(c2a, { stepKey: '2a/s10', hintsUsed: 0 }).has('7/10'),
    ).toBe(false);
  });

  it('a mini or variant step maps to its parent main step', () => {
    expect(mainStepOf(c1b, 'dd:au_moins_contraire')).toBe('1b/s3');
    expect(mainStepOf(c1b, '1b/s5')).toBe('1b/s5');
    expect(mainStepOf(c1b, 'nope')).toBeNull();
  });
});

describe('answerTokensFor: the answer in every form', () => {
  it('a choice label: numbers always on screen (urn, goal) are not giveaways', () => {
    // 1b/s3 answer label: "aucune des deux boules ne porte le numéro 0"; 0 is a ball.
    expect([...answerTokensFor(c1b, '1b/s3').values]).toEqual([]);
  });

  it('a typed step: its value; a choice: the correct label', () => {
    expect([...answerTokensFor(c1b, '1b/s5').values]).toEqual(['3/1']);
    expect(answerTokensFor(c1b, '1b/s3').texts[0]).toContain(
      'aucune des deux boules',
    );
  });

  it('EventPicker: favorable outcome ids, count and probability', () => {
    const t = answerTokensFor(c2a, '2a/s10');
    expect(t.ids).toEqual(['a-b', 'a-c', 'b-c', 'b-d', 'b-e', 'c-d', 'c-e']);
    expect([...t.values]).toEqual(['7/1', '7/10']);
  });

  it('EventPicker with a count equal to a ball number: the count alone is not a giveaway', () => {
    // 2a/s15 (X = -2): 1 favorable draw; "1" is also a ball on the urn.
    const t = answerTokensFor(c2a, '2a/s15');
    expect([...t.values]).toEqual(['1/10']);
    expect(t.ids).toHaveLength(1);
  });

  it('LawBuilder: every cell of the law', () => {
    expect([...answerTokensFor(c2a, '2a/s18').values].sort()).toEqual([
      '1/10',
      '7/10',
    ]);
  });
});
