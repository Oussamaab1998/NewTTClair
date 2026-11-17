import i18n from '../../i18n';
import { frac } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import { completeReveals, revealedByRules } from '../reveals';
import { FindingPayloadSchema } from './finding';
import { ProbabilityTreePropsSchema, engineTree } from './schemas';
import {
  PROBABILITY_TREE_REVEALS,
  allEdges,
  describeTree,
  leafIds,
  pathKnown,
  pathLatex,
  pathOf,
  treeFinding,
} from './treeModel';

const NOT_A = '\\overline{A}';
const NOT_F = '\\overline{F}';

/** A or not A, then F or not F; `over` changes a branch by its id. */
const two = (over: Record<string, object> = {}, top: object = {}) => ({
  ...top,
  branches: [
    ['a', 'A'],
    ['na', NOT_A],
  ].map(([id, latex]) => ({
    id,
    latex,
    ...over[id!],
    children: [
      { id: `${id}.f`, latex: 'F', ...over[`${id}.f`] },
      { id: `${id}.nf`, latex: NOT_F, ...over[`${id}.nf`] },
    ],
  })),
});
const blank = { show: 'blank' };
const hidden = { show: 'hidden' };

/** The four demo cases. */
const printed = two({
  a: { p: '2/3' },
  'a.f': { p: '1/4' },
  'a.nf': blank,
  na: blank,
  'na.f': blank,
  'na.nf': blank,
});
const live = two(
  {
    a: { p: '2/3' },
    'a.f': { p: '1/4' },
    'a.nf': hidden,
    na: { p: '1/3', show: 'found' },
    'na.f': hidden,
    'na.nf': hidden,
  },
  { compact: true, mark: ['a', 'a.f'], ask: 'a.nf' },
);
const countsOver = {
  a: { count: 15 },
  'a.f': { count: 6 },
  'a.nf': { count: 9, countShow: 'hidden' },
  na: { count: 10 },
  'na.f': { count: 5 },
  'na.nf': { count: 5 },
};
const counts = two(countsOver, { rootCount: 25 });
const fullOver = {
  a: { p: '2/3' },
  'a.f': { p: '1/4' },
  'a.nf': { p: '3/4' },
  na: { p: '1/3' },
  'na.f': { p: '1/2' },
  'na.nf': { p: '1/2' },
};
const full = two(fullOver);

const ok = (p: unknown) => ProbabilityTreePropsSchema.safeParse(p);
const issuesOf = (p: unknown) => {
  const r = ok(p);
  return r.success ? [] : r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
};

describe('ProbabilityTree props', () => {
  it('accepts the demo cases, with their defaults', () => {
    for (const p of [printed, live, counts, full]) {
      expect(issuesOf(p)).toEqual([]);
    }
    const p = ProbabilityTreePropsSchema.parse(printed);
    expect(p.mark).toEqual([]);
    expect(p.compact).toBe(false);
    expect(p.ask).toBeUndefined();
    expect(p.rootCount).toBeUndefined();
    expect(p.branches[0]).toMatchObject({ id: 'a', show: 'given', countShow: 'shown' });
    expect(p.branches[0]!.children![1]).toMatchObject({ id: 'a.nf', show: 'blank' });
  });

  it('`node` is carried for the lesson and changes nothing', () => {
    const p = ProbabilityTreePropsSchema.parse(two({ ...fullOver, a: { p: '2/3', node: 'p_a' } }));
    expect(p.branches[0]!.node).toBe('p_a');
    expect(ok(two({ ...fullOver, a: { p: '2/3', node: 'P a' } })).success).toBe(false);
  });

  it('is strict: 2 to 4 branches, 2 to 4 branches after a branch, ids and rationals as written', () => {
    expect(ok({ ...full, extra: 1 }).success).toBe(false);
    expect(ok(two({ ...fullOver, a: { p: '2/3', colour: 'red' } })).success).toBe(false);
    expect(ok({ branches: full.branches.slice(0, 1) }).success).toBe(false);
    expect(
      ok({ branches: [1, 2, 3, 4, 5].map(i => ({ id: `b${i}`, latex: 'B', show: 'hidden' })) }).success,
    ).toBe(false);
    expect(
      ok({
        branches: [
          { id: 'a', latex: 'A', p: '1/2', children: [{ id: 'a.f', latex: 'F', p: '1' }] },
          { id: 'na', latex: NOT_A, p: '1/2' },
        ],
      }).success,
    ).toBe(false);
    expect(ok(two({ ...fullOver, a: { id: 'A', p: '2/3' } })).success).toBe(false);
    expect(ok(two({ ...fullOver, a: { p: 'two thirds' } })).success).toBe(false);
    expect(ok(two({ ...fullOver, a: { p: 0.66 } })).success).toBe(false);
    expect(ok(two({ ...fullOver, a: { latex: '' } })).success).toBe(false);
    expect(ok(two(fullOver, { rootCount: 0 })).success).toBe(false);
  });

  it('ids are unique over the whole tree', () => {
    expect(issuesOf(two({ ...fullOver, 'na.f': { id: 'a.f', p: '1/2' } }))).toEqual([
      'branches.1.children.0: duplicate branch id a.f',
    ]);
    expect(ok(two({ ...fullOver, na: { id: 'a', p: '1/3' } })).success).toBe(false);
  });

  it('a branch shown as given or found needs its probability; a hidden or blank one does not', () => {
    expect(issuesOf(two({ ...fullOver, a: {}, na: hidden }))).toEqual([
      'branches.0: a shown branch needs its probability',
    ]);
    expect(issuesOf(two({ ...fullOver, 'a.f': { show: 'found' }, 'a.nf': hidden }))).toEqual([
      'branches.0.children.0: a shown branch needs its probability',
    ]);
    expect(ok(two({ ...fullOver, a: hidden, na: blank })).success).toBe(true);
    // a hidden branch may still carry the value the picture knows
    expect(ok(two({ ...fullOver, 'a.nf': { p: '3/4', show: 'hidden' } })).success).toBe(true);
  });

  it('known probabilities are between 0 and 1 (the engine checks)', () => {
    expect(issuesOf(two({ ...fullOver, a: { p: '3/2' }, na: hidden }))).toEqual([
      'branches.0: a probability is between 0 and 1',
    ]);
    expect(ok(two({ ...fullOver, 'a.f': { p: '-1/4' }, 'a.nf': hidden })).success).toBe(false);
    expect(ok(two({ ...fullOver, a: { p: '1' }, na: { p: '0' } })).success).toBe(true);
  });

  it('where every branch of a node is known, they add up to 1; a node with an unknown branch is not checked', () => {
    expect(issuesOf(two({ ...fullOver, na: { p: '2/3' } }))).toEqual([
      'branches: the branches leaving one node must add up to 1',
    ]);
    expect(issuesOf(two({ ...fullOver, 'na.nf': { p: '1/3' } }))).toEqual([
      'branches.1.children: the branches leaving one node must add up to 1',
    ]);
    expect(ok(two({ ...fullOver, na: hidden })).success).toBe(true);
    expect(ok(two({ ...fullOver, 'na.f': { p: '1/6' }, 'na.nf': blank })).success).toBe(true);
    // decimals and fractions mix exactly
    expect(ok(two({ ...fullOver, a: { p: '0,25' }, na: { p: '3/4' } })).success).toBe(true);
    expect(ok(two({ ...fullOver, a: { p: '0.3' }, na: { p: '0.6' } })).success).toBe(false);
  });

  it('mark and ask name branches of the tree', () => {
    expect(issuesOf({ ...full, mark: ['a', 'a.x'] })).toEqual(['mark.1: no branch a.x']);
    expect(issuesOf({ ...full, ask: 'nope' })).toEqual(['ask: no branch nope']);
    expect(ok({ ...full, mark: ['na', 'na.nf'], ask: 'na.nf' }).success).toBe(true);
  });

  it('counts mode: a shown branch needs its count, not its probability', () => {
    expect(ok(counts).success).toBe(true);
    expect(issuesOf(two({ ...countsOver, 'a.f': {}, 'a.nf': hidden }, { rootCount: 25 }))).toEqual([
      'branches.0.children.0: a shown branch needs its count',
    ]);
    expect(ok(two({ ...countsOver, 'a.f': hidden, 'a.nf': blank }, { rootCount: 25 })).success).toBe(true);
  });

  it('counts mode: the counts after a node never exceed it, and add up to it when all are given', () => {
    expect(issuesOf(two({ ...countsOver, 'a.nf': { count: 10 } }, { rootCount: 25 }))).toEqual([
      'branches.0.children: the counts (16) exceed the 15 they are taken from',
    ]);
    expect(issuesOf(two({ ...countsOver, 'a.nf': { count: 8 } }, { rootCount: 25 }))).toEqual([
      'branches.0.children: the counts add up to 14, not 15',
    ]);
    expect(issuesOf(two(countsOver, { rootCount: 24 }))).toEqual([
      'branches: the counts (25) exceed the 24 they are taken from',
    ]);
    expect(issuesOf(two(countsOver, { rootCount: 30 }))).toEqual([
      'branches: the counts add up to 25, not 30',
    ]);
    // one count missing: only "never more than the node"
    expect(ok(two({ ...countsOver, 'a.nf': hidden }, { rootCount: 25 })).success).toBe(true);
    expect(ok(two({ ...countsOver, 'a.f': { count: 16 }, 'a.nf': hidden }, { rootCount: 25 })).success).toBe(false);
    // outside counts mode a count is ignored
    expect(ok(two({ ...fullOver, a: { p: '2/3', count: 99 } })).success).toBe(true);
  });

  it('engineTree: the tree as the engine reads it (no p: not known yet)', () => {
    expect(engineTree(ProbabilityTreePropsSchema.parse(printed).branches)).toEqual([
      {
        id: 'a',
        p: [2, 3],
        children: [
          { id: 'a.f', p: [1, 4] },
          { id: 'a.nf', p: null },
        ],
      },
      {
        id: 'na',
        p: null,
        children: [
          { id: 'na.f', p: null },
          { id: 'na.nf', p: null },
        ],
      },
    ]);
  });
});

describe('ProbabilityTree model', () => {
  const P = (raw: unknown) => ProbabilityTreePropsSchema.parse(raw);

  it('leaves, edges and paths, in reading order', () => {
    expect(leafIds(P(full))).toEqual(['a.f', 'a.nf', 'na.f', 'na.nf']);
    expect(allEdges(P(full)).map(e => e.id)).toEqual(['a', 'a.f', 'a.nf', 'na', 'na.f', 'na.nf']);
    expect(pathOf(P(full), 'na.f')!.map(e => e.id)).toEqual(['na', 'na.f']);
    expect(pathOf(P(full), 'a')!.map(e => e.id)).toEqual(['a']);
    expect(pathOf(P(full), 'zz')).toBeNull();
    const mixed = P({
      branches: [full.branches[0], { id: 'na', latex: NOT_A, p: '1/3' }],
    });
    expect(leafIds(mixed)).toEqual(['a.f', 'a.nf', 'na']);
  });

  it('a path is written as a product of its visible values, never as its result', () => {
    expect(pathLatex(P(full), 'a.f')).toBe('\\frac{2}{3} \\times \\frac{1}{4}');
    expect(pathLatex(P(full), 'na.nf')).toBe('\\frac{1}{3} \\times \\frac{1}{2}');
    expect(pathLatex(P(printed), 'a.f')).toBe('\\frac{2}{3} \\times \\frac{1}{4}');
    // decimals and whole numbers as written
    expect(
      pathLatex(P(two({ ...fullOver, a: { p: '0.25' }, na: { p: '0,75' }, 'a.f': { p: '1' }, 'a.nf': { p: '0' } })), 'a.f'),
    ).toBe('0,25 \\times 1');
    for (const id of leafIds(P(full))) {
      expect(pathLatex(P(full), id)).not.toContain('=');
    }
  });

  it('a hidden or blank branch on the path: no expression (and none in counts mode)', () => {
    expect(pathLatex(P(printed), 'a.nf')).toBeNull();
    expect(pathLatex(P(printed), 'na.f')).toBeNull();
    expect(pathLatex(P(live), 'a.nf')).toBeNull();
    // a hidden branch never shows the value the picture knows
    expect(pathLatex(P(two({ ...fullOver, 'a.nf': { p: '3/4', show: 'hidden' } })), 'a.nf')).toBeNull();
    expect(pathLatex(P(counts), 'a.f')).toBeNull();
    expect(pathKnown(P(printed), 'a.f')).toBe(true);
    expect(pathKnown(P(printed), 'a.nf')).toBe(false);
    expect(pathKnown(P(counts), 'a.f')).toBe(true);
    expect(pathKnown(P(counts), 'a.nf')).toBe(false);
  });

  it('the finding counts paths, and holds no product', () => {
    const f = FindingPayloadSchema.parse(treeFinding(P(printed), ['leaf:a.f', 'leaf:na.nf']));
    expect(f).toEqual({
      findingId: 'tree.paths',
      numbers: { leaves: '4', known: '1' },
      route: ['leaf:a.f', 'leaf:na.nf'],
      how: 'found',
      correct: null,
    });
    const long = Array.from({ length: 20 }, () => 'leaf:a.f');
    expect(treeFinding(P(full), long).route).toHaveLength(12);
    expect(treeFinding(P(full), []).numbers).toEqual({ leaves: '4', known: '4' });
  });

  it('describes the picture in words, branch by branch (French)', () => {
    const t = i18n.getFixedT('fr');
    expect(describeTree(P(live), t)).toBe(
      [
        'Arbre de probabilités.',
        "Branche A : 2/3. C'est l'étape en cours.",
        "Après A, branche F : 1/4. C'est l'étape en cours.",
        "Après A, branche F barre : inconnue. C'est la valeur demandée.",
        'Branche A barre : 1/3, trouvée.',
        'Après A barre, branche F : inconnue.',
        'Après A barre, branche F barre : inconnue.',
      ].join(' '),
    );
    expect(describeTree(P(printed), t)).toContain('Branche A barre : vide.');
    expect(describeTree(P(counts), t)).toBe(
      [
        'Arbre de probabilités.',
        'Au départ : 25.',
        'Branche A : 15.',
        'Après A, branche F : 6.',
        'Après A, branche F barre : inconnue.',
        'Branche A barre : 10.',
        'Après A barre, branche F : 5.',
        'Après A barre, branche F barre : 5.',
      ].join(' '),
    );
  });

  it('describes it in Tunisian Arabic too: "?" is said as unknown, never read as a sign', () => {
    const said = describeTree(P(live), i18n.getFixedT('ar-TN'));
    expect(said).toContain(i18n.getFixedT('ar-TN')('pv2.tree.unknown'));
    expect(said).toContain('2/3');
    expect(said).not.toContain('?');
  });
});

describe('ProbabilityTree reveals: only the values written from its props', () => {
  const hit = (props: unknown, n: number, d = 1) =>
    revealedByRules(PROBABILITY_TREE_REVEALS, props as Record<string, unknown>, undefined, f =>
      sameRat(f, frac(n, d)),
    );

  it('is declared and complete', () => {
    expect(completeReveals(PROBABILITY_TREE_REVEALS)).toBe(true);
  });

  it('a given or found value is on screen by props; a hidden one is not, even when the picture knows it', () => {
    expect(hit(printed, 2, 3)?.value).toBe('branch_values');
    expect(hit(printed, 2, 3)?.by).toBe('props');
    expect(hit(live, 1, 3)?.value).toBe('branch_values');
    const knows = two({ ...fullOver, 'a.nf': { p: '3/4', show: 'hidden' } });
    expect(hit(knows, 3, 4)).toBeNull();
    expect(hit(knows, 1, 4)).not.toBeNull();
  });

  it('no product, no sum: the probability of a path is never on screen', () => {
    // 2/3 x 1/4 = 1/6 ; 2/3 x 1/4 + 1/3 x 1/2 = 1/3 is a branch value here, so use 1/6 and 5/12
    expect(hit(full, 1, 6)).toBeNull();
    expect(hit(full, 5, 12)).toBeNull();
  });

  it('counts mode: the root and the shown counts, not a hidden one, and no probability', () => {
    expect(hit(counts, 25)).not.toBeNull();
    expect(hit(counts, 15)).not.toBeNull();
    expect(hit(counts, 6)).not.toBeNull();
    expect(hit(counts, 9)).toBeNull();
    expect(hit(counts, 3, 5)).toBeNull();
  });

  it('invalid props reveal nothing (they are never drawn)', () => {
    expect(PROBABILITY_TREE_REVEALS[0]!.values({ branches: [] })).toEqual([]);
  });
});
