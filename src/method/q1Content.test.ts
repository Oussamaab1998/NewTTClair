/**
 * Question 1's authored content against the coincidence guards: the two
 * similar questions and every twin of a repair are checked with the real
 * guard functions, and the allowances (numbers that may appear on purpose)
 * are listed here, in the open.
 */
import exSc2 from '../content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import type { MethodFrameStep } from '../content/schema';
import { frac, type Fraction } from '../engine/rational';
import { buildGraphFor } from './templates';
import { buildUrnGraph } from './graph';
import { coldGuards, twinOk, type Forbidden, type UrnPair } from './guards';
import { mutationsFor } from './mutations';

const r = loadExercise(exSc2, exSc2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const q = loaded.exercise.parts[0]!;
const steps = q.groups.flatMap(g => g.steps);
const frames = steps.filter((s): s is MethodFrameStep => s.kind === 'mframe');
const plan = frames.find(f => f.frame.type === 'plan')!;

const q1 = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 1 });
const q1table = mutationsFor(q1);
const valuesAt = (nodeIds: string[]): Fraction[] => [
  ...q1.nodes.filter(n => nodeIds.includes(n.id)).map(n => n.value),
  ...q1table.kept.filter(c => nodeIds.includes(c.nodeId)).map(c => c.value),
];
/** Q1's right and wrong values by role (the same roles the guard gives a twin's numbers). */
const forbidden: Forbidden = {
  total: valuesAt(['ord', 'total']),
  fav: valuesAt(['fav_red', 'fav_black', 'fav']),
  result: valuesAt(['result']),
};

/** Every urn a repair or a similar question puts on screen. */
interface Twin {
  where: string;
  spec: { reds: number; blacks: number; k: number; j: number };
}
const twins: Twin[] = [];
for (const v of loaded.exercise.variants.filter(x =>
  x.id.startsWith('rep-1-'),
)) {
  const st = v.step;
  if (st.kind !== 'mframe' || st.frame.type !== 'repair') {
    continue;
  }
  st.frame.stages.forEach((s, i) => {
    const g =
      s.type === 'line'
        ? s.graph
        : s.type === 'show'
        ? s.worked?.graph
        : undefined;
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

describe("question 1's twins (repairs)", () => {
  it('there are twins to check', () => {
    expect(twins.length).toBeGreaterThanOrEqual(8);
  });

  /** Printed allowances: the plan-help urn 3R5B (the owner's example) is the only twin allowed a collision. */
  const ALLOW_ROLE_AWARE: Record<string, number[]> = { 'rep-1-plan': [30] };
  it.each(twins.map(t => [t.where, t] as const))(
    '%s shows no number of the question in the same role (role-aware)',
    (_, t) => {
      const res = twinOk(t.spec, forbidden, {
        mode: 'role_aware',
        allow: ALLOW_ROLE_AWARE[t.where.split('#')[0]!] ?? [],
      });
      expect(res.collisions).toEqual([]);
    },
  );

  it('the plan-help urn 3R5B: 30 is the favourable count and equals the black part without its division (6 x 5), role-aware', () => {
    const res = twinOk({ reds: 3, blacks: 5, k: 3, j: 1 }, forbidden, {
      mode: 'role_aware',
      allow: [30],
    });
    expect(res.ok).toBe(true);
    expect(res.allowed).toEqual([{ role: 'fav', value: '30' }]);
  });

  it('role-blind the same urn also shows 15 and 28 (the complete mutation table adds 28): the allowance, printed', () => {
    const res = twinOk({ reds: 3, blacks: 5, k: 3, j: 1 }, forbidden, {
      mode: 'role_blind',
      allow: [30, 15, 28],
    });
    expect(res.ok).toBe(true);
    expect(res.allowed.map(a => a.value).sort()).toEqual(['15', '28', '30']);
  });

  it('every twin graph builds and its worked nodes exist', () => {
    for (const v of loaded.exercise.variants.filter(x =>
      x.id.startsWith('rep-1-'),
    )) {
      if (v.step.kind !== 'mframe' || v.step.frame.type !== 'repair') {
        continue;
      }
      for (const s of v.step.frame.stages) {
        if (s.type === 'show' && s.worked) {
          const g = buildGraphFor(s.worked.graph, { inputs: {} });
          for (const id of s.worked.nodes) {
            expect(g.nodes.some(n => n.id === id)).toBe(true);
          }
        }
        if (s.type === 'line') {
          const g = buildGraphFor(s.graph, { inputs: {} });
          expect(g.nodes.some(n => n.id === s.node)).toBe(true);
        }
      }
    }
  });
});

describe('the two similar questions pass the coincidence guards', () => {
  const sim = steps.filter(
    (s): s is MethodFrameStep =>
      s.kind === 'mframe' && s.frame.type === 'similar',
  );
  const used: UrnPair[] = [
    { reds: 4, blacks: 6 },
    ...twins.map(t => ({ reds: t.spec.reds, blacks: t.spec.blacks })),
  ];
  const reserved: UrnPair[] = [
    { reds: 4, blacks: 5 },
    { reds: 5, blacks: 4 },
  ];
  const shown: Fraction[] = [
    ...q1.nodes.map(n => n.value),
    ...q1table.kept.map(c => c.value),
    ...twins.flatMap(t => {
      const g = buildUrnGraph(t.spec);
      return g.nodes.map(n => n.value);
    }),
    // question 2 is on the same urn: its answers are in the exercise
    frac(1, 6),
    frac(5, 6),
    frac(20),
  ];
  it('there are two: the same structure and the twist (no red)', () => {
    expect(
      sim.map(s => s.frame.type === 'similar' && s.frame.slot.kind),
    ).toEqual(['same_structure', 'twist']);
    const j = sim.map(s =>
      s.frame.type === 'similar' ? s.frame.slot.graph.args.j : -1,
    );
    expect(j).toEqual([1, 0]);
  });
  it.each([0, 1])('slot %i passes coldGuards', i => {
    const f = sim[i]!.frame;
    if (f.type !== 'similar') {
      throw new Error('similar');
    }
    const a = f.slot.graph.args;
    const res = coldGuards(
      {
        reds: Number(a.reds),
        blacks: Number(a.blacks),
        k: Number(a.k),
        j: Number(a.j),
      },
      { used, reserved, shown },
    );
    expect(res.reasons).toEqual([]);
  });
});

describe('what the sheet has', () => {
  it('the plan frame carries the findings and the skeleton; the skeleton blanks name real nodes', () => {
    const ids = new Set(q1.nodes.map(n => n.id));
    expect(plan.sheet?.findings.length).toBe(3);
    for (const line of plan.sheet?.skeleton ?? []) {
      for (const m of line.fr.matchAll(/\{([a-z0-9_]+)\}/g)) {
        expect(ids.has(m[1]!)).toBe(true);
      }
    }
  });
});
