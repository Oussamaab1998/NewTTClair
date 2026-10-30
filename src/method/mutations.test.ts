import { ratToString, sameRat } from '../engine/rationalFormat';
import { buildUrnGraph, nodeOf, type PlanCardKey } from './graph';
import { evalChain } from './lineChain';
import {
  MUTATION_IDS,
  matchLine,
  mutationsFor,
  type Match,
  type MutationTable,
} from './mutations';

const q1 = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 1 });
const q1t = mutationsFor(q1);

function match(
  raw: string,
  card: PlanCardKey,
  opts: { credited?: string[]; graph?: typeof q1; table?: MutationTable } = {},
): Match {
  const line = evalChain(raw);
  if (line.kind === 'unreadable') {
    throw new Error(`unreadable: ${raw}`);
  }
  return matchLine({
    graph: opts.graph ?? q1,
    table: opts.table ?? q1t,
    card,
    credited: new Set(opts.credited ?? []),
    line,
  });
}
const idOf = (m: Match): string =>
  m.kind === 'mutation'
    ? `${m.candidate.id}@${m.candidate.nodeId}:${m.strength}`
    : m.kind;

describe('the mutation table of question 1 (4 red, 6 black, 3 together)', () => {
  const values = (node: string): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    for (const c of q1t.kept.filter(x => x.nodeId === node)) {
      (out[c.id] ??= []).push(ratToString(c.value));
    }
    return out;
  };

  it('the total: 720, 240, 360, 480, 30 and the shifted starts', () => {
    const t = values('total');
    expect(t.drop_division).toEqual(['720']);
    expect(t.divide_by_k_not_k_factorial).toEqual(['240']);
    expect(t.one_factor_divided).toEqual(['360']);
    expect(t.bracket_left_to_right).toEqual(['480']);
    expect(t.n_times_k).toEqual(['30']);
    expect(t.start_number_off).toEqual(
      expect.arrayContaining(['286', '165', '84', '156', '132', '108']),
    );
  });

  it('the black part, the one-ball choice, the favourable count, the result', () => {
    expect(values('fav_black').drop_division).toEqual(['30']);
    expect(values('fav_black').n_times_k).toEqual(['12']);
    expect(values('fav_red').over_generalised_order_rule).toEqual(['1']);
    expect(values('fav').add_instead_of_multiply).toEqual(['19']);
    expect(values('fav').missing_part?.sort()).toEqual(['15', '4']);
    expect(values('fav').ordered_instead_of_groups).toEqual(['120']);
    expect(values('result').swap_numerator_denominator).toEqual(['2']);
    expect(values('result').ordered_instead_of_groups).toEqual(['1/12']);
  });

  it('a mutation equal to the right value is dropped, never labelled wrong (k = 2: k = k!, and "x1")', () => {
    const dropped = q1t.dropped
      .filter(d => d.nodeId === 'fav_black')
      .map(d => d.id);
    expect(dropped).toEqual(
      expect.arrayContaining([
        'divide_by_k_not_k_factorial',
        'bracket_left_to_right',
      ]),
    );
    for (const c of q1t.kept) {
      expect(sameRat(c.value, nodeOf(q1, c.nodeId).value)).toBe(false);
    }
  });

  it('question 1 has no two different slips with the same value at one node', () => {
    expect(q1t.ambiguous).toEqual([]);
  });

  it('knows twelve ids, as the plan lists them', () => {
    expect(MUTATION_IDS).toHaveLength(12);
    expect(MUTATION_IDS).toContain('unsimplified');
  });
});

describe('a right line is credited by value, whatever the derivation', () => {
  it('10*9*8/(3*2*1) = 120: the total, written as expected', () => {
    const m = match('10*9*8/(3*2*1) = 120', 'total');
    expect(m).toMatchObject({ kind: 'credit', derivation: 'exact' });
    expect(m.kind === 'credit' && m.node.id).toBe('total');
  });

  it('720/6, 10×9×8÷(3×2) and an unforeseen derivation are credited too', () => {
    expect(match('720/6 = 120', 'total')).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    });
    expect(match('1200/10 = 120', 'total')).toMatchObject({
      kind: 'credit',
      derivation: 'other',
    });
    expect(match('10×9×8÷(3×2) = 120', 'total')).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    });
  });

  it('the ordered product 10*9*8 = 720 is a supporting step, not the total (and not a slip)', () => {
    const m = match('10*9*8 = 720', 'total');
    expect(m.kind).toBe('support');
    expect(m.kind === 'support' && m.node.id).toBe('ord');
    const k = match('3*2*1 = 6', 'total');
    expect(k.kind === 'support' && k.node.id).toBe('orderings'); // abc has 6 orderings
  });

  it('a bare number is credited as unexplained unless the node allows it', () => {
    expect(match('4', 'fav')).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    }); // the one-ball choice
    expect(match('15', 'fav')).toMatchObject({
      kind: 'credit',
      derivation: 'absent',
    });
    expect(match('120', 'total')).toMatchObject({
      kind: 'credit',
      derivation: 'absent',
    });
  });

  it('6*5/2*1 = 15 is the same factors as 6*5/(2*1): no false slip (the "x1" changes nothing)', () => {
    expect(match('6*5/2*1 = 15', 'fav')).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    });
  });

  it('4*15 = 60 and 4*6*5/(2*1) = 60 are the favourable count', () => {
    expect(match('4*15 = 60', 'fav')).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    });
    expect(match('4*6*5/(2*1) = 60', 'fav')).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    });
  });

  it('the result: 60/120 = 1/2 is credited; 60/120 = 5/10 is credited but unsimplified', () => {
    expect(match('60/120 = 1/2', 'ratio')).toMatchObject({
      kind: 'credit',
      unsimplified: false,
    });
    expect(match('60/120 = 5/10', 'ratio')).toMatchObject({
      kind: 'credit',
      unsimplified: true,
    });
  });

  it('25/55 is not in lowest terms (the owner, cold urn 5 red 6 black)', () => {
    const cold = buildUrnGraph({ reds: 5, blacks: 6, k: 3, j: 1 });
    const t = mutationsFor(cold);
    const m = match('75/165 = 25/55', 'ratio', { graph: cold, table: t });
    expect(m).toMatchObject({ kind: 'credit', unsimplified: true });
    expect(
      match('75/165 = 5/11', 'ratio', { graph: cold, table: t }),
    ).toMatchObject({
      kind: 'credit',
      unsimplified: false,
    });
  });
});

describe('a slip is labelled by value AND structure', () => {
  it('10*9*8/3*2*1 = 480 is bracket_left_to_right, confirmed', () => {
    expect(idOf(match('10*9*8/3*2*1 = 480', 'total'))).toBe(
      'bracket_left_to_right@total:confirmed',
    );
  });

  it("the owner's cold urn: 990/3*2*1 = 660 against 990/(3*2*1) = 165", () => {
    const cold = buildUrnGraph({ reds: 5, blacks: 6, k: 3, j: 1 });
    const t = mutationsFor(cold);
    expect(
      idOf(match('990/3*2*1 = 660', 'total', { graph: cold, table: t })),
    ).toBe('bracket_left_to_right@total:confirmed');
    expect(
      match('990/(3*2*1) = 165', 'total', { graph: cold, table: t }),
    ).toMatchObject({
      kind: 'credit',
      derivation: 'exact',
    });
  });

  it('10*9*8/3 = 240 is dividing by k, not by k!; a bare 240 is only asked about', () => {
    expect(idOf(match('10*9*8/3 = 240', 'total'))).toBe(
      'divide_by_k_not_k_factorial@total:confirmed',
    );
    expect(idOf(match('240', 'total'))).toBe(
      'divide_by_k_not_k_factorial@total:asked',
    );
  });

  it('6*5 = 30 for the black pairs is the division missing (the owner: 5x4 without /(2x1))', () => {
    expect(idOf(match('6*5 = 30', 'fav'))).toBe(
      'drop_division@fav_black:confirmed',
    );
    const learn = buildUrnGraph({ reds: 3, blacks: 5, k: 3, j: 1 });
    const t = mutationsFor(learn);
    expect(idOf(match('5*4 = 20', 'fav', { graph: learn, table: t }))).toBe(
      'drop_division@fav_black:confirmed',
    );
    expect(
      match('(5*4)/(2*1) = 10', 'fav', { graph: learn, table: t }),
    ).toMatchObject({
      kind: 'credit',
    });
  });

  it('the start number shifted: (8+3) as the first factor (the owner), and a whole product shifted', () => {
    const learn = buildUrnGraph({ reds: 3, blacks: 5, k: 3, j: 1 });
    const t = mutationsFor(learn);
    expect(
      idOf(
        match('(8+3)*7*6/(3*2*1) = 77', 'total', { graph: learn, table: t }),
      ),
    ).toBe('start_number_off@total:confirmed');
    expect(
      idOf(match('11*10*9/(3*2*1) = 165', 'total', { graph: learn, table: t })),
    ).toBe('start_number_off@total:confirmed');
  });

  it('+ for ×, a missing part, the ordered black pairs', () => {
    expect(idOf(match('4+15 = 19', 'fav'))).toBe(
      'add_instead_of_multiply@fav:confirmed',
    );
    expect(idOf(match('4*30 = 120', 'fav'))).toBe(
      'ordered_instead_of_groups@fav:confirmed',
    );
    expect(idOf(match('15', 'fav', { credited: [] }))).toBe('credit'); // 15 alone is the black pairs
  });

  it('1 for the one-ball choice: an order rule carried to one ball (the owner: R1 R2 = 1)', () => {
    expect(idOf(match('1', 'fav'))).toBe(
      'over_generalised_order_rule@fav_red:confirmed',
    );
  });

  it('the result upside down is a slip, and so is the ordered denominator', () => {
    expect(idOf(match('120/60 = 2', 'ratio'))).toBe(
      'swap_numerator_denominator@result:confirmed',
    );
    const learn = buildUrnGraph({ reds: 3, blacks: 5, k: 3, j: 1 });
    const t = mutationsFor(learn);
    expect(
      idOf(match('56/30 = 28/15', 'ratio', { graph: learn, table: t })),
    ).toBe('swap_numerator_denominator@result:confirmed');
    expect(idOf(match('60/720 = 1/12', 'ratio'))).toBe(
      'ordered_instead_of_groups@result:confirmed',
    );
  });

  it("the slip's value written another way (60*4 = 240) is only asked about, and 720/3 is confirmed", () => {
    expect(idOf(match('60*4 = 240', 'total'))).toBe(
      'divide_by_k_not_k_factorial@total:asked',
    );
    expect(idOf(match('720/3 = 240', 'total'))).toBe(
      'divide_by_k_not_k_factorial@total:confirmed',
    );
  });
});

describe('which step a line belongs to', () => {
  it('the value of a later step, written now, is "another step", not a slip', () => {
    const m = match('60', 'total');
    expect(m.kind).toBe('other_step');
    expect(m.kind === 'other_step' && m.node.id).toBe('fav');
  });

  it('the value of an earlier credited line, copied into a later step, is a repeat', () => {
    const m = match('120', 'fav', { credited: ['total'] });
    expect(m.kind).toBe('repeat');
  });

  it('the same result again in its own card is a repeat too', () => {
    expect(
      match('10*9*8/(3*2*1) = 120', 'total', { credited: ['total'] }).kind,
    ).toBe('repeat');
  });

  it('a value nobody expects is generic', () => {
    expect(match('7', 'total').kind).toBe('generic');
  });
});

describe('value-only candidates from the content (authored wrong answers, procedures)', () => {
  it('are used after the mutations, and only on a value match', () => {
    const line = evalChain('1000');
    if (line.kind === 'unreadable') {
      throw new Error('x');
    }
    const m = matchLine({
      graph: q1,
      table: q1t,
      card: 'total',
      credited: new Set(),
      line,
      extra: [{ value: [1000, 1], misconceptionId: 'draws_with_replacement' }],
    });
    expect(m).toMatchObject({ kind: 'value_only' });
  });
});

describe('unfinished and unequal lines are not matched', () => {
  it('8+3 is unfinished', () => {
    const line = evalChain('8+3');
    if (line.kind === 'unreadable') {
      throw new Error('x');
    }
    expect(
      matchLine({
        graph: q1,
        table: q1t,
        card: 'total',
        credited: new Set(),
        line,
      }).kind,
    ).toBe('unfinished');
  });
  it('336/6 = 55 is a mismatch at the first "="', () => {
    const line = evalChain('336/6 = 55');
    if (line.kind === 'unreadable') {
      throw new Error('x');
    }
    expect(
      matchLine({
        graph: q1,
        table: q1t,
        card: 'total',
        credited: new Set(),
        line,
      }),
    ).toEqual({ kind: 'mismatch', at: 0 });
  });
});

describe('property: over a grid of small urns, a match never credits a wrong value', () => {
  it('every mutation, written as the table writes it, is recognised or honestly ambiguous', () => {
    let seen = 0;
    for (let reds = 2; reds <= 6; reds++) {
      for (let blacks = 2; blacks <= 6; blacks++) {
        for (const k of [2, 3]) {
          for (let j = 0; j <= k; j++) {
            if (reds + blacks < k || j > reds || k - j > blacks) {
              continue;
            }
            const g = buildUrnGraph({ reds, blacks, k, j });
            const t = mutationsFor(g);
            for (const c of t.kept) {
              const card = nodeOf(g, c.nodeId).planCard;
              const raw = `${c.exprs[0]!} = ${ratToString(c.value)}`;
              const line = evalChain(raw);
              if (line.kind !== 'chain' || !line.equal) {
                continue; // a candidate whose own writing is not a readable equal chain is skipped
              }
              const m = matchLine({
                graph: g,
                table: t,
                card,
                credited: new Set(),
                line,
              });
              seen++;
              if (m.kind === 'credit' || m.kind === 'support') {
                expect(sameRat(m.node.value, c.value)).toBe(true);
              } else if (m.kind === 'mutation') {
                expect(sameRat(m.candidate.value, c.value)).toBe(true);
              } else {
                expect([
                  'ambiguous',
                  'other_step',
                  'repeat',
                  'value_only',
                ]).toContain(m.kind);
              }
            }
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(300);
  });
});
