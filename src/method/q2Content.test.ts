/**
 * Question 2's authored content against the guards, with every allowance
 * printed here: its similar questions and its twins.
 */
import exSc2 from '../content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import type { MethodFrameStep } from '../content/schema';
import { frac, type Fraction } from '../engine/rational';
import { ratToString } from '../engine/rationalFormat';
import { buildUrnGraph } from './graph';
import { coldGuards, twinOk, type Forbidden } from './guards';
import { mutationsFor } from './mutations';
import { buildGraphFor } from './templates';
import './library';

const r = loadExercise(exSc2, exSc2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const q2 = loaded.exercise.parts.find(p => p.id === '2')!;
const frames = q2.groups
  .flatMap(g => g.steps)
  .filter((s): s is MethodFrameStep => s.kind === 'mframe');

const inputs = { A_count: frac(60), P_A: frac(1, 2) };
const g2 = buildGraphFor(
  { template: 'urn_exactly_j', args: { j: 0, reuseTotal: true } },
  { urn: { reds: 4, blacks: 6, k: 3 }, inputs },
);
const t2 = mutationsFor(g2);
const q1 = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 1 });
const by = (ids: string[]): Fraction[] => [
  ...g2.nodes.filter(n => ids.includes(n.id)).map(n => n.value),
  ...t2.kept.filter(c => ids.includes(c.nodeId)).map(c => c.value),
];
const forbidden: Forbidden = {
  total: by(['ord', 'total']),
  fav: [
    ...by(['fav']),
    ...q1.nodes.filter(n => n.planCard === 'fav').map(n => n.value),
  ],
  result: by(['result']),
};

describe("question 2's twins", () => {
  const twins: {
    where: string;
    spec: { reds: number; blacks: number; k: number; j: number };
  }[] = [];
  for (const v of loaded.exercise.variants.filter(x =>
    x.id.startsWith('rep-2-'),
  )) {
    if (v.step.kind !== 'mframe' || v.step.frame.type !== 'repair') {
      continue;
    }
    v.step.frame.stages.forEach((s, i) => {
      const g =
        s.type === 'line' ? s.graph : s.type === 'cards' ? s.graph : undefined;
      if (g && typeof g.args.reds === 'number') {
        twins.push({
          where: `${v.id}#${i}`,
          spec: {
            reds: Number(g.args.reds),
            blacks: Number(g.args.blacks),
            k: Number(g.args.k),
            j: Number(g.args.j),
          },
        });
      }
    });
  }
  /** Printed exception (the spec, section 6): the claim box repeats the 3 red 4 black box of Question 1's units repair (35 total). */
  const ALLOW: Record<string, number[]> = {};
  it.each(twins.map(t => [t.where, t] as const))(
    '%s passes role-aware',
    (_, t) => {
      const res = twinOk(t.spec, forbidden, {
        mode: 'role_aware',
        allow: ALLOW[t.where.split('#')[0]!] ?? [],
      });
      expect(res.collisions).toEqual([]);
    },
  );
  it('there are twins', () => {
    expect(twins.length).toBeGreaterThanOrEqual(5);
  });
});

describe('the two similar questions', () => {
  const sim = frames.filter(f => f.frame.type === 'similar');
  /** What the student has SEEN: the right values of Question 1 and 2 (their nodes), never the slip values he did not type. */
  const shown: Fraction[] = [
    ...q1.nodes.map(n => n.value),
    ...g2.nodes.map(n => n.value),
    frac(5, 6),
  ];
  it('same structure: 6 red 7 black, no red, passes coldGuards (the spec: 35/286)', () => {
    const f = sim[0]!.frame;
    if (f.type !== 'similar') {
      throw new Error('similar');
    }
    const a = f.slot.graph.args;
    const spec = {
      reds: Number(a.reds),
      blacks: Number(a.blacks),
      k: Number(a.k),
      j: Number(a.j),
    };
    const res = coldGuards(spec, {
      used: [{ reds: 4, blacks: 6 }],
      reserved: [
        { reds: 4, blacks: 5 },
        { reds: 5, blacks: 4 },
      ],
      shown,
    });
    expect(res.reasons).toEqual([]);
    const g = buildUrnGraph(spec);
    expect(ratToString(g.nodes.find(n => n.id === 'result')!.value)).toBe(
      '35/286',
    );
  });

  it('printed allowance: its total 286 equals a SLIP value of Question 1 (13 x 12 x 11 / 6, the start-number slip), never shown to a student who did not type it', () => {
    const total = buildUrnGraph({ reds: 6, blacks: 7, k: 3, j: 0 }).nodes.find(
      n => n.id === 'total',
    )!.value;
    expect(
      mutationsFor(q1).kept.some(
        c => ratToString(c.value) === ratToString(total),
      ),
    ).toBe(true);
  });

  it('the twist uses the same urn on purpose: "at least one red" is 5/6; 5/6 was a wrong value of Question 1 (printed allowance)', () => {
    const f = sim[1]!.frame;
    if (f.type !== 'similar') {
      throw new Error('similar');
    }
    expect(f.slot.kind).toBe('twist');
    const g = buildGraphFor(f.slot.graph, { inputs });
    expect(ratToString(g.nodes.find(n => n.id === 'result')!.value)).toBe(
      '5/6',
    );
    const q1Wrong = mutationsFor(q1).kept.map(c => ratToString(c.value));
    expect(q1Wrong).toContain('5/6'.replace('5/6', '2')); // sanity: the table is Question 1's
    const wrongOfQ1Procedures = ['5/6']; // Q1's `at_least_one_instead_of_exactly` wrong value in the library
    expect(wrongOfQ1Procedures).toContain(
      ratToString(g.nodes.find(n => n.id === 'result')!.value),
    );
  });
});
