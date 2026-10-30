import type { CardOption } from '../content/schema';
import { evaluatorOf, validateCards } from './cards';

const card = (
  id: string,
  truth: 'true' | 'false',
  claim?: Record<string, string>,
): CardOption => ({
  id,
  text: { ar: [{ ar: 'x' }] },
  truth,
  ...(claim && { claim }),
});

describe('card evaluators', () => {
  it('pick: right or wrong, nothing else', () => {
    const e = evaluatorOf('pick')!;
    const cards = [card('a', 'true'), card('b', 'false')];
    expect(e({ card: cards[0]!, cards, args: {}, lines: {} })).toEqual({
      correct: true,
      notes: [],
    });
    expect(e({ card: cards[1]!, cards, args: {}, lines: {} }).correct).toBe(
      false,
    );
  });

  it('groups_claim: "always x2" on 3 balls out of 5 is predicted 30, counted 10', () => {
    const e = evaluatorOf('groups_claim')!;
    const cards = [
      card('x2', 'false', { predictsGroups: 'o/2' }),
      card('kf', 'true', { predictsGroups: 'o/f' }),
    ];
    const v = e({ card: cards[0]!, cards, args: { n: 5, k: 3 }, lines: {} });
    expect(v.correct).toBe(false);
    expect(v.notes[0]).toEqual({
      kind: 'claim_result',
      rows: [{ predicted: '30', actual: '10', holds: false }],
    });
    const ok = e({ card: cards[1]!, cards, args: { n: 5, k: 3 }, lines: {} });
    expect(ok.correct).toBe(true);
    expect(ok.notes[0]).toMatchObject({
      rows: [{ predicted: '10', actual: '10', holds: true }],
    });
  });

  it('an unknown evaluator is undefined (the loader refuses it)', () => {
    expect(evaluatorOf('nope')).toBeUndefined();
  });
});

describe('the loader asks the evaluator about the cards', () => {
  const claims = [
    card('two', 'false', { predictsGroups: 'o/2' }),
    card('k', 'false', { predictsGroups: 'o/k' }),
    card('fact', 'true', { predictsGroups: 'o/f' }),
  ];
  it('the over-general claims fail and the true one holds on 3 balls out of 5', () => {
    expect(validateCards('groups_claim', { n: 5, k: 3 }, claims)).toEqual([]);
  });

  it('the same cards on 3 balls taken 2 at a time do not falsify "always x2": refused', () => {
    const p = validateCards('groups_claim', { n: 3, k: 2 }, claims);
    expect(
      p.some(x => x.includes('two') && x.includes('does not falsify')),
    ).toBe(true);
  });

  it('k = n - 1 hides which was counted: refused', () => {
    const p = validateCards('groups_claim', { n: 4, k: 3 }, claims);
    expect(p.some(x => x.includes('k = n - 1'))).toBe(true);
  });

  it('a pick needs exactly one true card; an unknown evaluator is an error', () => {
    expect(
      validateCards('pick', {}, [card('a', 'true'), card('b', 'true')]),
    ).toEqual(['exactly one card must be true, found 2']);
    expect(validateCards('nope', {}, [])).toEqual(['unknown evaluator nope']);
  });
});
