/**
 * Question 2 of bac2022c-sc-ex2 (P(B), "aucune boule rouge"), authored as DATA
 * on the machinery of Question 1: the fast path (8 acts), its slips, the claim
 * test against "not A", each repair inside its 10 acts, and that nothing here
 * needed a line of the lesson engine.
 */
import { stepKey } from '../../content/loader';
import { THRESHOLDS } from '../../state/config';
import { loadSc2, MethodSession } from './methodTestkit';

const loaded = loadSc2();
const open = () => new MethodSession(loaded, '2');
const at = (frame: string) => {
  const s = open();
  s.act({ type: 'answer', value: { plan: ['c_total', 'c_fav', 'c_ratio'] } });
  s.until(frame);
  return s;
};

describe('Q2 route and fast path', () => {
  it('is a method block of the same shape as Q1: opening, plan, read, three frames, claim, picture, recipe, two similar questions', () => {
    const steps = loaded.exercise.parts
      .find(p => p.id === '2')!
      .groups.flatMap(g => g.steps);
    expect(steps.map(s => s.id)).toEqual([
      's1',
      'm2.opening',
      'm2.plan',
      'm2.read',
      'm2.c_total',
      'm2.c_fav',
      'm2.c_ratio',
      'm2.p_claim',
      'm2.x_area',
      'm2.recipe',
      'm2.sim_same',
      'm2.sim_twist',
    ]);
  });

  it('no mistake: 8 acts to the recipe (budget by block id), all right, no hint', () => {
    const s = open();
    s.until('m2.sim_same');
    expect(s.openId).toBe('m2.sim_same');
    expect(s.acts).toBe(THRESHOLDS.methodFastActs.m2);
    expect(s.acts).toBe(8);
    expect(s.answers.every(e => e.t === 'answer' && e.correct)).toBe(true);
    expect(s.events.some(e => e.t === 'hint' || e.t === 'not_sure')).toBe(
      false,
    );
  });

  it('the total of Question 1 may be written bare: it depends on the box and the draw only', () => {
    const s = at('m2.c_total');
    s.line('120');
    expect(s.answers.at(-1)).toMatchObject({ correct: true });
    expect(s.openId).toBe('m2.c_fav');
  });

  it('both similar questions end the part, every line credited', () => {
    const s = open();
    s.until('m2.sim_same');
    while (s.right()) {
      // plays the similar questions
    }
    expect(s.state.finished).toBe(true);
    const review = s.notes.filter(n => n.kind === 'review');
    expect(review.length).toBeGreaterThanOrEqual(6);
    expect(
      review.every(n => n.kind === 'review' && n.outcome === 'credit'),
    ).toBe(true);
  });
});

describe('the slips of the favourable and result frames', () => {
  const slips: [string, string, string][] = [
    ['m2.c_fav', '6*5*4 = 120', 'mut.drop_division'],
    ['m2.c_fav', '4*3*2/(3*2*1) = 4', 'mut.colour_swapped'],
    ['m2.c_fav', '60', 'mut.a_count_for_b'],
    ['m2.c_fav', '6*5*4/3*2*1 = 80', 'mut.bracket_left_to_right'],
    ['m2.c_fav', '6*3 = 18', 'mut.n_times_k'],
    ['m2.c_ratio', '1-60/120 = 1/2', 'mut.complement_of_A'],
    ['m2.c_ratio', '1-1/2 = 1/2', 'mut.complement_of_A'],
    ['m2.c_ratio', '120/20 = 6', 'mut.swap_numerator_denominator'],
    ['m2.c_ratio', '20/720 = 1/36', 'mut.ordered_instead_of_groups'],
  ];
  it.each(slips)('%s: %s -> %s', (frame, raw, id) => {
    const s = at(frame);
    s.line(raw);
    expect(s.answers.at(-1)).toMatchObject({
      correct: false,
      misconceptionId: id,
      inferredBy: 'mutation',
    });
  });

  it('20/120 is right but unsimplified: not the result yet; 1/6 closes the card', () => {
    const s = at('m2.c_ratio');
    s.line('20/120');
    expect(s.openId).toBe('m2.c_ratio');
    s.line('20/120 = 1/6');
    expect(s.openId).toBe('m2.p_claim');
  });
});

describe('the claim test: B against "not A"', () => {
  it('"B is the opposite of A" is falsified by the engine on his real numbers (60 predicted, 20 counted); the true card moves on', () => {
    const s = at('m2.p_claim');
    s.card('k_opposite');
    expect(s.answers.at(-1)).toMatchObject({
      correct: false,
      misconceptionId: 'mut.complement_of_A',
    });
    const row = s.notes.filter(n => n.kind === 'claim_result').at(-1);
    expect(row).toMatchObject({
      kind: 'claim_result',
      rows: [{ predicted: '60', actual: '20', holds: false }],
    });
    s.card('k_inside');
    s.act({
      type: 'card_choice',
      purpose: 'self_report',
      choice: 'understood',
    });
    expect(s.openId).toBe('m2.x_area');
  });

  it('"inside not-A" holds (20 is below 60) and shows its own comparison', () => {
    const s = at('m2.p_claim');
    s.card('k_inside');
    const row = s.notes.filter(n => n.kind === 'claim_result').at(-1);
    expect(row).toMatchObject({
      rows: [{ predicted: '\\le 60', actual: '20', holds: true }],
    });
  });
});

describe('each repair opens on its slip and closes inside 10 acts', () => {
  const cases: [string, () => MethodSession][] = [
    [
      'rep-2-box',
      () => {
        const s = at('m2.c_fav');
        s.line('4*3*2/(3*2*1) = 4');
        return s;
      },
    ],
    [
      'rep-2-claim',
      () => {
        const s = at('m2.c_ratio');
        s.line('1-60/120 = 1/2');
        return s;
      },
    ],
    [
      'rep-2-units',
      () => {
        const s = at('m2.c_ratio');
        s.line('20/720 = 1/36');
        return s;
      },
    ],
    [
      'rep-2-above-one',
      () => {
        const s = at('m2.c_ratio');
        s.line('120/20 = 6');
        return s;
      },
    ],
  ];
  it.each(cases)('%s', (id, setup) => {
    const s = setup();
    expect(s.offer).toBeTruthy();
    const parent = s.openId;
    s.acceptOffer();
    expect(s.openId).toBe(id);
    const before = s.acts;
    for (let g = 0; g < 30 && s.openId === id; g++) {
      s.right();
    }
    expect(s.openId).toBe(parent);
    expect(s.acts - before + 1).toBeLessThanOrEqual(
      THRESHOLDS.methodRepairActs,
    );
  });

  it('"ما نعرفش" twice at the plan offers the plan of Question 1 on his own numbers, then he re-orders', () => {
    const s = open();
    s.act({ type: 'not_sure' });
    s.act({ type: 'not_sure' });
    if (s.offer) {
      s.acceptOffer();
    }
    expect(s.openId).toBe('rep-2-plan');
    while (s.openId === 'rep-2-plan') {
      s.right();
    }
    expect(s.openId).toBe('m2.plan');
  });

  it('the claim box is the 3 red 4 black twin of the spec: 4 draws with no red, A = 18, "not A" = 17', () => {
    const v = loaded.exercise.variants.find(x => x.id === 'rep-2-claim')!;
    const st = v.step;
    if (st.kind !== 'mframe' || st.frame.type !== 'repair') {
      throw new Error('repair');
    }
    const list = st.frame.stages.find(x => x.type === 'list');
    expect(list).toMatchObject({ reds: 0, blacks: 4, k: 3 });
    const a = loaded.answers.get(stepKey.variant('rep-2-claim'));
    expect(
      a?.kind === 'method' && a.frame === 'repair' && a.stages[1]!.groups,
    ).toHaveLength(4);
  });
});

describe('nothing early', () => {
  it('hints 1 and 2 of the favourable frame hold no number', () => {
    const steps = loaded.exercise.parts
      .find(p => p.id === '2')!
      .groups.flatMap(g => g.steps);
    const fav = steps.find(s => s.id === 'm2.c_fav');
    if (fav?.kind !== 'mframe') {
      throw new Error('frame');
    }
    for (const h of (fav.hints ?? []).slice(0, 2)) {
      expect(JSON.stringify(h)).not.toMatch(/[0-9]/);
    }
  });

  it('a repair stage never shows 20 or 1/6 (the answer of the question)', () => {
    for (const v of loaded.exercise.variants.filter(x =>
      x.id.startsWith('rep-2-'),
    )) {
      expect(JSON.stringify(v.step)).not.toMatch(/\b(20|1\/6)\b/);
    }
  });
});
