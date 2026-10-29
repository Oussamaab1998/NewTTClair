import { runEngineCall } from './calls';
import { choose } from './combinatorics';
import { EngineError, equals, frac, type Fraction } from './rational';
import { ratToString } from './rationalFormat';
import {
  URN_TEMPLATES,
  freshCandidateOk,
  generateUrnVariant,
  proposeUrnVariants,
} from './urnVariants';

const f = (n: number, d = 1): Fraction => frac(n, d);
/** What the loader knows of the parent P(A) (step s8): the answer and its wrong values. */
const parentA = {
  answer: f(1, 2),
  wrong: [f(5, 6), f(1, 12), f(19, 120), f(2, 5), f(54, 125)],
};

describe('freshCandidateOk: the one rule', () => {
  it('refuses the parent\'s answer, and a known wrong value; accepts the rest', () => {
    expect(freshCandidateOk(parentA, f(1, 2))).toEqual({ ok: false, reason: 'equals_answer' });
    expect(freshCandidateOk(parentA, f(5, 6))).toEqual({ ok: false, reason: 'equals_wrong' });
    expect(freshCandidateOk(parentA, f(3, 5))).toEqual({ ok: true });
  });

  it('a parent with nothing to compare with accepts anything', () => {
    expect(freshCandidateOk({}, f(1, 2))).toEqual({ ok: true });
  });

  it('compares values, not spellings (2/4 is 1/2)', () => {
    expect(freshCandidateOk(parentA, [2, 4])).toEqual({ ok: false, reason: 'equals_answer' });
  });
});

describe('generateUrnVariant: urn_exactly_j', () => {
  it('is deterministic: the same seed gives the same variant, and it differs from another seed\'s', () => {
    const a = generateUrnVariant({ templateId: 'urn_exactly_j', seed: 7, parent: parentA });
    const b = generateUrnVariant({ templateId: 'urn_exactly_j', seed: 7, parent: parentA });
    expect(a).toEqual(b);
    const others = [1, 2, 3, 4, 5].map(seed =>
      JSON.stringify(generateUrnVariant({ templateId: 'urn_exactly_j', seed, parent: parentA }).urn),
    );
    expect(new Set(others).size).toBeGreaterThan(1);
  });

  it('is verified by the engine: the formula and the enumeration give the same probability', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const v = generateUrnVariant({ templateId: 'urn_exactly_j', seed, parent: parentA });
      const { reds, blacks, k } = v.urn;
      expect(equals(v.answer, f(choose(reds, v.j) * choose(blacks, k - v.j), choose(reds + blacks, k)))).toBe(true);
      const ex = {
        urn: [
          ...Array.from({ length: reds }, (_, i) => ({ id: `r${i}`, value: 1 })),
          ...Array.from({ length: blacks }, (_, i) => ({ id: `n${i}`, value: 0 })),
        ],
        draw: 'simultaneous' as const,
        k,
      };
      const e = runEngineCall(
        { fn: 'probability', args: { event: { id: 'value_eq', args: { valueFn: { id: 'count_value', args: { value: 1 } }, value: v.j } } } },
        { experiment: ex },
      );
      expect(e.ok && equals(e.value, v.answer)).toBe(true);
    }
  });

  it('never gives the parent\'s answer, a known wrong value of the parent, or one of its own wrong values', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const v = generateUrnVariant({ templateId: 'urn_exactly_j', seed, parent: parentA });
      expect(freshCandidateOk(parentA, v.answer)).toEqual({ ok: true });
      expect(v.wrong.some(w => equals(w, v.answer))).toBe(false);
    }
  });

  it('stays within the display limit (at most 60 draws) and writes the solution with the engine\'s own lines', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const v = generateUrnVariant({ templateId: 'urn_exactly_j', seed, parent: parentA });
      expect(choose(v.urn.reds + v.urn.blacks, v.urn.k)).toBeLessThanOrEqual(60);
      expect(v.lines).toHaveLength(3);
      expect(v.lines[0]).toMatch(/^C_\{\d+\}\^\{\d\} = \d+$/);
    }
  });

  it('the draw is at least 2 (so the single-ball slip is a different number)', () => {
    const v = generateUrnVariant({ templateId: 'urn_exactly_j', seed: 11, parent: parentA });
    expect(v.urn.k).toBeGreaterThanOrEqual(2);
  });
});

describe('generateUrnVariant: repeated_trials_table', () => {
  it('P(X = j) of n trials: deterministic, exact, and not the parent\'s answer or its slips', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const a = generateUrnVariant({ templateId: 'repeated_trials_table', seed, parent: parentA });
      const b = generateUrnVariant({ templateId: 'repeated_trials_table', seed, parent: parentA });
      expect(a).toEqual(b);
      expect(a.p).toBeDefined();
      expect(a.j).toBeGreaterThanOrEqual(1);
      expect(a.j).toBeLessThan(a.urn.k);
      expect(freshCandidateOk(parentA, a.answer)).toEqual({ ok: true });
      expect(a.wrong.some(w => equals(w, a.answer))).toBe(false);
    }
  });

  it('a hand check: n = 3, p = 1/3, j = 1 would be 3 x 1/3 x 4/9 = 4/9', () => {
    // find a seed that happens to produce it, to compare with the closed form
    const seen = proposeUrnVariants('repeated_trials_table', {}, 40).find(
      v => v.urn.k === 3 && v.j === 1 && v.p && equals(v.p, f(1, 3)),
    );
    if (seen) {
      expect(ratToString(seen.answer)).toBe('4/9');
    }
    expect(URN_TEMPLATES).toEqual(['urn_exactly_j', 'repeated_trials_table']);
  });
});

describe('bounded attempts, then a clear error (never a loop)', () => {
  it('one attempt that is refused throws', () => {
    const first = generateUrnVariant({ templateId: 'urn_exactly_j', seed: 5 });
    expect(() =>
      generateUrnVariant({
        templateId: 'urn_exactly_j',
        seed: 5,
        parent: { answer: first.answer },
        maxAttempts: 1,
      }),
    ).toThrow(EngineError);
    expect(() =>
      generateUrnVariant({
        templateId: 'urn_exactly_j',
        seed: 5,
        parent: { answer: first.answer },
        maxAttempts: 1,
      }),
    ).toThrow(/after 1 attempts/);
  });

  it('a seed below 1 is refused', () => {
    expect(() => generateUrnVariant({ templateId: 'urn_exactly_j', seed: 0 })).toThrow(EngineError);
  });
});

describe('proposeUrnVariants: a list of candidates for an author', () => {
  it('returns different urns that all pass the rule', () => {
    const list = proposeUrnVariants('urn_exactly_j', parentA, 5);
    expect(list).toHaveLength(5);
    expect(new Set(list.map(v => `${v.urn.reds},${v.urn.blacks},${v.urn.k},${v.j}`)).size).toBe(5);
    for (const v of list) {
      expect(freshCandidateOk(parentA, v.answer)).toEqual({ ok: true });
    }
  });
});
