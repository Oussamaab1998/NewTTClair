/**
 * D2 (round 2, 2026-10-22): after a reveal, a fresh variant on a NEW urn.
 * Fresh variants are `transfer`s flagged `afterReveal`, with their own
 * experiment. The loader checks they cannot be guessed from the parent: the
 * answer differs from each parent step's answer, and from every wrong value
 * the parent knows (authored and procedure values).
 */
import { fractionToPlain } from '../engine/format';
import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, stepKey } from './loader';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const load = (raw: unknown) => loadExercise(raw, ex2Misconceptions);
const errorsOf = (raw: unknown) => {
  const r = load(raw);
  return r.ok ? [] : r.errors;
};
type RawVariant = (typeof ex2.variants)[number] & {
  afterReveal?: boolean;
  experiment?: unknown;
};
const fresh = (raw: typeof ex2, id: string) =>
  raw.variants.find(v => v.id === id) as RawVariant;

describe('fresh variants after a reveal (content + loader)', () => {
  it('1b/s5 and 1b/s8 have one, on a new urn, answers computed by the engine', () => {
    const r = load(ex2);
    if (!r.ok) {
      throw new Error(r.errors.join('\n'));
    }
    const a5 = r.loaded.answers.get(stepKey.variant('tr-1b-s5-fresh'));
    const a8 = r.loaded.answers.get(stepKey.variant('tr-1b-s8-fresh'));
    // Urn 0, 0, 1, 2, 3, 4, 5, 6: draws with no 0 = C(6,2) = 15; p(at least one 0) = 1 − 15/28.
    expect(a5?.kind === 'number' && fractionToPlain(a5.value)).toBe('15');
    expect(a8?.kind === 'number' && fractionToPlain(a8.value)).toBe('13/28');
    for (const id of ['tr-1b-s5-fresh', 'tr-1b-s8-fresh']) {
      expect(fresh(ex2, id)).toMatchObject({
        kind: 'transfer',
        afterReveal: true,
        trust: { reviewed: false },
      });
      expect(fresh(ex2, id).experiment).toBeDefined();
    }
  });

  it('rejects a fresh variant without its own urn, or not a transfer', () => {
    const raw = clone(ex2);
    delete fresh(raw, 'tr-1b-s5-fresh').experiment;
    expect(errorsOf(raw).join('\n')).toMatch(
      /var:tr-1b-s5-fresh: a fresh variant needs its own urn/,
    );
    const raw2 = clone(ex2);
    (fresh(raw2, 'tr-1b-s5-fresh') as { kind: string }).kind = 'alternative';
    expect(errorsOf(raw2).join('\n')).toMatch(
      /var:tr-1b-s5-fresh: a fresh variant must be a transfer/,
    );
  });

  it("rejects a fresh answer equal to the parent's answer", () => {
    // Urn 0, 0, 1, 2, 3: draws with no 0 = C(3,2) = 3, the answer of 1b/s5.
    const raw = clone(ex2);
    fresh(raw, 'tr-1b-s5-fresh').experiment = {
      urn: [
        { id: 'a', value: 0 },
        { id: 'b', value: 0 },
        { id: 'c', value: 1 },
        { id: 'd', value: 2 },
        { id: 'e', value: 3 },
      ],
      draw: 'simultaneous',
      k: 2,
    };
    expect(errorsOf(raw).join('\n')).toMatch(
      /var:tr-1b-s5-fresh: the answer 3 equals the answer of 1b\/s5/,
    );
  });

  it("rejects a fresh answer equal to one of the parent's known wrong values", () => {
    // Urn 0, 0, 1, 2, 3, 4, 5: no 0 = C(5,2) = 10, an authored wrong value of 1b/s5.
    const raw = clone(ex2);
    fresh(raw, 'tr-1b-s5-fresh').experiment = {
      urn: [0, 0, 1, 2, 3, 4, 5].map((value, i) => ({ id: `b${i}`, value })),
      draw: 'simultaneous',
      k: 2,
    };
    expect(errorsOf(raw).join('\n')).toMatch(
      /var:tr-1b-s5-fresh: the answer 10 equals a known wrong value of 1b\/s5/,
    );
  });

  it('which revealable steps have a fresh variant (gaps are explicit)', () => {
    const r = load(ex2);
    if (!r.ok) {
      throw new Error(r.errors.join('\n'));
    }
    const ex = r.loaded.exercise;
    const asked = ex.parts.flatMap(p =>
      p.groups
        .flatMap(g => g.steps)
        .filter(s => ['choice', 'typed', 'lines', 'component'].includes(s.kind))
        .map(s => stepKey.main(p.id, s.id)),
    );
    const candidates = ex.variants.filter(
      v => v.kind === 'transfer' && v.experiment !== undefined,
    );
    const covered = asked.filter(k =>
      candidates.some(v => v.forSteps.includes(k)),
    );
    expect(covered.sort()).toEqual(
      // C1 (2026-10-23): + 1b/s3 and 1b/s7 (choice fresh variants).
      [
        '1b/s3',
        '1b/s5',
        '1b/s7',
        '1b/s8',
        '2a/s6',
        '2a/s9',
        '2a/s10',
        '2a/s15',
      ].sort(),
    );
  });
});
