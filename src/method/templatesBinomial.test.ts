import { add, frac, type Fraction } from '../engine/rational';
import { ratToString } from '../engine/rationalFormat';
import {
  binomialMean,
  binomialTerm,
  binomialVariance,
  oneTrialVariance,
} from './binomialMath';
import { mutationsFor } from './mutations';
import { buildGraphFor } from './templates';
import './library';

const half = frac(1, 2);
const inputs = { p: half };
const rs = (v: Fraction) => ratToString(v);
const kept = (t: ReturnType<typeof mutationsFor>, id: string, node: string) =>
  t.kept.filter(c => c.id === id && c.nodeId === node).map(c => rs(c.value));
const dropped = (t: ReturnType<typeof mutationsFor>) =>
  t.dropped
    .filter(d => d.why === 'equals_right_value')
    .map(d => `${d.id}@${d.nodeId}`);

describe('exact binomial numbers', () => {
  it('n = 7, k = 2, p = 1/2: 21/128; E = 7/2, V = 7/4', () => {
    expect(rs(binomialTerm(7, 2, half))).toBe('21/128');
    expect(rs(binomialMean(7, half))).toBe('7/2');
    expect(rs(binomialVariance(7, half))).toBe('7/4');
  });
  it('the die: p(X = 1) in 3 throws is 25/72, E = 1/2, V = 5/12', () => {
    const p = frac(1, 6);
    expect(rs(binomialTerm(3, 1, p))).toBe('25/72');
    expect(rs(binomialMean(3, p))).toBe('1/2');
    expect(rs(binomialVariance(3, p))).toBe('5/12');
  });
  it('the variance of one trial computed from its two values is p q', () => {
    expect(rs(oneTrialVariance(frac(1, 6)))).toBe('5/36');
  });
  it('the whole law sums to 1', () => {
    let sum = frac(0);
    for (let k = 0; k <= 7; k++) {
      sum = add(sum, binomialTerm(7, k, half));
    }
    expect(rs(sum)).toBe('1');
  });
});

describe('binomial_term (n = 7, k = 2, p from the question before)', () => {
  const g = buildGraphFor(
    { template: 'binomial_term', args: { n: 7, k: 2 } },
    { inputs },
  );
  const t = mutationsFor(g);
  it('the nodes: 1/128, 21, 21/128', () => {
    expect(g.nodes.map(n => `${n.id}=${rs(n.value)}`)).toEqual([
      'seq=1/128',
      'count=21',
      'result=21/128',
    ]);
  });
  it('the seven-factor product is a form of the sequence', () => {
    expect(g.nodes[0]!.forms).toContain('1/2*1/2*1/2*1/2*1/2*1/2*1/2');
  });
  it('the sequence slips of the spec: 1/2, 1/4, 7/2, 1/32', () => {
    expect(kept(t, 'p_single_trial', 'seq')).toEqual(['1/2']);
    expect(kept(t, 'forgets_failures', 'seq')).toEqual(['1/4']);
    expect(kept(t, 'adds_instead_of_multiplies', 'seq')).toEqual(['7/2']);
    expect(kept(t, 'forgets_successes', 'seq')).toEqual(['1/32']);
  });
  it('the count slips: 42, 7/2, 14, 7, 2; dividing by k coincides at k = 2 and is dropped, listed', () => {
    expect(kept(t, 'drop_division', 'count')).toEqual(['42']);
    expect(kept(t, 'reads_choose_as_fraction', 'count')).toEqual(['7/2']);
    expect(kept(t, 'n_times_k', 'count')).toEqual(['14']);
    expect(kept(t, 'n_for_count', 'count')).toEqual(['7']);
    expect(kept(t, 'k_for_count', 'count')).toEqual(['2']);
    expect(dropped(t)).toContain('divide_by_k_not_k_factorial@count');
  });
  it('the result slips: a sequence as P(X = k) (1/128, the owner three times), the count, the value of X', () => {
    expect(kept(t, 'one_sequence_as_P_X_k', 'result')).toEqual(['1/128']);
    expect(kept(t, 'count_given_as_probability', 'result')).toEqual(['21']);
    expect(kept(t, 'x_given_as_probability', 'result')).toEqual(['2']);
    expect(kept(t, 'law_forgets_failures', 'result')).toEqual(['21/4']);
    expect(kept(t, 'law_n_for_count', 'result')).toEqual(['7/128']);
  });
  it('needs p: neither an argument nor an input is an error, not a guess', () => {
    expect(() =>
      buildGraphFor(
        { template: 'binomial_term', args: { n: 7, k: 2 } },
        { inputs: {} },
      ),
    ).toThrow();
  });
});

describe('binomial_moments (n = 7)', () => {
  const g = buildGraphFor(
    { template: 'binomial_moments', args: { n: 7 } },
    { inputs },
  );
  const t = mutationsFor(g);
  it('1/2, 7/2, 1/4, 7/4', () => {
    expect(g.nodes.map(n => rs(n.value))).toEqual(['1/2', '7/2', '1/4', '7/4']);
  });
  it('the slips: n alone, one trial for n, the mean as the variance; p squared coincides with p q at p = 1/2 (dropped, the exam trap)', () => {
    expect(kept(t, 'n_instead_of_np', 'meann')).toEqual(['7']);
    expect(kept(t, 'mean_of_one_trial_for_n', 'meann')).toEqual(['1/2']);
    expect(kept(t, 'variance_as_mean', 'var1')).toEqual(['1/2']);
    expect(kept(t, 'variance_forgets_n', 'varn')).toEqual(['1/4']);
    expect(kept(t, 'variance_as_mean', 'varn')).toEqual(['7/2']);
    expect(dropped(t)).toContain('variance_p_squared@var1');
  });
  it('with p = 1/6 (the die) p squared stops coinciding: 1/36 is a slip, 5/36 is right', () => {
    const die = buildGraphFor(
      { template: 'binomial_moments', args: { n: 3, p: [1, 6] } },
      { inputs: {} },
    );
    const dt = mutationsFor(die);
    expect(kept(dt, 'variance_p_squared', 'var1')).toEqual(['1/36']);
    expect(rs(die.nodes.find(n => n.id === 'var1')!.value)).toBe('5/36');
  });
});
