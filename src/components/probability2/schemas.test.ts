import { choose } from '../../engine/combinatorics';
import {
  ChoiceProductPropsSchema,
  GroupBoxesPropsSchema,
  resolvedBoxMode,
} from './schemas';

const rn = (r: number, n: number) => [
  ...Array.from({ length: r }, (_, i) => ({
    id: `r${i + 1}`,
    value: 1,
    color: 'red' as const,
  })),
  ...Array.from({ length: n }, (_, i) => ({
    id: `n${i + 1}`,
    value: 0,
    color: 'black' as const,
  })),
];
const issues = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map(i => i.message).join(' | ') ?? '';

describe('GroupBoxes props', () => {
  it('the twin of step s4: 5 balls, 3 drawn: 10 boxes, shown all', () => {
    const r = GroupBoxesPropsSchema.safeParse({ balls: rn(2, 3), k: 3 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.groupBy).toBe('ball_set');
      expect(r.data.meantToDistinguish).toBe(true);
      expect(resolvedBoxMode(r.data)).toBe('show_all');
    }
  });

  it('the real urn (10 balls, k = 3: 120 boxes) is shown one box at a time, never listed', () => {
    const r = GroupBoxesPropsSchema.safeParse({ balls: rn(4, 6), k: 3 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(resolvedBoxMode(r.data)).toBe('one_box_expanded');
    }
    expect(
      GroupBoxesPropsSchema.safeParse({ balls: rn(4, 6), k: 3, mode: 'show_all' }).success,
    ).toBe(false);
  });

  it('12 balls with k = 4 (495 boxes) is accepted without being enumerated', () => {
    expect(choose(12, 4)).toBe(495);
    expect(
      GroupBoxesPropsSchema.safeParse({ balls: rn(6, 6), k: 4, mode: 'one_box_expanded' }).success,
    ).toBe(true);
  });

  it('k = 2 is refused for a teaching example: k = k! hides the 720/3 slip', () => {
    const r = GroupBoxesPropsSchema.safeParse({ balls: rn(2, 3), k: 2 });
    expect(r.success).toBe(false);
    expect(issues(r)).toMatch(/divide_by_k/);
    expect(
      GroupBoxesPropsSchema.safeParse({ balls: rn(2, 3), k: 2, meantToDistinguish: false }).success,
    ).toBe(true);
  });

  it('the other twin: 4 balls, k = 3: 4 boxes of 6 (24 / 3 = 8 is the slip)', () => {
    expect(GroupBoxesPropsSchema.safeParse({ balls: rn(2, 2), k: 3 }).success).toBe(true);
  });

  it('a property splits the boxes into slices (reds in the draw)', () => {
    const r = GroupBoxesPropsSchema.safeParse({
      balls: rn(4, 6),
      k: 3,
      groupBy: { property: { value: 1 } },
    });
    expect(r.success).toBe(true);
    // a property that splits nothing is refused
    expect(
      GroupBoxesPropsSchema.safeParse({ balls: rn(4, 6), k: 3, groupBy: { property: { value: 7 } } })
        .success,
    ).toBe(false);
  });

  it.each([
    ['k above 4', { balls: rn(5, 5), k: 5 }],
    ['k above the number of balls', { balls: rn(1, 2), k: 4 }],
    ['fewer than 3 balls', { balls: rn(1, 1), k: 2, meantToDistinguish: false }],
    ['13 balls', { balls: rn(7, 6), k: 3 }],
    ['duplicate ball ids', { balls: [{ id: 'a', value: 0 }, { id: 'a', value: 1 }, { id: 'b', value: 1 }], k: 3 }],
    ['an unknown prop', { balls: rn(2, 3), k: 3, draw: 'ordered' }],
    ['a mixed urn (colour on some balls only)', { balls: [...rn(1, 1), { id: 'z', value: 2 }], k: 3 }],
  ])('rejects %s', (_label, props) => {
    expect(GroupBoxesPropsSchema.safeParse(props).success).toBe(false);
  });
});

describe('ChoiceProduct props', () => {
  const reds = (n: number) => ({ balls: rn(n, 0), size: 1 });
  const blacks = (n: number, size: number) => ({ balls: rn(0, n), size });

  it('the real step: 1 of 4 reds AND 2 of 6 blacks (4 x 15 = 60), AND by default', () => {
    const r = ChoiceProductPropsSchema.safeParse({ stages: [reds(4), blacks(6, 2)] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe('and');
      expect(r.data.allowSwitch).toBe(true);
      expect(r.data.meantToDistinguish).toBe(true);
    }
  });

  it('the twin of step s6: 1 of 3 reds AND 2 of 4 blacks = 3 x 6 = 18', () => {
    expect(ChoiceProductPropsSchema.safeParse({ stages: [reds(3), blacks(4, 2)] }).success).toBe(true);
  });

  it('two stages of labels: starters x mains, never 2 x 2', () => {
    const labels = (xs: string[]) => ({ labels: xs, size: 1 });
    expect(
      ChoiceProductPropsSchema.safeParse({ stages: [labels(['a', 'b', 'c']), labels(['p', 'q', 'r', 's'])] })
        .success,
    ).toBe(true);
    const r = ChoiceProductPropsSchema.safeParse({ stages: [labels(['a', 'b']), labels(['p', 'q'])] });
    expect(r.success).toBe(false);
    expect(issues(r)).toMatch(/sum_instead_of_product/);
    expect(
      ChoiceProductPropsSchema.safeParse({
        stages: [labels(['a', 'b']), labels(['p', 'q'])],
        meantToDistinguish: false,
      }).success,
    ).toBe(true);
  });

  it('a stage that picks 1 of n is plain options, not a subset: 4 x 6 is fine', () => {
    expect(ChoiceProductPropsSchema.safeParse({ stages: [reds(4), blacks(6, 1)] }).success).toBe(true);
  });

  it('the guard sees a subset stage whose choices equal its balls: C(3,2) = 3', () => {
    const r = ChoiceProductPropsSchema.safeParse({ stages: [reds(2), blacks(3, 2)] });
    expect(r.success).toBe(false);
    expect(issues(r)).toMatch(/subset_as_n/);
  });

  it('caps: at most 15 options per stage, at most 8 items, exactly 2 stages', () => {
    expect(ChoiceProductPropsSchema.safeParse({ stages: [reds(4), blacks(8, 4)] }).success).toBe(false);
    expect(ChoiceProductPropsSchema.safeParse({ stages: [reds(4), { balls: rn(0, 6), size: 3 }] }).success).toBe(false); // C(6,3) = 20
    expect(ChoiceProductPropsSchema.safeParse({ stages: [reds(4)] }).success).toBe(false);
    expect(ChoiceProductPropsSchema.safeParse({ stages: [reds(3), reds(3), reds(3)] }).success).toBe(false);
  });

  it.each([
    ['both balls and labels', { balls: rn(3, 0), labels: ['a', 'b'], size: 1 }],
    ['neither', { size: 1 }],
    ['a size above the items', { balls: rn(2, 0), size: 3 }],
    ['a label with a space', { labels: ['a b', 'c'], size: 1 }],
    ['a label of Arabic letters', { labels: ['أ', 'b'], size: 1 }],
  ])('rejects a stage with %s', (_label, stage) => {
    expect(ChoiceProductPropsSchema.safeParse({ stages: [stage, reds(3)] }).success).toBe(false);
  });

  it('accepts the OR mode and no switch', () => {
    const r = ChoiceProductPropsSchema.safeParse({
      stages: [reds(4), blacks(6, 2)],
      mode: 'or',
      allowSwitch: false,
    });
    expect(r.success).toBe(true);
  });
});
