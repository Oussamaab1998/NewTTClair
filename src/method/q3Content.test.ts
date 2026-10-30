/**
 * Question 3's authored content against the guards. The urn guards do not
 * apply to a binomial question, so the checks are the ones that do: no answer
 * of a similar question equals a number already on a screen of Question 3,
 * and the twins of the repairs show no number of the question's own graph.
 * Every allowance is printed here.
 */
import exSc2 from '../content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import type { MethodFrameStep } from '../content/schema';
import { frac, type Fraction } from '../engine/rational';
import { ratToString } from '../engine/rationalFormat';
import { mutationsFor } from './mutations';
import { buildGraphFor } from './templates';
import './library';

const r = loadExercise(exSc2, exSc2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const inputs = { p: frac(1, 2) };
const part = (id: string) => loaded.exercise.parts.find(p => p.id === id)!;
const frames = (id: string) =>
  part(id)
    .groups.flatMap(g => g.steps)
    .filter((s): s is MethodFrameStep => s.kind === 'mframe');

/** A number that could be recognised from a screen: a non-integer fraction or an integer from 12 up. */
const isKey = (v: Fraction) => v[1] !== 1 || Math.abs(v[0]) >= 12;
const valuesOf = (g: ReturnType<typeof buildGraphFor>): Fraction[] =>
  g.nodes.map(n => n.value);
const withSlips = (g: ReturnType<typeof buildGraphFor>): Fraction[] => [
  ...valuesOf(g),
  ...mutationsFor(g).kept.map(c => c.value),
];
const has = (pool: Fraction[], v: Fraction) =>
  pool.some(x => x[0] === v[0] && x[1] === v[1]);

const gA = buildGraphFor(
  { template: 'binomial_term', args: { n: 7, k: 2 } },
  { inputs },
);
const gB = buildGraphFor(
  { template: 'binomial_moments', args: { n: 7 } },
  { inputs },
);

describe('twins of the repairs (binomial: role-blind, keys only)', () => {
  const twins: {
    where: string;
    g: ReturnType<typeof buildGraphFor>;
    pool: Fraction[];
  }[] = [];
  for (const v of loaded.exercise.variants.filter(x =>
    /^rep-3[ab]-/.test(x.id),
  )) {
    if (v.step.kind !== 'mframe' || v.step.frame.type !== 'repair') {
      continue;
    }
    const own = v.id.startsWith('rep-3a') ? gA : gB;
    v.step.frame.stages.forEach((s, i) => {
      if (s.type === 'line') {
        twins.push({
          where: `${v.id}#${i}`,
          g: buildGraphFor(s.graph, { inputs: {} }),
          pool: withSlips(own),
        });
      }
    });
  }
  it('there are twins', () => {
    expect(twins.length).toBeGreaterThanOrEqual(7);
  });
  /** Printed allowances: none needed. */
  it.each(twins.map(t => [t.where, t] as const))(
    '%s shows no key number of the question',
    (_, t) => {
      const hits = valuesOf(t.g)
        .filter(v => isKey(v) && has(t.pool, v))
        .map(ratToString);
      expect(hits).toEqual([]);
    },
  );
});

describe('the similar questions of 3a', () => {
  const sim = frames('3a').filter(f => f.frame.type === 'similar');
  const seen = [...withSlips(gA)].filter(isKey);
  it('the die (new numbers, p different from 1/2): 25/72, a key number never shown before', () => {
    const f = sim[0]!.frame;
    if (f.type !== 'similar') throw new Error('similar');
    const g = buildGraphFor(f.slot.graph, { inputs: {} });
    expect(ratToString(g.nodes.find(n => n.id === 'result')!.value)).toBe(
      '25/72',
    );
    for (const n of g.nodes) {
      expect(has(seen, n.value) && isKey(n.value)).toBe(false);
    }
  });
  it('the twist is the urn without replacement: p(Y = 1) = 1/2, the answer of Question 1 (printed allowance); 54/125 is labelled by name', () => {
    const f = sim[1]!.frame;
    if (f.type !== 'similar') throw new Error('similar');
    const g = buildGraphFor(f.slot.graph, { inputs: {} });
    expect(ratToString(g.nodes.find(n => n.id === 'result')!.value)).toBe(
      '1/2',
    );
    const t = mutationsFor(g);
    expect(t.kept.find(c => c.id === 'binomial_for_dependent')).toBeTruthy();
    expect(
      ratToString(t.kept.find(c => c.id === 'binomial_for_dependent')!.value),
    ).toBe('54/125');
  });
});

describe('the similar questions of 3b', () => {
  const sim = frames('3b').filter(f => f.frame.type === 'similar');
  it('the coin (n = 5) gives 5/2 and 5/4; the die (n = 3, p = 1/6) gives 1/2 and 5/12, where p squared (1/36) stops being right', () => {
    const vals = sim.map(s => {
      const f = s.frame;
      if (f.type !== 'similar') throw new Error('similar');
      const g = buildGraphFor(f.slot.graph, { inputs: {} });
      return g.nodes
        .filter(n => n.id === 'meann' || n.id === 'varn')
        .map(n => ratToString(n.value));
    });
    expect(vals).toEqual([
      ['5/2', '5/4'],
      ['1/2', '5/12'],
    ]);
  });
});

describe('what the sheet has', () => {
  it('the skeleton blanks of 3a and 3b name real nodes', () => {
    for (const [id, g] of [
      ['3a', gA],
      ['3b', gB],
    ] as const) {
      const plan = frames(id).find(f => f.frame.type === 'plan')!;
      const nodeIds = new Set(g.nodes.map(n => n.id));
      for (const line of plan.sheet?.skeleton ?? []) {
        for (const m of line.fr.matchAll(/\{([a-z0-9_]+)\}/g)) {
          expect(nodeIds.has(m[1]!)).toBe(true);
        }
      }
    }
  });
});
