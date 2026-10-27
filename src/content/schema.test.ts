import { checkComponentSpec } from '../components/contract';
import { ex2q1b } from './fixtures/ex2q1b';
import {
  ExerciseSchema,
  MisconceptionSchema,
  RichSchema,
  TrustSchema,
} from './schema';

const valid = (x: unknown) => ExerciseSchema.safeParse(x).success;
const messages = (x: unknown) => {
  const r = ExerciseSchema.safeParse(x);
  return r.success ? [] : r.error.issues.map(i => i.message);
};
type Fixture = ReturnType<typeof ex2q1b>;
const firstSteps = (ex: Fixture) =>
  ex.parts[0]!.groups[0]!.steps as Record<string, unknown>[];

describe('ExerciseSchema', () => {
  it('accepts the Exercise 2 (1.b) fixture', () => {
    expect(messages(ex2q1b())).toEqual([]);
  });

  it('rejects a step without blockId', () => {
    const ex = ex2q1b();
    delete firstSteps(ex)[1]!.blockId;
    expect(valid(ex)).toBe(false);
  });
  it('rejects a block without trust metadata', () => {
    const ex = ex2q1b();
    delete (ex.deepDives[0]!.blocks[0] as Record<string, unknown>).trust;
    expect(valid(ex)).toBe(false);
  });
  it('rejects an exercise without contentVersion', () => {
    const ex: Partial<Fixture> = ex2q1b();
    delete ex.contentVersion;
    expect(valid(ex)).toBe(false);
  });
  it('rejects duplicate blockIds', () => {
    const ex = ex2q1b();
    firstSteps(ex)[2]!.blockId = 'q1b-s1';
    expect(messages(ex)).toContain('duplicate blockId q1b-s1');
  });
  it('rejects an option answer that is not an option', () => {
    const ex = ex2q1b();
    firstSteps(ex)[1]!.answer = { type: 'option', id: 'seven' };
    expect(messages(ex)).toContain('answer is not one of the options');
  });
  it('solution phrases (D16): French words in fr, Arabic script in ar, no bidi controls', () => {
    const withPhrases = (p: unknown) => {
      const ex = ex2q1b();
      firstSteps(ex)[1]!.solutionPhrases = p;
      return ex;
    };
    expect(
      messages(withPhrases({ fr: ['aucune'], ar: ['ولا وحدة'] })),
    ).toEqual([]);
    for (const bad of [
      { ar: ['ولا B'] },
      { ar: ['حتى 0'] },
      { fr: ['ولا وحدة'] },
      { fr: [''] },
      { fr: ['a\u2066b'] },
      { fr: [] },
    ]) {
      expect(valid(withPhrases(bad))).toBe(false);
    }
  });
  it('rejects more than 3 hints', () => {
    const ex = ex2q1b();
    firstSteps(ex)[1]!.hints = [
      { fr: '1' },
      { fr: '2' },
      { fr: '3' },
      { fr: '4' },
    ];
    expect(valid(ex)).toBe(false);
  });
  it('rejects unknown deep dives and results', () => {
    const ex = ex2q1b();
    firstSteps(ex)[1]!.deepDiveId = 'nope';
    ex.parts[0]!.uses = ['p_C'];
    expect(messages(ex)).toEqual(
      expect.arrayContaining(['unknown deep dive nope', 'unknown result p_C']),
    );
  });
  it('rejects unknown components', () => {
    const ex = ex2q1b();
    firstSteps(ex)[0]!.component = { component: 'Hologram', props: {} };
    expect(valid(ex)).toBe(false);
  });
  it('rejects a typed expression answer the safe parser cannot read', () => {
    const ex = ex2q1b();
    firstSteps(ex)[2]!.answer = {
      type: 'expression',
      equivalentTo: 'alert(1)',
    };
    expect(valid(ex)).toBe(false);
    firstSteps(ex)[2]!.answer = {
      type: 'expression',
      equivalentTo: '1 - 3/10',
    };
    expect(valid(ex)).toBe(true);
  });
  it('rejects deep dives nested deeper than 3', () => {
    const ex = ex2q1b();
    const trust = ex.deepDives[0]!.trust;
    const leaf = { type: 'math', blockId: 'deep-leaf', trust, latex: 'x' };
    const nest = (depth: number, inner: unknown) => ({
      type: 'deep_dive',
      blockId: `deep-${depth}`,
      trust,
      id: `d${depth}`,
      depth,
      blocks: [inner],
    });
    (ex.deepDives[0]!.blocks as unknown[]).push(
      nest(1, nest(2, nest(3, leaf))),
    );
    expect(valid(ex)).toBe(true);
    (ex.deepDives[0]!.blocks as unknown[]).push(nest(4, leaf));
    expect(valid(ex)).toBe(false);
  });
});

describe('RichSchema', () => {
  it('needs at least one field', () => {
    expect(RichSchema.safeParse({}).success).toBe(false);
  });
  it('keeps digits, formulas and Latin words out of Arabic runs', () => {
    expect(
      RichSchema.safeParse({ ar: [{ ar: 'نحسبو ' }, { fr: 'limite' }] })
        .success,
    ).toBe(true);
    expect(
      RichSchema.safeParse({ ar: [{ ar: 'الاحتمال هو 7' }] }).success,
    ).toBe(false);
    expect(RichSchema.safeParse({ ar: [{ ar: 'نحسبو limite' }] }).success).toBe(
      false,
    );
    expect(RichSchema.safeParse({ ar: 'نص' }).success).toBe(false);
  });
});

describe('TrustSchema', () => {
  const base = { contentVersion: '1', source: 'authored', status: 'ok' };
  it('requires reviewer and date when reviewed', () => {
    expect(TrustSchema.safeParse({ ...base, reviewed: true }).success).toBe(
      false,
    );
    expect(
      TrustSchema.safeParse({
        ...base,
        reviewed: true,
        reviewedBy: 'teacher-1',
        reviewedAt: '2026-10-15',
      }).success,
    ).toBe(true);
    expect(TrustSchema.safeParse({ ...base, reviewed: false }).success).toBe(
      true,
    );
  });
  it('is required on misconceptions', () => {
    const m = {
      id: 'counts_ordered_pairs',
      skillId: 'sample-space',
      description: 'answers 20',
      signature: 'answer=20',
    };
    expect(MisconceptionSchema.safeParse(m).success).toBe(false);
    expect(
      MisconceptionSchema.safeParse({
        ...m,
        trust: { ...base, reviewed: false },
      }).success,
    ).toBe(true);
  });
});

describe('checkComponentSpec', () => {
  it('accepts known components and generic primitives', () => {
    expect(
      checkComponentSpec({ component: 'EventPicker', props: { k: 2 } }).ok,
    ).toBe(true);
    expect(
      checkComponentSpec({ component: 'PredictReveal', props: {} }).ok,
    ).toBe(true);
  });
  it('reports unknown components and bad props without throwing', () => {
    expect(
      checkComponentSpec({ component: 'Hologram', props: {} }),
    ).toMatchObject({ ok: false, reason: 'unknown_component' });
    expect(
      checkComponentSpec({ component: 'Urn', props: { onPress: () => 1 } }),
    ).toMatchObject({ ok: false, reason: 'invalid_spec' });
    expect(checkComponentSpec(null)).toMatchObject({
      ok: false,
      reason: 'invalid_spec',
    });
  });
});
