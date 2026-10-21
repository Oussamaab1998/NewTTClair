import { frac } from '../../engine/rational';
import { formatGuardRows, runGuardFixtures } from './fixtures/guardFixtures';
import { numbersIn } from './guard';

describe('numbersIn: what the guard counts as a number', () => {
  it('reads fractions as one value, decimals with comma or dot, negatives', () => {
    expect(
      numbersIn('p = \\frac{3}{10}, soit 0,3 ou 0.3 ; -1 et 7/10'),
    ).toEqual([frac(3, 10), frac(7, 10), frac(3, 10), frac(3, 10), frac(-1)]);
    expect(numbersIn('0{,}7')).toEqual([frac(7, 10)]);
    expect(numbersIn('\\bar{B}')).toEqual([]);
  });
});

describe('output guard on hand-written planner answers', () => {
  it('accepts every valid fixture and rejects every invalid one, for the expected reason', async () => {
    const rows = await runGuardFixtures();
    const unexpected = rows.filter(r => !r.asExpected);
    if (unexpected.length > 0) {
      throw new Error(formatGuardRows(rows));
    }
    expect(
      rows.filter(r => r.expected === 'accept').length,
    ).toBeGreaterThanOrEqual(7);
    expect(
      rows.filter(r => r.expected === 'reject').length,
    ).toBeGreaterThanOrEqual(10);
  });
});
