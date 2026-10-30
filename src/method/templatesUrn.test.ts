import { frac, type Fraction } from '../engine/rational';
import { ratToString } from '../engine/rationalFormat';
import { evalWith } from './claims';
import { mutationsFor } from './mutations';
import { buildGraphFor } from './templates';
import './library';

const inputs = { A_count: frac(60), P_A: frac(1, 2) };
const ctx = { urn: { reds: 4, blacks: 6, k: 3 }, inputs };
const val = (g: ReturnType<typeof buildGraphFor>, id: string) =>
  ratToString(g.nodes.find(n => n.id === id)!.value);
const slip = (t: ReturnType<typeof mutationsFor>, id: string, node: string) =>
  t.kept
    .filter(c => c.id === id && c.nodeId === node)
    .map(c => ratToString(c.value));

describe('"no red" is the same graph as "exactly one red" at j = 0, aware of the question before', () => {
  const g = buildGraphFor(
    { template: 'urn_exactly_j', args: { j: 0, reuseTotal: true } },
    ctx,
  );
  const t = mutationsFor(g);

  it('the engine gives 120, 20 and 1/6; the total may be written bare (reuse)', () => {
    expect([val(g, 'total'), val(g, 'fav'), val(g, 'result')]).toEqual([
      '120',
      '20',
      '1/6',
    ]);
    expect(g.nodes.find(n => n.id === 'total')!.bareOk).toBe(true);
  });

  it('the spec table at the favourable node: 120, 40, 60, 80, and the colour swapped (4)', () => {
    expect(slip(t, 'drop_division', 'fav')).toEqual(['120']);
    expect(slip(t, 'divide_by_k_not_k_factorial', 'fav')).toEqual(['40']);
    expect(slip(t, 'one_factor_divided', 'fav')).toEqual(['60']);
    expect(slip(t, 'bracket_left_to_right', 'fav')).toEqual(['80']);
    expect(slip(t, 'colour_swapped', 'fav')).toEqual(['4']);
    expect(slip(t, 'n_times_k', 'fav')).toEqual(['18']);
  });

  it('the earlier event: its count (60) for this one, and "1 - P(A)" (1/2) at the result', () => {
    expect(slip(t, 'a_count_for_b', 'fav')).toEqual(['60']);
    expect(slip(t, 'complement_of_A', 'result')).toEqual(['1/2']);
    expect(slip(t, 'swap_numerator_denominator', 'result')).toEqual(['6']);
  });

  it('without the earlier question there is nothing to recognise (Question 1 keeps its own table)', () => {
    const own = mutationsFor(
      buildGraphFor(
        { template: 'urn_exactly_j', args: { j: 1 } },
        { urn: ctx.urn, inputs: {} },
      ),
    );
    expect(
      own.kept.some(
        c => c.id === 'a_count_for_b' || c.id === 'complement_of_A',
      ),
    ).toBe(false);
  });

  it('named values for a claim: t all draws, b this count, a the earlier count', () => {
    expect(
      Object.fromEntries(
        Object.entries(g.vars!).map(([k, v]) => [k, ratToString(v)]),
      ),
    ).toEqual({
      t: '120',
      b: '20',
      a: '60',
      p: '1/2',
    });
  });

  it('a twin box compares with an event of its own (aJ): 3 red 4 black, no red against exactly one', () => {
    const twin = buildGraphFor(
      {
        template: 'urn_exactly_j',
        args: { reds: 3, blacks: 4, k: 3, j: 0, aJ: 1 },
      },
      { inputs: {} },
    );
    expect(
      [twin.vars!.t!, twin.vars!.a!, twin.vars!.b!].map(ratToString),
    ).toEqual(['35', '18', '4']);
  });
});

describe('"at least one red" is all the draws minus the draws with no red', () => {
  const g = buildGraphFor(
    { template: 'urn_at_least_one', args: { j: 1 } },
    ctx,
  );
  const t = mutationsFor(g);

  it('100 of 120 = 5/6, through the complement or the three slices', () => {
    expect([
      val(g, 'total'),
      val(g, 'none'),
      val(g, 'fav'),
      val(g, 'result'),
    ]).toEqual(['120', '20', '100', '5/6']);
    const fav = g.nodes.find(n => n.id === 'fav')!;
    expect(fav.forms).toContain('120-20');
    expect(fav.forms).toContain('60+36+4');
    expect(g.nodes.find(n => n.id === 'result')!.forms).toContain('1-1/6');
  });

  it('the slips: P(none) given, 1 - P(A), P(A) + P(B), the exactly-one count, the count of none', () => {
    expect(slip(t, 'forgot_one_minus', 'result')).toEqual(['1/6']);
    expect(slip(t, 'complement_of_wrong_event', 'result')).toEqual(['1/2']);
    expect(slip(t, 'adds_wrong_cases', 'result')).toEqual(['2/3']);
    expect(slip(t, 'exactly_instead_of_at_least', 'fav')).toEqual(['60']);
    expect(slip(t, 'forgot_to_subtract', 'fav')).toEqual(['20']);
  });

  it('refuses a j other than 1', () => {
    expect(() =>
      buildGraphFor({ template: 'urn_at_least_one', args: { j: 2 } }, ctx),
    ).toThrow();
  });
});

describe('evalWith: named fractions, exact, the safe parser', () => {
  const vars: Record<string, Fraction> = {
    t: frac(120),
    a: frac(60),
    p: frac(1, 2),
  };
  it('t - a, 1 - p, nothing else', () => {
    expect(ratToString(evalWith('t-a', vars))).toBe('60');
    expect(ratToString(evalWith('1-p', vars))).toBe('1/2');
    expect(() => evalWith('x+1', vars)).toThrow();
    expect(() => evalWith('t+', vars)).toThrow();
  });
});
