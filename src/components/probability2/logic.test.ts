import { frac, type Fraction } from '../../engine/rational';
import { completeReveals, revealedByRules } from '../reveals';
import {
  CHOICE_PRODUCT_REVEALS,
  GROUP_BOXES_REVEALS,
  boxesFinding,
  boxesModel,
  choiceFinding,
  choiceModel,
  combinations,
} from './logic';
import {
  ChoiceProductPropsSchema,
  GroupBoxesPropsSchema,
  type ChoiceProductProps,
  type GroupBoxesProps,
} from './schemas';
import { FindingPayloadSchema } from './finding';

const rn = (r: number, n: number) => [
  ...Array.from({ length: r }, (_, i) => ({ id: `r${i + 1}`, value: 1, color: 'red' as const })),
  ...Array.from({ length: n }, (_, i) => ({ id: `n${i + 1}`, value: 0, color: 'black' as const })),
];
const boxesProps = (raw: unknown): GroupBoxesProps => GroupBoxesPropsSchema.parse(raw);
const choiceProps = (raw: unknown): ChoiceProductProps => ChoiceProductPropsSchema.parse(raw);
const is = (n: number) => (f: Fraction) => f[0] === n && f[1] === 1;

describe('boxesModel', () => {
  it('the twin of s4 (5 balls, 3 drawn): 10 boxes x 6 orderings = 60 ordered draws', () => {
    const m = boxesModel(boxesProps({ balls: rn(2, 3), k: 3 }));
    expect([m.boxes, m.perBox, m.ordered]).toEqual([10, 6, 60]);
    expect(m.mode).toBe('show_all');
    expect(m.list).toHaveLength(10);
    expect(m.slices).toBeNull();
    expect(m.calc).toEqual(['10 \\times 6 = 60', 'C_{5}^{3} = 10']);
  });

  it('the other twin (4 balls): 4 boxes x 6 = 24, and 24 / 3 = 8 is the slip', () => {
    const m = boxesModel(boxesProps({ balls: rn(2, 2), k: 3 }));
    expect([m.boxes, m.perBox, m.ordered]).toEqual([4, 6, 24]);
  });

  it('the box shown first is a mixed one (red and black), not the first in urn order (all red)', () => {
    const twin = boxesModel(boxesProps({ balls: rn(3, 4), k: 3 }));
    expect(twin.list![0]!.key).toBe('r1-r2-r3');
    expect(twin.list![twin.start]!.key).toBe('r1-r2-n1');
    expect(twin.mode).toBe('one_box_expanded');
    const real = boxesModel(boxesProps({ balls: rn(4, 6), k: 3 }));
    expect(real.list![real.start]!.key).toBe('r1-r2-n1');
    // no colours: the first box
    const plain = boxesModel(
      boxesProps({ balls: [0, 1, 2, 3, 4].map(v => ({ id: `b${v}`, value: v })), k: 3 }),
    );
    expect(plain.start).toBe(0);
    // slices: no list, no start
    const slices = boxesModel(boxesProps({ balls: rn(4, 6), k: 3, groupBy: { property: { value: 1 } } }));
    expect(slices.start).toBe(0);
  });

  it('the real urn, one box at a time: 120 boxes x 6 = 720 (never listed on screen)', () => {
    const m = boxesModel(boxesProps({ balls: rn(4, 6), k: 3 }));
    expect([m.boxes, m.perBox, m.ordered, m.mode]).toEqual([120, 6, 720, 'one_box_expanded']);
    expect(m.list).toHaveLength(120);
  });

  it('a property: slices of boxes 20, 60, 36, 4 (reds in the draw)', () => {
    const m = boxesModel(boxesProps({ balls: rn(4, 6), k: 3, groupBy: { property: { value: 1 } } }));
    expect(m.slices?.map(s => s.count)).toEqual([20, 60, 36, 4]);
    expect(m.slices?.reduce((s, x) => s + x.count, 0)).toBe(120);
  });

  it('labels the balls R1 / N1 style, the same way the urn does', () => {
    const m = boxesModel(boxesProps({ balls: rn(2, 3), k: 3 }));
    expect(m.labels.get('r1')).toBe('R₁');
    expect(m.labels.get('n3')).toBe('N₃');
  });
});

describe('boxesFinding', () => {
  it('a found finding: boxes, orderings per box, ordered draws, and the calculation with the engine numbers', () => {
    const m = boxesModel(boxesProps({ balls: rn(2, 3), k: 3 }));
    const f = boxesFinding(m, ['expand:r1-r2-n1'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'groupboxes.orderings_per_box',
      numbers: { boxes: '10', perBox: '6', ordered: '60' },
      how: 'found',
      correct: null,
      calc: ['10 \\times 6 = 60', 'C_{5}^{3} = 10'],
    });
  });
  it('a skipped finding is never correct, and says so', () => {
    const m = boxesModel(boxesProps({ balls: rn(2, 3), k: 3 }));
    const f = boxesFinding(m, ['reveal'], 'skipped');
    expect(f.how).toBe('skipped');
    expect(f.correct).toBeNull();
  });
  it('the slices finding', () => {
    const m = boxesModel(boxesProps({ balls: rn(4, 6), k: 3, groupBy: { property: { value: 1 } } }));
    const f = boxesFinding(m, ['slice:1'], 'found');
    expect(f.findingId).toBe('groupboxes.slices');
    expect(f.numbers).toMatchObject({ total: '120', slice0: '20', slice1: '60', slice2: '36', slice3: '4' });
  });
});

describe('combinations', () => {
  it('in reading order', () => {
    expect(combinations([1, 2, 3, 4], 2)).toEqual([
      [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
    ]);
    expect(combinations(['a', 'b', 'c'], 1)).toEqual([['a'], ['b'], ['c']]);
    expect(combinations([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });
});

describe('choiceModel', () => {
  it('the real step: 4 reds AND 2 of 6 blacks: 4, 15, product 60, sum 19', () => {
    const m = choiceModel(
      choiceProps({ stages: [{ balls: rn(4, 0), size: 1 }, { balls: rn(0, 6), size: 2 }] }),
    );
    expect(m.counts).toEqual([4, 15]);
    expect([m.product, m.sum]).toEqual([60, 19]);
    expect(m.stages[1]!.options).toHaveLength(15);
    expect(m.stages[1]!.options[0]!.map(i => i.label)).toEqual(['N₁', 'N₂']);
    expect(m.stages[1]!.options.at(-1)!.map(i => i.label)).toEqual(['N₅', 'N₆']);
    expect(m.stages[1]!.subset).toBe(true);
    expect(m.stages[0]!.subset).toBe(false);
  });

  it('the twin of s6: 3 reds AND 2 of 4 blacks: 3, 6, product 18, sum 9', () => {
    const m = choiceModel(
      choiceProps({ stages: [{ balls: rn(3, 0), size: 1 }, { balls: rn(0, 4), size: 2 }] }),
    );
    expect(m.counts).toEqual([3, 6]);
    expect([m.product, m.sum]).toEqual([18, 9]);
  });

  it('labels as items: starters x mains', () => {
    const m = choiceModel(
      choiceProps({
        stages: [{ labels: ['soup', 'salad', 'egg'], size: 1 }, { labels: ['fish', 'beef', 'rice', 'pie'], size: 1 }],
      }),
    );
    expect(m.counts).toEqual([3, 4]);
    expect([m.product, m.sum]).toEqual([12, 7]);
    expect(m.stages[0]!.options[1]!.map(i => i.label)).toEqual(['salad']);
  });
});

describe('choiceFinding', () => {
  const m = choiceModel(
    choiceProps({ stages: [{ balls: rn(3, 0), size: 1 }, { balls: rn(0, 4), size: 2 }] }),
  );
  it('and: numbers and the calculation from the student\'s picks', () => {
    const f = choiceFinding(m, 'and', ['pick:1:0', 'pick:2:3'], 'found');
    expect(FindingPayloadSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({
      findingId: 'choiceproduct.and',
      numbers: { stage1: '3', stage2: '6', total: '18' },
      calc: ['C_{4}^{2} = 6', '3 \\times 6 = 18'],
    });
  });
  it('or: the sum', () => {
    const f = choiceFinding(m, 'or', ['pick:1:0', 'switch:or'], 'found');
    expect(f.findingId).toBe('choiceproduct.or');
    expect(f.numbers).toMatchObject({ total: '9' });
    expect(f.calc).toEqual(['C_{4}^{2} = 6', '3 + 6 = 9']);
  });
  it('skipped: not correct', () => {
    expect(choiceFinding(m, 'and', ['reveal'], 'skipped').how).toBe('skipped');
  });
});

describe('reveals: what each component puts on screen by construction', () => {
  it('both declare their reveals completely', () => {
    expect(completeReveals(GROUP_BOXES_REVEALS)).toBe(true);
    expect(completeReveals(CHOICE_PRODUCT_REVEALS)).toBe(true);
  });

  const reveal = (rules: typeof GROUP_BOXES_REVEALS, props: unknown, answer: number) =>
    revealedByRules(rules, props as Record<string, unknown>, undefined, is(answer));

  it('GroupBoxes on the real urn gives away s4 (120 boxes, 120 draws): flagged', () => {
    expect(reveal(GROUP_BOXES_REVEALS, { balls: rn(4, 6), k: 3 }, 120)?.value).toBe('totals');
  });
  it('GroupBoxes on the twin does not: its numbers are 10, 6, 60', () => {
    expect(reveal(GROUP_BOXES_REVEALS, { balls: rn(2, 3), k: 3 }, 120)).toBeNull();
    // but it would give away a step whose answer is 10 or 60
    expect(reveal(GROUP_BOXES_REVEALS, { balls: rn(2, 3), k: 3 }, 10)).not.toBeNull();
    expect(reveal(GROUP_BOXES_REVEALS, { balls: rn(2, 3), k: 3 }, 60)).not.toBeNull();
  });
  it('the slices on the real urn give away the count of A (60)', () => {
    expect(
      reveal(GROUP_BOXES_REVEALS, { balls: rn(4, 6), k: 3, groupBy: { property: { value: 1 } } }, 60)?.value,
    ).toBe('slice_counts');
  });
  it('ChoiceProduct on the real step gives away s6 (60); on the twin it does not (18)', () => {
    const real = { stages: [{ balls: rn(4, 0), size: 1 }, { balls: rn(0, 6), size: 2 }] };
    const twin = { stages: [{ balls: rn(3, 0), size: 1 }, { balls: rn(0, 4), size: 2 }] };
    expect(reveal(CHOICE_PRODUCT_REVEALS, real, 60)?.value).toBe('total');
    expect(reveal(CHOICE_PRODUCT_REVEALS, twin, 60)).toBeNull();
    expect(reveal(CHOICE_PRODUCT_REVEALS, twin, 18)?.value).toBe('total');
  });
  it('props that do not parse reveal nothing (the host shows its fallback instead)', () => {
    expect(reveal(GROUP_BOXES_REVEALS, { balls: 'x' }, 10)).toBeNull();
    expect(reveal(CHOICE_PRODUCT_REVEALS, {}, 10)).toBeNull();
    expect(GROUP_BOXES_REVEALS.every(r => r.minHint !== undefined)).toBe(true);
    expect(frac(1)).toEqual([1, 1]);
  });
});
