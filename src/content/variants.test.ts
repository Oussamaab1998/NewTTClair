import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, stepKey } from './loader';
import { SKILLS, SkillMapSchema, makeSkills } from './skills';
import skillsRaw from './skillMap.json';
import { fractionToPlain } from '../engine/format';

const clone = () => JSON.parse(JSON.stringify(ex2)) as typeof ex2;
const ok = () => {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
};

describe('variants (alternatives, transfer, simpler twins, prerequisites)', () => {
  const loaded = ok();
  const value = (id: string) => {
    const a = loaded.answers.get(stepKey.variant(id));
    return a?.kind === 'number'
      ? fractionToPlain(a.value)
      : a?.kind === 'option'
      ? a.optionId
      : undefined;
  };

  it('authors alternatives and variants for 1.b and 2.a, all unreviewed', () => {
    const vs = loaded.exercise.variants;
    const kinds = (k: string) => vs.filter(v => v.kind === k).length;
    expect(kinds('alternative')).toBeGreaterThanOrEqual(10);
    expect(kinds('transfer') + kinds('simpler')).toBeGreaterThanOrEqual(6);
    expect(kinds('prerequisite')).toBeGreaterThan(0);
    const steps = new Set(
      vs.flatMap(v => v.forSteps.map(s => s.split('/')[0])),
    );
    expect([...steps].sort()).toEqual(['1b', '2a']);
    for (const v of vs) {
      expect(v.trust.reviewed).toBe(false);
      expect(v.step.trust.reviewed).toBe(false);
    }
  });

  it('computes every variant answer with the engine, using the variant urn', () => {
    // Exercise urn {-1, 0, 0, 1, 2}, 10 draws.
    expect(value('tr-1b-aumoins2')).toBe('2/5'); // p(at least one 2) = 4/10
    expect(value('tr-1b-s5-noneg')).toBe('6'); // pairs from {0, 0, 1, 2}
    expect(value('alt-1b-s8-bar')).toBe('3');
    expect(value('alt-2a-s6-list')).toBe('4');
    expect(value('alt-2a-sum-partial')).toBe('1/5');
    expect(value('sim-complement-1')).toBe('3/4');
    expect(value('pre-sure-event')).toBe('1');
    // Own urns.
    expect(value('sim-pairs-1')).toBe('6'); // C(4, 2)
    expect(value('sim-pairs-2')).toBe('3'); // C(3, 2)
    expect(value('tr-2a-s6-six')).toBe('15'); // C(6, 2)
    expect(value('tr-2a-s9-values')).toBe('ok'); // {-3, -2, 0, 6}
  });

  it('rejects \\val in a variant with its own urn (values belong to the exercise urn)', () => {
    const raw = clone();
    const v = raw.variants.find(x => x.id === 'sim-pairs-1')!;
    (v.step.prompt as { math?: string }).math = '\\val{nTotal}';
    const r = loadExercise(raw, ex2Misconceptions);
    expect(r.ok ? [] : r.errors).toContain(
      'var:sim-pairs-1: \\val is not allowed with its own experiment',
    );
  });

  it('rejects unknown steps, a simpler twin without a round, a non-asked step', () => {
    const raw = clone();
    raw.variants[0]!.forSteps = ['1b/nope'];
    const simpler = raw.variants.find(x => x.kind === 'simpler')!;
    delete (simpler as { round?: number }).round;
    const r = loadExercise(raw, ex2Misconceptions);
    const errors = r.ok ? [] : r.errors.join('\n');
    expect(errors).toContain('unknown step 1b/nope');
    expect(errors).toContain('simpler twins (and only they) have a round');

    const text = clone();
    (text.variants[0]!.step as { kind: string }).kind = 'text';
    expect(loadExercise(text, ex2Misconceptions).ok).toBe(false);
  });

  it('rejects a wrong component prop in a variant (checked against its urn)', () => {
    const raw = clone();
    const v = raw.variants.find(x => x.id === 'tr-2a-s10-urn')!;
    (v.step as { component: { props: { k?: number } } }).component.props.k = 9;
    expect(loadExercise(raw, ex2Misconceptions).ok).toBe(false);
  });
});

describe('skill map (prerequisites)', () => {
  it('is unreviewed, acyclic, and covers every skill used in the content', () => {
    expect(SKILLS.map.reviewed).toBe(false);
    const loaded = ok();
    const used = new Set<string>();
    const ex = loaded.exercise;
    ex.parts.forEach(q =>
      q.groups.forEach(g =>
        g.steps.forEach(s => s.skills.forEach(x => used.add(x))),
      ),
    );
    ex.deepDives.forEach(d => d.mini?.skills.forEach(x => used.add(x)));
    ex.variants.forEach(v => v.step.skills.forEach(x => used.add(x)));
    for (const m of loaded.misconceptions.values()) {
      used.add(m.skillId);
    }
    expect([...used].filter(s => !SKILLS.has(s))).toEqual([]);
  });

  it('separates writing habits from math skills', () => {
    expect(SKILLS.kind('writing-parentheses')).toBe('writing');
    expect(SKILLS.kind('counting-pairs')).toBe('math');
  });

  it('detects cycles and unknown prerequisites', () => {
    const bad = {
      ...skillsRaw,
      skills: [
        { id: 'a', kind: 'math', requires: ['b'] },
        { id: 'b', kind: 'math', requires: ['a'] },
        { id: 'c', kind: 'math', requires: ['zzz'] },
      ],
    };
    const r = SkillMapSchema.safeParse(bad);
    expect(r.success).toBe(false);
    const messages = r.success
      ? ''
      : r.error.issues.map(i => i.message).join('\n');
    expect(messages).toContain('prerequisite cycle');
    expect(messages).toContain('c requires unknown skill zzz');
    expect(
      makeSkills(SkillMapSchema.parse(skillsRaw)).prerequisites('au-moins-un'),
    ).toEqual(['complement-event']);
  });
});
