import { createBudget } from './budget';

const ledger = (start: number) => {
  let v = start;
  return {
    get: () => v,
    add: (usd: number) => {
      v += usd;
    },
  };
};

describe('createBudget', () => {
  it('says which cap a call would cross', () => {
    const day = ledger(0.9);
    const b = createBudget({
      sessionCapUsd: 0.5,
      daily: { ledger: day, capUsd: 1 },
    });
    expect(b.capHit(0.05)).toBeNull();
    expect(b.capHit(0.2)).toBe('day');
    b.add(0.05);
    expect(day.get()).toBeCloseTo(0.95);
    expect(createBudget({ sessionCapUsd: 0.1 }).capHit(0.2)).toBe('question');
    expect(createBudget({ sessionCapUsd: 1 }).capHit(Number.NaN)).toBe(
      'question',
    );
  });
});
