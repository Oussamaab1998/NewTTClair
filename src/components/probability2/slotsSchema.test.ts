import { PartWholeBarPropsSchema, SlotsPatternPropsSchema } from './schemas';

const six = ['a', 'b', 'c', 'd', 'e', 'f'].map(x => ({ id: x, label: x.toUpperCase() }));

describe('SlotsPattern props', () => {
  const ok = (p: unknown) => SlotsPatternPropsSchema.safeParse(p);
  const issues = (p: unknown) => {
    const r = ok(p);
    return r.success ? [] : r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  };

  it('accepts the demo cases', () => {
    expect(ok({ n: 5, k: 3, mode: 'free' }).success).toBe(true);
    expect(ok({ n: 7, k: 3, mode: 'free', listCap: 20 }).success).toBe(true);
    expect(ok({ n: 4, k: 2, mode: 'guided', meantToDistinguish: false }).success).toBe(true);
    expect(ok({ n: 5, k: 0, mode: 'build_pascal' }).success).toBe(true);
    expect(ok({ n: 7, k: 3, mode: 'bridge', bridge: { balls: [...six, { id: 'g', label: 'G' }] } }).success).toBe(true);
  });

  it('defaults: free mode, a list cap of 60, the coincidence guard on', () => {
    const r = SlotsPatternPropsSchema.parse({ n: 5, k: 3 });
    expect(r).toMatchObject({ mode: 'free', listCap: 60, meantToDistinguish: true });
  });

  it('n from 2 to 7, k from 0 to n, a list cap from 4 to 60', () => {
    expect(ok({ n: 1, k: 1 }).success).toBe(false);
    expect(ok({ n: 8, k: 3 }).success).toBe(false);
    expect(ok({ n: 5, k: 6 }).success).toBe(false);
    expect(ok({ n: 5, k: 3, listCap: 3 }).success).toBe(false);
    expect(ok({ n: 5, k: 3, listCap: 61 }).success).toBe(false);
  });

  it('free and bridge need a list of more than one pattern: 1 <= k <= n - 1', () => {
    expect(ok({ n: 5, k: 0 }).success).toBe(false);
    expect(ok({ n: 5, k: 5 }).success).toBe(false);
  });

  it('guided needs 1 <= k <= n - 1', () => {
    expect(ok({ n: 4, k: 4, mode: 'guided', meantToDistinguish: false }).success).toBe(false);
    expect(ok({ n: 4, k: 0, mode: 'guided', meantToDistinguish: false }).success).toBe(false);
  });

  it('build_pascal is for n up to 5', () => {
    expect(ok({ n: 5, k: 2, mode: 'build_pascal' }).success).toBe(true);
    expect(ok({ n: 6, k: 2, mode: 'build_pascal' }).success).toBe(false);
  });

  it('bridge: exactly n distinct balls, and only in bridge mode', () => {
    expect(ok({ n: 6, k: 2, mode: 'bridge' }).success).toBe(false);
    expect(ok({ n: 6, k: 2, mode: 'bridge', bridge: { balls: six.slice(0, 5) } }).success).toBe(false);
    expect(
      ok({ n: 6, k: 2, mode: 'bridge', bridge: { balls: [...six.slice(0, 5), six[0]!] } }).success,
    ).toBe(false);
    expect(ok({ n: 6, k: 2, mode: 'free', bridge: { balls: six } }).success).toBe(false);
    expect(ok({ n: 6, k: 2, mode: 'bridge', bridge: { balls: six } }).success).toBe(true);
  });

  it('bridge: k = n - k is refused (flipping S and F would change nothing)', () => {
    expect(ok({ n: 6, k: 3, mode: 'bridge', bridge: { balls: six } }).success).toBe(false);
  });

  it('the coincidence guard: C(5,2) = 5 x 2 and C(4,2) = 4 + 2 hide the difference between the methods', () => {
    expect(ok({ n: 5, k: 2 }).success).toBe(false);
    expect(issues({ n: 5, k: 2 }).join(' ')).toMatch(/coincid|equal|same/i);
    expect(ok({ n: 4, k: 2 }).success).toBe(false);
    expect(ok({ n: 5, k: 2, meantToDistinguish: false }).success).toBe(true);
    expect(ok({ n: 4, k: 2, meantToDistinguish: false }).success).toBe(true);
    expect(ok({ n: 6, k: 2 }).success).toBe(true);
  });

  it('is strict about unknown keys', () => {
    expect(ok({ n: 5, k: 3, ask: { kind: 'count' } }).success).toBe(false);
  });
});

describe('PartWholeBar props', () => {
  const ok = (p: unknown) => PartWholeBarPropsSchema.safeParse(p);

  it('accepts the demo cases', () => {
    expect(ok({ whole: '6', mode: 'place', ticks: 6 }).success).toBe(true);
    expect(ok({ whole: '1', mode: 'place', ticks: 10 }).success).toBe(true);
    expect(ok({ whole: '36', mode: 'fraction_of_quantity', fraction: '1/6' }).success).toBe(true);
    expect(ok({ whole: '20', mode: 'fraction_of_quantity', fraction: '3/4', ticks: 4 }).success).toBe(true);
    expect(ok({ whole: '6', mode: 'feedback', part: '12' }).success).toBe(true);
  });

  it('defaults to 6 ticks', () => {
    expect(PartWholeBarPropsSchema.parse({ whole: '6', mode: 'place' }).ticks).toBe(6);
  });

  it('the whole is a rational above zero, written as a string', () => {
    expect(ok({ whole: '0', mode: 'place' }).success).toBe(false);
    expect(ok({ whole: '-6', mode: 'place' }).success).toBe(false);
    expect(ok({ whole: 'abc', mode: 'place' }).success).toBe(false);
    expect(ok({ whole: 6, mode: 'place' }).success).toBe(false);
    expect(ok({ whole: '3/7', mode: 'place' }).success).toBe(true);
  });

  it('place has no part and no fraction (nothing to reveal)', () => {
    expect(ok({ whole: '6', mode: 'place', part: '3' }).success).toBe(false);
    expect(ok({ whole: '6', mode: 'place', fraction: '1/2' }).success).toBe(false);
  });

  it('feedback needs the part (it may be above the whole) and nothing else', () => {
    expect(ok({ whole: '6', mode: 'feedback' }).success).toBe(false);
    expect(ok({ whole: '6', mode: 'feedback', part: '-1' }).success).toBe(false);
    expect(ok({ whole: '6', mode: 'feedback', part: '3', fraction: '1/2' }).success).toBe(false);
    expect(ok({ whole: '60', mode: 'feedback', part: '120' }).success).toBe(true);
  });

  it('fraction_of_quantity: an integer quantity, a fraction in (0, 1], and a result the control can reach', () => {
    expect(ok({ whole: '36', mode: 'fraction_of_quantity' }).success).toBe(false);
    expect(ok({ whole: '36', mode: 'fraction_of_quantity', fraction: '0' }).success).toBe(false);
    expect(ok({ whole: '36', mode: 'fraction_of_quantity', fraction: '7/6' }).success).toBe(false);
    // 1/5 of 36 is not a whole number
    expect(ok({ whole: '36', mode: 'fraction_of_quantity', fraction: '1/5', ticks: 5 }).success).toBe(false);
    // 1/4 with the default 6 ticks does not land on a tick
    expect(ok({ whole: '20', mode: 'fraction_of_quantity', fraction: '1/4' }).success).toBe(false);
    expect(ok({ whole: '20', mode: 'fraction_of_quantity', fraction: '1/4', ticks: 4 }).success).toBe(true);
    expect(ok({ whole: '3/2', mode: 'fraction_of_quantity', fraction: '1/2' }).success).toBe(false);
    expect(ok({ whole: '36', mode: 'fraction_of_quantity', fraction: '1/6', part: '6' }).success).toBe(false);
  });

  it('ticks from 2 to 12', () => {
    expect(ok({ whole: '6', mode: 'place', ticks: 1 }).success).toBe(false);
    expect(ok({ whole: '6', mode: 'place', ticks: 13 }).success).toBe(false);
  });

  it('feedback: a part more than 10 times the whole is refused (the bar would be unreadable)', () => {
    expect(ok({ whole: '6', mode: 'feedback', part: '60' }).success).toBe(true);
    expect(ok({ whole: '6', mode: 'feedback', part: '61' }).success).toBe(false);
  });
});
