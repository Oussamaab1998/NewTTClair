/**
 * The probability-tree templates on the exam's numbers (Bac 2022, session
 * principale, Sciences expérimentales, exercice 2): the values come from the
 * engine, right roads are credited, known wrong roads are named, and the
 * roads that reach the right value by chance on these numbers are refused
 * (the matcher hooks `traps`, `proof`, `reduced` of mutations.ts).
 */
import { add, div, frac, mul, sub, type Fraction } from '../engine/rational';
import { sameRat } from '../engine/rationalFormat';
import { solveTwoEventTree } from '../engine/tree';
import { factorBag, sameBag } from './factorForm';
import { evaluateLine, reviewLine, type LineOutcome } from './frame';
import type { Graph } from './graph';
import { evalChain } from './lineChain';
import { mutationsFor, sumTerms } from './mutations';
import { buildGraphFor, templateOf } from './templates';
import './library';
import { COINCIDENCE, TREE_TEMPLATE_IDS, treeLabel } from './templatesTree';

const EXAM = { pA: [2, 3], pFgA: [1, 4], pF: [5, 12] };
const T = solveTwoEventTree({
  pA: frac(2, 3),
  pFgA: frac(1, 4),
  pF: frac(5, 12),
});

const graphOf = (template: string, args: object = EXAM): Graph =>
  buildGraphFor({ template, args: args as never }, { inputs: {} });

const Q1 = graphOf('tree_other_path');
const Q2 = graphOf('tree_conditional');
const Q3 = graphOf('tree_complete');
const Q4 = graphOf('tree_reverse');

function judge(
  graph: Graph,
  card: string,
  raw: string,
  o: { credited?: string[]; worked?: string[] } = {},
): LineOutcome {
  return evaluateLine({
    raw,
    graph,
    table: mutationsFor(graph),
    card,
    credited: new Set(o.credited ?? []),
    worked: new Set(o.worked ?? []),
  }).outcome;
}

const slip = (o: LineOutcome): string | null =>
  o.kind === 'mutation' ? o.id : null;

describe('the four templates', () => {
  it('are registered with their cards', () => {
    expect(TREE_TEMPLATE_IDS).toEqual([
      'tree_other_path',
      'tree_conditional',
      'tree_complete',
      'tree_reverse',
    ]);
    expect(templateOf('tree_other_path')!.cardKeys).toEqual([
      'a_and_f',
      'split',
      'na_and_f',
    ]);
    expect(templateOf('tree_reverse')!.cardKeys).toEqual([
      'not_f',
      'na_and_nf',
      'na_given_nf',
    ]);
  });

  it.each([Q1, Q2, Q3, Q4])('every node holds the engine value: %#', g => {
    for (const n of g.nodes) {
      expect(n.value).toEqual(T[n.id as keyof typeof T]);
      expect(n.id === n.planCard || n.role === 'support').toBe(true);
      // Every accepted form evaluates to the node's value.
      for (const f of n.forms) {
        const c = evalChain(f);
        expect(c.kind).not.toBe('unreadable');
        expect(c.kind !== 'unreadable' && sameRat(c.value, n.value)).toBe(true);
      }
    }
    expect(g.domain).toBe('tree');
    expect(g.givens).toEqual([frac(2, 3), frac(1, 4), frac(5, 12)]);
  });

  it('one answer per question, written as the exam writes it', () => {
    const result = (g: Graph) => g.nodes.find(n => n.role === 'result')!;
    expect(result(Q1).label).toBe('p(\\overline{A} \\cap F)');
    expect(result(Q2).label).toBe('p(F/\\overline{A})');
    expect(result(Q3).label).toBe('p(\\overline{F}/\\overline{A})');
    expect(result(Q4).label).toBe('p(\\overline{A}/\\overline{F})');
    expect(treeLabel('na_and_f', true)).toBe('p(A \\cap F)');
  });

  it('two different slips written as a value alone never share that value', () => {
    // Two roads with one value are told apart by how the line is written;
    // two bare values could not be.
    const bare = (e: string) => /^\d+(\/\d+)?$/.test(e);
    for (const g of [Q1, Q2, Q3, Q4]) {
      const alone = mutationsFor(g).kept.filter(c => c.exprs.some(bare));
      for (const c of alone) {
        const twins = alone.filter(
          d => d.nodeId === c.nodeId && sameRat(d.value, c.value),
        );
        expect([...new Set(twins.map(d => d.id))]).toEqual([c.id]);
      }
    }
  });

  it('an urn graph has no trap table (its tables are unchanged)', () => {
    const urn = buildGraphFor(
      { template: 'urn_exactly_j', args: { j: 1 } },
      { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
    );
    expect('traps' in mutationsFor(urn)).toBe(false);
  });
});

describe('question 1: the other path («Montrer que»)', () => {
  it('credits the path along the branches', () => {
    const o = judge(Q1, 'a_and_f', '2/3*1/4=1/6');
    expect(o).toMatchObject({ kind: 'credit', completes: true });
    expect(judge(Q1, 'a_and_f', '(2/3)*(1/4)=2/12')).toMatchObject({
      kind: 'credit',
      unsimplified: false,
    });
  });

  it('the value alone is not credited: he writes the calculation', () => {
    expect(judge(Q1, 'a_and_f', '1/6').kind).toBe('unexplained');
    expect(judge(Q1, 'na_and_f', '1/4', { credited: ['a_and_f'] }).kind).toBe(
      'unexplained',
    );
  });

  it('names the wrong roads', () => {
    expect(slip(judge(Q1, 'a_and_f', '1/4'))).toBe('branch_for_path');
    expect(slip(judge(Q1, 'a_and_f', '2/3+1/4=11/12'))).toBe('adds_along_path');
    const c = { credited: ['a_and_f'] };
    expect(slip(judge(Q1, 'na_and_f', '5/12-1/4=1/6', c))).toBe(
      'subtracts_branch_not_path',
    );
    expect(slip(judge(Q1, 'na_and_f', '1-5/12=7/12', c))).toBe(
      'complement_of_total',
    );
  });

  it('refuses the result used to show itself', () => {
    expect(slip(judge(Q1, 'a_and_f', '5/12-1/4=1/6'))).toBe('uses_the_target');
  });

  it('the result: credited, simplified to the end, by the right road only', () => {
    const c = { credited: ['a_and_f'] };
    expect(judge(Q1, 'na_and_f', '5/12-1/6=3/12', c)).toMatchObject({
      kind: 'credit',
      unsimplified: true,
    });
    expect(judge(Q1, 'na_and_f', '5/12-1/6=3/12=1/4', c)).toMatchObject({
      kind: 'credit',
      unsimplified: false,
      completes: true,
    });
    // The same difference, its terms written another way.
    expect(judge(Q1, 'na_and_f', '5/12-2/12=3/12=1/4', c).kind).toBe('credit');
    expect(judge(Q1, 'na_and_f', '5/12-2/3*1/4=1/4', c).kind).toBe('credit');
    // After the calculation, the simplification alone finishes it.
    expect(
      judge(Q1, 'na_and_f', '3/12=1/4', {
        credited: ['a_and_f'],
        worked: ['na_and_f'],
      }),
    ).toMatchObject({ kind: 'credit', completes: true });
    // The two printed numbers subtracted: the right value, a wrong road.
    expect(slip(judge(Q1, 'na_and_f', '2/3-5/12=1/4', c))).toBe(
      'first_minus_total',
    );
    expect(slip(judge(Q1, 'na_and_f', '8/12-5/12=3/12=1/4', c))).toBe(
      'first_minus_total',
    );
  });
});

describe('question 2: a branch of the second level', () => {
  const c = { credited: ['not_a'] };

  it('credits the complement and the quotient', () => {
    expect(judge(Q2, 'not_a', '1-2/3=1/3').kind).toBe('credit');
    expect(judge(Q2, 'f_given_na', '(1/4)/(1/3)=3/4', c)).toMatchObject({
      kind: 'credit',
      completes: true,
    });
    expect(judge(Q2, 'f_given_na', '1/4*3=3/4', c).kind).toBe('credit');
  });

  it('the complement of the other node gives the right value here: refused', () => {
    const o = judge(Q2, 'f_given_na', '1-1/4=3/4', c);
    expect(o).toMatchObject({
      kind: 'mutation',
      id: 'complement_across_nodes',
      strength: 'confirmed',
    });
  });

  it('the value alone is not credited, and a chance sum is caught', () => {
    expect(judge(Q2, 'f_given_na', '3/4', c).kind).toBe('unexplained');
    expect(slip(judge(Q2, 'f_given_na', '5/12+1/3=3/4', c))).toBe(COINCIDENCE);
  });

  it('names the wrong quotients', () => {
    expect(slip(judge(Q2, 'f_given_na', '(1/4)/(5/12)=3/5', c))).toBe(
      'divides_by_total',
    );
    expect(slip(judge(Q2, 'f_given_na', '(1/3)/(1/4)=4/3', c))).toBe(
      'quotient_upside_down',
    );
    expect(slip(judge(Q2, 'f_given_na', '1/4', c))).toBe(
      'intersection_for_conditional',
    );
    expect(slip(judge(Q2, 'not_a', '2/3'))).toBe('complement_forgotten');
  });
});

describe('question 3: the missing branches', () => {
  const upper = { credited: ['not_a', 'f_given_na'] };
  const lower = { credited: ['not_a', 'f_given_na', 'nf_given_a'] };

  it('credits each complement at its own node', () => {
    expect(judge(Q3, 'nf_given_a', '1-1/4=3/4', upper).kind).toBe('credit');
    expect(judge(Q3, 'nf_given_na', '1-3/4=1/4', lower)).toMatchObject({
      kind: 'credit',
      completes: true,
    });
  });

  it('refuses the right value reached through the other node', () => {
    expect(slip(judge(Q3, 'nf_given_a', '(1/4)/(1/3)=3/4', upper))).toBe(
      'quotient_for_complement',
    );
    expect(judge(Q3, 'nf_given_a', '3/4', upper).kind).toBe('unexplained');
    expect(judge(Q3, 'nf_given_na', '1/4', lower).kind).toBe('unexplained');
  });

  it('names a copied branch and a complement across nodes', () => {
    expect(slip(judge(Q3, 'nf_given_na', '3/4', lower))).toBe(
      'copies_another_branch',
    );
    expect(slip(judge(Q3, 'nf_given_na', '1-1/4=3/4', lower))).toBe(
      'complement_across_nodes',
    );
    expect(slip(judge(Q3, 'nf_given_a', '1/4', upper))).toBe(
      'copies_another_branch',
    );
  });
});

describe('question 4: the tree read backwards', () => {
  const second = { credited: ['not_f'] };
  const last = { credited: ['not_f', 'na_and_nf'] };

  it('credits the three steps, by either right road', () => {
    expect(judge(Q4, 'not_f', '1-5/12=7/12').kind).toBe('credit');
    expect(judge(Q4, 'na_and_nf', '1/3*1/4=1/12', second).kind).toBe('credit');
    expect(judge(Q4, 'na_and_nf', '1/3-1/4=1/12', second).kind).toBe('credit');
    expect(judge(Q4, 'na_given_nf', '(1/12)/(7/12)=1/7', last)).toMatchObject({
      kind: 'credit',
      completes: true,
    });
    expect(judge(Q4, 'na_given_nf', '(1/12)/(7/12)=12/84', last)).toMatchObject(
      { kind: 'credit', unsimplified: true },
    );
  });

  it('a branch of the completed tree written again is named, not the answer', () => {
    expect(judge(Q4, 'na_and_nf', '1-2/3=1/3', second)).toMatchObject({
      kind: 'support',
    });
  });

  it('catches the chance roads', () => {
    expect(slip(judge(Q4, 'not_f', '1/3+1/4=7/12'))).toBe(COINCIDENCE);
    expect(slip(judge(Q4, 'na_and_nf', '1/4-1/6=1/12', second))).toBe(
      COINCIDENCE,
    );
    expect(slip(judge(Q4, 'na_and_nf', '5/12-1/3=1/12', second))).toBe(
      COINCIDENCE,
    );
  });

  it('names the condition taken the wrong way round', () => {
    expect(slip(judge(Q4, 'na_given_nf', '(1/12)/(1/3)=1/4', last))).toBe(
      'reverses_condition',
    );
    expect(slip(judge(Q4, 'na_given_nf', '1/4', last))).toBe(
      'condition_for_reverse',
    );
    expect(slip(judge(Q4, 'na_given_nf', '(7/12)/(1/12)=7', last))).toBe(
      'quotient_upside_down',
    );
    expect(slip(judge(Q4, 'not_f', '5/12'))).toBe('complement_forgotten');
  });
});

describe('every chance road is caught (second way: an independent scan)', () => {
  /** What he can see on each question before its first step. */
  const SEEN: Record<string, Fraction[]> = {
    tree_other_path: [T.a, T.f_given_a, T.f],
    tree_conditional: [T.a, T.f_given_a, T.f, T.a_and_f, T.na_and_f],
    tree_complete: [T.a, T.f_given_a, T.f, T.a_and_f, T.na_and_f],
    tree_reverse: [
      T.a,
      T.f_given_a,
      T.f,
      T.a_and_f,
      T.na_and_f,
      T.not_a,
      T.f_given_na,
      T.nf_given_a,
      T.nf_given_na,
    ],
  };
  const w = (v: Fraction) => (v[1] === 1 ? String(v[0]) : `(${v[0]}/${v[1]})`);

  it.each([Q1, Q2, Q3, Q4])('graph %#', g => {
    const table = mutationsFor(g);
    const cards = g.cards!;
    for (const node of g.nodes.filter(n => n.role !== 'support')) {
      const at = cards.indexOf(node.planCard);
      const seen = [
        ...SEEN[g.template!]!,
        ...g.nodes
          .filter(n => cards.indexOf(n.planCard) < at)
          .map(n => n.value),
      ];
      const lines: string[] = [];
      for (const x of seen) {
        lines.push(`1-${w(x)}`);
        for (const y of seen) {
          if (sameRat(x, y)) {
            continue;
          }
          const tries: [string, Fraction][] = [
            [`${w(x)}+${w(y)}`, add(x, y)],
            [`${w(x)}-${w(y)}`, sub(x, y)],
            [`${w(x)}*${w(y)}`, mul(x, y)],
            [`${w(x)}/${w(y)}`, div(x, y)],
          ];
          for (const [expr, value] of tries) {
            if (sameRat(value, node.value)) {
              lines.push(expr);
            }
          }
        }
      }
      for (const expr of lines) {
        const c = evalChain(expr);
        if (c.kind === 'unreadable' || !sameRat(c.value, node.value)) {
          continue;
        }
        const ast = c.kind === 'chain' ? c.sides[0]!.ast : c.side.ast;
        const like = (other: string): boolean => {
          const o = evalChain(other);
          if (o.kind === 'unreadable') {
            return false;
          }
          const oa = o.kind === 'chain' ? o.sides[0]!.ast : o.side.ast;
          const [t1, t2] = [sumTerms(ast), sumTerms(oa)];
          return (
            sameBag(factorBag(ast), factorBag(oa)) ||
            (t1 !== null &&
              t2 !== null &&
              t1.length === t2.length &&
              t1.every((t, i) => t === t2[i]))
          );
        };
        const right = node.forms.some(like);
        const trapped = (table.traps ?? []).some(
          t => t.nodeId === node.id && t.exprs.some(like),
        );
        // A line with the right value is a right road or a named trap, never both, never neither.
        expect({ node: node.id, expr, right, trapped }).toEqual({
          node: node.id,
          expr,
          right: !trapped,
          trapped: !right,
        });
        const o = judge(g, node.planCard, `${expr}=${w(node.value)}`, {
          credited: g.nodes.filter(n => n.id !== node.id).map(n => n.id),
        });
        expect(o.kind).toBe(right ? 'credit' : 'mutation');
      }
    }
  });

  it('the traps of the exam numbers, by name', () => {
    const traps = (g: Graph) =>
      (mutationsFor(g).traps ?? []).map(t => `${t.nodeId}:${t.id}`).sort();
    // The path over the first branch is the printed branch: by chance, the target too.
    expect(traps(Q1)).toEqual([
      'a_and_f:uses_the_target',
      `na_and_f:${COINCIDENCE}`,
      'na_and_f:first_minus_total',
    ]);
    expect(
      slip(judge(Q1, 'na_and_f', '(1/6)/(2/3)=1/4', { credited: ['a_and_f'] })),
    ).toBe(COINCIDENCE);
    expect(traps(Q2)).toEqual(
      expect.arrayContaining([
        'f_given_na:complement_across_nodes',
        `f_given_na:${COINCIDENCE}`,
      ]),
    );
    expect(traps(Q3)).toEqual(
      expect.arrayContaining(['nf_given_a:quotient_for_complement']),
    );
    expect(traps(Q4)).toEqual(
      expect.arrayContaining([
        `not_f:${COINCIDENCE}`,
        `na_and_nf:${COINCIDENCE}`,
      ]),
    );
  });
});

describe('a small example counted whole', () => {
  const counts = { n: 25, a: 15, af: 6, naf: 5 };
  const g1 = graphOf('tree_other_path', { counts });
  const g2 = graphOf('tree_conditional', { counts });
  const g4 = graphOf('tree_reverse', { counts });

  it('a count over a count is the whole line', () => {
    expect(judge(g1, 'a_and_f', '6/25')).toMatchObject({ kind: 'credit' });
    expect(judge(g1, 'a_and_f', '15/25*6/15=6/25').kind).toBe('credit');
    expect(
      judge(g1, 'na_and_f', '11/25-6/25=5/25', { credited: ['a_and_f'] }),
    ).toMatchObject({ kind: 'credit', unsimplified: false });
    expect(judge(g2, 'not_a', '10/25').kind).toBe('credit');
    expect(
      judge(g2, 'f_given_na', '5/10', { credited: ['not_a'] }),
    ).toMatchObject({ kind: 'credit', unsimplified: false });
    expect(
      judge(g4, 'na_given_nf', '5/14', { credited: ['not_f', 'na_and_nf'] })
        .kind,
    ).toBe('credit');
  });

  it('his slip gives another number there', () => {
    expect(
      slip(judge(g2, 'f_given_na', '1-6/15=9/15', { credited: ['not_a'] })),
    ).toBe('complement_across_nodes');
    expect(slip(judge(g1, 'a_and_f', '6/15'))).toBe('branch_for_path');
    expect(mutationsFor(g1).traps).toBeUndefined();
  });
});

describe('a similar question: the value alone counts (no help, no road asked)', () => {
  it('credits a bare result and labels a trap as its slip', () => {
    const table = mutationsFor(Q2);
    expect(reviewLine(Q2, table, '3/4', new Set(['not_a']))).toMatchObject({
      outcome: 'credit',
      nodeId: 'f_given_na',
    });
    // The complement of the other node's branch: a slip, whichever step he meant it for.
    expect(reviewLine(Q2, table, '1-1/4=3/4', new Set(['not_a'])).outcome).toBe(
      'slip',
    );
  });
});
