/**
 * Content round C1 (finish 1.b, 2026-10-23): walk-throughs for 1b/s3 and
 * 1b/s7, a simpler twin for 1b/s7, and fresh variants for both as choice
 * steps on a new urn, with engine-computed answers.
 */
import { fractionToPlain } from '../engine/format';
import { checkWalkthroughs } from '../lesson/walkthroughCheck';
import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, stepKey, type LoadedExercise } from './loader';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const load = (raw: unknown) => loadExercise(raw, ex2Misconceptions);
const loaded = (raw: unknown = ex2): LoadedExercise => {
  const r = load(raw);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
};
const errorsOf = (raw: unknown) => {
  const r = load(raw);
  return r.ok ? checkWalkthroughs(r.loaded) : r.errors;
};
type Any = Record<string, any>;
const mainStep = (raw: Any, id: string) =>
  raw.parts[0].groups[0].steps.find((s: Any) => s.id === id) as Any;
const variant = (raw: Any, id: string) =>
  raw.variants.find((v: Any) => v.id === id) as Any;

describe('C1 walk-throughs (1b/s3, 1b/s7)', () => {
  it('2 lines each, and they pass the answer check', () => {
    expect(mainStep(ex2, 's3').walkthrough.lines).toHaveLength(2);
    expect(mainStep(ex2, 's7').walkthrough.lines).toHaveLength(2);
    expect(checkWalkthroughs(loaded())).toEqual([]);
  });

  it.each([
    ['the correct option in French words', { fr: 'aucune des deux boules' }],
    [
      'the correct option in Arabic words',
      { ar: [{ ar: 'ولا كورة عليها صفر.' }] },
    ],
  ])('rejects a 1b/s3 line with %s', (_what, line) => {
    const raw = clone(ex2) as Any;
    mainStep(raw, 's3').walkthrough.lines[0] = line;
    expect(errorsOf(raw)).toEqual([
      '1b/s3: walk-through line 1 states the answer',
    ]);
  });

  it('rejects a 1b/s7 line with the probability (value or words)', () => {
    for (const line of [
      { math: '\\frac{3}{10}' },
      { ar: [{ ar: 'ثلاثة على عشرة.' }] },
    ]) {
      const raw = clone(ex2) as Any;
      mainStep(raw, 's7').walkthrough.lines[1] = line;
      expect(errorsOf(raw)).toEqual([
        '1b/s7: walk-through line 2 states the answer',
      ]);
    }
  });
});

describe('C1 simpler twin for 1b/s7', () => {
  it('a smaller urn (0, 1, 2, 3): p(no 0) computed by the engine = 1/2', () => {
    const v = variant(ex2, 'sim-1b-s7-1');
    expect(v).toMatchObject({ kind: 'simpler', forSteps: ['1b/s7'], round: 1 });
    const a = loaded().answers.get(stepKey.variant('sim-1b-s7-1'));
    expect(a?.kind === 'number' && fractionToPlain(a.value)).toBe('1/2');
  });
});

describe('C1 fresh choice variants on the new urn (after a reveal of 1b/s3 or 1b/s7)', () => {
  it('1b/s3: the complement is found by the engine (type "complement")', () => {
    expect(loaded().answers.get(stepKey.variant('tr-1b-s3-fresh'))).toEqual({
      kind: 'option',
      optionId: 'none',
    });
    expect(variant(ex2, 'tr-1b-s3-fresh')).toMatchObject({
      kind: 'transfer',
      afterReveal: true,
      forSteps: ['1b/s3'],
    });
  });

  it('1b/s7: the option equal to the engine probability (15/28)', () => {
    expect(loaded().answers.get(stepKey.variant('tr-1b-s7-fresh'))).toEqual({
      kind: 'option',
      optionId: 'p15_28',
    });
  });

  it('a complement answer no option matches is rejected', () => {
    const raw = clone(ex2) as Any;
    const opts = variant(raw, 'tr-1b-s3-fresh').step.options as Any[];
    const none = opts.find(o => o.id === 'none')!;
    none.event = opts.find(o => o.id === 'two')!.event;
    expect(
      load(raw).ok ? [] : (load(raw) as { errors: string[] }).errors,
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /var:tr-1b-s3-fresh: 0 options are the complement/,
        ),
      ]),
    );
  });

  it("rejects a fresh choice whose correct option repeats the parent's (label or value)", () => {
    const raw = clone(ex2) as Any;
    const correct = (variant(raw, 'tr-1b-s3-fresh').step.options as Any[]).find(
      o => o.id === 'none',
    )!;
    correct.label = mainStep(raw, 's3').options[0].label;
    expect(errorsOf(raw).join('\n')).toMatch(
      /var:tr-1b-s3-fresh: the correct option repeats the answer of 1b\/s3/,
    );
    // A value equal to one of the parent's wrong options (3/5) cannot be correct.
    const raw2 = clone(ex2) as Any;
    const v = variant(raw2, 'tr-1b-s7-fresh');
    v.experiment.urn = [0, 0, 1, 2, 3].map((value, i) => ({
      id: `q${i}`,
      value,
    }));
    for (const o of v.step.options as Any[]) {
      if (o.id === 'p15_28') {
        o.value = '3/10';
      }
    }
    expect(errorsOf(raw2).join('\n')).toMatch(
      /var:tr-1b-s7-fresh: the answer 3\/10 equals the answer of 1b\/s7/,
    );
  });

  it('the correct option does not always sit in the same position', () => {
    const l = loaded();
    const index = (key: string, options: Any[]) => {
      const a = l.answers.get(key);
      return a?.kind === 'option'
        ? options.findIndex(o => o.id === a.optionId)
        : -1;
    };
    for (const [parent, fresh] of [
      ['s3', 'tr-1b-s3-fresh'],
      ['s7', 'tr-1b-s7-fresh'],
    ] as const) {
      expect(
        index(stepKey.variant(fresh), variant(ex2, fresh).step.options),
      ).not.toBe(
        index(stepKey.main('1b', parent), mainStep(ex2, parent).options),
      );
    }
    const all = [
      ...['s3', 's7'].map(id =>
        index(stepKey.main('1b', id), mainStep(ex2, id).options),
      ),
      ...(ex2.variants as Any[])
        .filter(
          v =>
            v.step.kind === 'choice' &&
            v.forSteps.some((k: string) => k.startsWith('1b/')),
        )
        .map(v => index(stepKey.variant(v.id), v.step.options)),
    ];
    expect(new Set(all).size).toBeGreaterThan(1);
  });
});
