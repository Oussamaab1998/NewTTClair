import { frac, type Fraction } from '../engine/rational';
import type { UrnSpec } from './graph';
import {
  coldGuards,
  twinOk,
  type Forbidden,
  type GuardContext,
} from './guards';

const spec = (reds: number, blacks: number, k = 3, j = 1): UrnSpec => ({
  reds,
  blacks,
  k,
  j,
});
const ints = (...xs: number[]): Fraction[] => xs.map(x => frac(x));

/** What question 1 and the repairs have put on screen, and the owner's paper tests. */
const ctx: GuardContext = {
  used: [
    { reds: 4, blacks: 6 }, // question 1
    { reds: 3, blacks: 4 }, // the picture twin
    { reds: 3, blacks: 5 }, // plan help
  ],
  reserved: [
    { reds: 4, blacks: 5 },
    { reds: 5, blacks: 4 },
  ],
  shown: ints(
    120,
    60,
    720,
    240,
    30,
    19,
    24,
    48,
    360,
    1000,
    15,
    12,
    100,
    20,
    35,
    210,
    18,
    56,
    336,
  ),
};
const reasons = (s: UrnSpec, c: GuardContext = ctx) => coldGuards(s, c).reasons;

describe('cold-question guards, each on the real coincidence', () => {
  it('a + b = a x b between the two choices: 2 red 2 black, 2 together (2 + 2 = 2 x 2)', () => {
    expect(reasons(spec(2, 2, 2, 1))).toContain('parts_sum_equals_product');
  });

  it('k = k!: any pair draw', () => {
    expect(reasons(spec(3, 4, 2, 1))).toContain('draw_equals_factorial');
    expect(reasons(spec(5, 6, 3, 1))).not.toContain('draw_equals_factorial');
  });

  it('C(n,k) = n x k: 5 balls taken 2 at a time (10 = 5 x 2), also for the black pairs of 5 blacks', () => {
    expect(reasons(spec(2, 3, 2, 1))).toContain('choose_equals_n_times_k');
    expect(reasons(spec(6, 5, 3, 1))).toContain('choose_equals_n_times_k'); // C(5,2) = 10 = 5 x 2
  });

  it('"3 of 4": k = n - 1 makes as many groups as balls', () => {
    expect(reasons(spec(1, 3, 3, 1))).toContain('draw_is_all_but_one'); // 4 balls, 3 drawn
    expect(reasons(spec(7, 3, 3, 1))).toContain('draw_is_all_but_one'); // 3 blacks, 2 of them drawn
  });

  it("the urn of the question, the twins, and the owner's paper tests (either way round)", () => {
    for (const [r, b] of [
      [4, 6],
      [3, 4],
      [3, 5],
      [4, 5],
      [5, 4],
      [6, 4],
      [5, 3],
    ] as const) {
      expect(reasons(spec(r, b))).toContain('used_or_reserved');
    }
  });

  it('5 red 6 black fails: P = 75/165 = 5/11 is the single-ball probability and is built from the statement', () => {
    const r = reasons(spec(5, 6));
    expect(r).toContain('single_ball_equals_answer');
    expect(r).toContain('answer_from_statement');
    expect(coldGuards(spec(5, 6), ctx).ok).toBe(false);
  });

  it('an answer equal to a number shown earlier is refused (total 56 shown)', () => {
    const shown = { ...ctx, shown: ints(56) };
    expect(reasons(spec(3, 5), shown)).toContain('answer_shown_earlier'); // total 56
    expect(reasons(spec(3, 5), { ...ctx, shown: ints(57) })).not.toContain(
      'answer_shown_earlier',
    );
  });

  it('a mutation equal to the right value at a key node is refused', () => {
    // a pair taken from one colour: divide by k = divide by k!
    expect(reasons(spec(2, 6, 2, 0))).toContain('mutation_equals_right_value');
  });

  it('impossible urns are refused, not thrown', () => {
    expect(coldGuards(spec(1, 1, 3, 1), ctx).ok).toBe(false);
  });
});

describe('the guards leave enough urns to draw from', () => {
  it('reds 3..8, blacks 3..9, three together, exactly one red: at least 12 pass', () => {
    const open = ctx;
    const pass: string[] = [];
    for (let r = 3; r <= 8; r++) {
      for (let b = 3; b <= 9; b++) {
        if (coldGuards(spec(r, b), open).ok) {
          pass.push(`${r}R${b}B`);
        }
      }
    }
    expect(pass.length).toBeGreaterThanOrEqual(12);
    for (const bad of ['5R6B', '4R5B', '5R4B', '4R6B', '3R4B', '3R5B']) {
      expect(pass).not.toContain(bad);
    }
  });
});

describe('twin urns: role-blind and role-aware', () => {
  /** Question 1\'s wrong values by role, plus question 2\'s 20 draws (exercise-wide). */
  const q1: Forbidden = {
    total: [...ints(720, 240, 30, 1000, 480, 120, 360)],
    fav: [...ints(120, 60, 15, 19, 24, 48, 360, 12, 20)],
    result: [
      frac(2, 5),
      frac(5, 6),
      frac(1, 12),
      frac(19, 120),
      frac(1, 2),
      frac(1, 6),
    ],
  };

  it('3 red 5 black collides role-blind on 30 and 15, and passes role-aware', () => {
    const blind = twinOk(spec(3, 5), q1, { mode: 'role_blind' });
    expect(blind.ok).toBe(false);
    expect(blind.collisions.map(c => c.value).sort()).toEqual(['15', '30']);
    expect(twinOk(spec(3, 5), q1, { mode: 'role_aware' }).ok).toBe(true);
  });

  it("the printed allowance makes the owner's example acceptable, and is listed", () => {
    const r = twinOk(spec(3, 5), q1, { mode: 'role_blind', allow: [30, 15] });
    expect(r.ok).toBe(true);
    expect(r.allowed.map(a => a.value).sort()).toEqual(['15', '30']);
  });

  it("2 red 5 black has 20 favourable draws, which is question 2's count: refused role-aware", () => {
    const r = twinOk(spec(2, 5), q1, { mode: 'role_aware' });
    expect(r.ok).toBe(false);
    expect(r.collisions).toEqual([{ role: 'fav', value: '20' }]);
  });

  it('small numbers (balls, k) are never a collision', () => {
    const r = twinOk(
      spec(3, 4),
      { total: ints(3, 4, 6, 7), fav: ints(3, 4, 6), result: [] },
      { mode: 'role_blind' },
    );
    expect(r.ok).toBe(true);
  });
});
