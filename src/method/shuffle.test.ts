import type { PlanCardRef } from '../content/schema';
import { checkPlan } from './frame';
import { seededOrder } from './shuffle';

const r = (t: string) => ({ ar: [{ ar: t }] });
const h = { now: r('a'), why: r('b'), next: r('c') };
const cards: PlanCardRef[] = [
  {
    id: 'c_total',
    key: 'total',
    short: r('1'),
    text: r('1'),
    header: h,
    needs: [],
  },
  {
    id: 'c_fav',
    key: 'fav',
    short: r('2'),
    text: r('2'),
    header: h,
    needs: [],
  },
  {
    id: 'c_ratio',
    key: 'ratio',
    short: r('3'),
    text: r('3'),
    header: h,
    needs: ['c_total', 'c_fav'],
  },
];
const ids = cards.map(c => c.id);
const valid = (o: readonly string[]) => checkPlan(cards, o).ok;

describe('the plan cards are shown in a seeded, shuffled order', () => {
  it('is a permutation, the same for the same key, other for another key', () => {
    const a = seededOrder(ids, 'q1/m1.plan');
    expect([...a].sort()).toEqual([...ids].sort());
    expect(seededOrder(ids, 'q1/m1.plan')).toEqual(a);
    const others = new Set(
      Array.from({ length: 30 }, (_, i) => seededOrder(ids, `k${i}`).join()),
    );
    expect(others.size).toBeGreaterThan(1);
  });

  it('is never the authored order, and never an order that already works (it would hand out the answer)', () => {
    for (let i = 0; i < 200; i++) {
      const o = seededOrder(ids, `key-${i}`, valid);
      expect(o).not.toEqual(ids);
      expect(valid(o)).toBe(false);
    }
  });

  it('a single card cannot be shuffled and is returned as it is', () => {
    expect(seededOrder(['a'], 'x')).toEqual(['a']);
  });
});
