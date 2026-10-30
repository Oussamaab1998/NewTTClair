/**
 * Question 3 of bac2022c-sc-ex2 (the binomial law, then E(X) and V(X)),
 * authored as DATA on the machinery of Questions 1 and 2: both fast paths,
 * the slips of the owner's play, the formula cards falsified by HIS numbers,
 * each repair inside its 10 acts.
 */
import { stepKey } from '../../content/loader';
import { THRESHOLDS } from '../../state/config';
import { loadSc2, MethodSession } from './methodTestkit';

const loaded = loadSc2();
const A = () => new MethodSession(loaded, '3a');
const B = () => new MethodSession(loaded, '3b');
const atA = (frame: string) => {
  const s = A();
  s.act({
    type: 'answer',
    value: { plan: ['c_type', 'c_seq', 'c_count', 'c_law'] },
  });
  s.until(frame);
  return s;
};
const atB = (frame: string) => {
  const s = B();
  s.act({
    type: 'answer',
    value: { plan: ['c_mean1', 'c_meann', 'c_var1', 'c_varn'] },
  });
  s.until(frame);
  return s;
};
const ids = (part: string) =>
  loaded.exercise.parts
    .find(p => p.id === part)!
    .groups.flatMap(g => g.steps)
    .map(s => s.id);

describe('3a: the law of X', () => {
  it('route: opening, plan, read, the recognise card, three frames, the formula, the picture, the recipe, two similar questions', () => {
    expect(ids('3a')).toEqual([
      's1',
      'm3a.opening',
      'm3a.plan',
      'm3a.read',
      'm3a.c_type',
      'm3a.c_seq',
      'm3a.c_count',
      'm3a.c_law',
      'm3a.p_formula',
      'm3a.x_explorer',
      'm3a.recipe',
      'm3a.sim_same',
      'm3a.sim_twist',
    ]);
  });

  it('no mistake: 9 acts (under the budget of 10), all right', () => {
    const s = A();
    s.until('m3a.sim_same');
    expect(s.openId).toBe('m3a.sim_same');
    expect(s.acts).toBe(9);
    expect(s.acts).toBeLessThanOrEqual(THRESHOLDS.methodFastActs.m3a!);
    expect(s.answers.every(e => e.t === 'answer' && e.correct)).toBe(true);
  });

  it('the plan can be ordered the student own way: the sequence before the type is refused with the card it needs', () => {
    const s = A();
    s.act({
      type: 'answer',
      value: { plan: ['c_seq', 'c_type', 'c_count', 'c_law'] },
    });
    expect(s.notes.some(n => n.kind === 'plan_violation')).toBe(true);
    expect(s.openId).toBe('m3a.plan');
  });

  it('the recognise card: "at least one" is the slip of the first question, answered with its own words', () => {
    const s = atA('m3a.c_type');
    s.card('t_least');
    expect(s.answers.at(-1)).toMatchObject({
      correct: false,
      misconceptionId: 'at_least_one_instead_of_exactly',
    });
    expect(s.openId).toBe('m3a.c_type');
  });

  const slips: [string, string, string][] = [
    ['m3a.c_seq', '1/2', 'mut.p_single_trial'],
    ['m3a.c_seq', '1/2*1/2 = 1/4', 'mut.forgets_failures'],
    ['m3a.c_seq', '7*1/2 = 7/2', 'mut.adds_instead_of_multiplies'],
    ['m3a.c_count', '7*6 = 42', 'mut.drop_division'],
    ['m3a.c_count', '7/2', 'mut.reads_choose_as_fraction'],
    ['m3a.c_count', '7*2 = 14', 'mut.n_times_k'],
    ['m3a.c_law', '1/128', 'mut.one_sequence_as_P_X_k'],
    ['m3a.c_law', '21', 'mut.count_given_as_probability'],
    ['m3a.c_law', '21*1/2*1/2 = 21/4', 'mut.law_forgets_failures'],
  ];
  it.each(slips)('%s: %s -> %s', (frame, raw, id) => {
    const s = atA(frame);
    s.line(raw);
    expect(s.answers.at(-1)).toMatchObject({
      correct: false,
      misconceptionId: id,
      inferredBy: 'mutation',
    });
  });

  it('the seven-factor sequence is accepted as a product and as its value', () => {
    const a = atA('m3a.c_seq');
    a.line('1/2*1/2*1/2*1/2*1/2*1/2*1/2 = 1/128');
    expect(a.answers.at(-1)).toMatchObject({ correct: true });
    expect(a.openId).toBe('m3a.c_count');
    const b = atA('m3a.c_seq');
    b.line('1/128');
    expect(b.answers.at(-1)).toMatchObject({ correct: true });
  });

  it('the count: 7*6/(2*1) = 21 (the division by 2 coincides at k = 2 and is dropped, never called wrong)', () => {
    const s = atA('m3a.c_count');
    s.line('7*6/2 = 21');
    expect(s.answers.at(-1)).toMatchObject({ correct: true });
  });

  it('a formula card is falsified by HIS numbers: 1/2^n gives 1/128, he counted 21/128', () => {
    const s = atA('m3a.p_formula');
    s.card('f2');
    expect(s.answers.at(-1)).toMatchObject({
      correct: false,
      misconceptionId: 'mut.one_sequence_as_P_X_k',
    });
    const rows = s.notes.filter(n => n.kind === 'claim_result').at(-1);
    expect(rows).toMatchObject({
      rows: [
        {
          label: 'n = 7,\\ k = 2',
          predicted: '1/128',
          actual: '21/128',
          holds: false,
        },
        { predicted: '1/64', actual: '15/64', holds: false },
        { predicted: '1/32', actual: '5/32', holds: false },
      ],
    });
  });

  it('the true formula holds on his case and on two engine cases', () => {
    const s = atA('m3a.p_formula');
    s.card('f1');
    const rows = s.notes.filter(n => n.kind === 'claim_result').at(-1);
    expect(rows?.kind === 'claim_result' && rows.rows.every(r => r.holds)).toBe(
      true,
    );
    expect(rows?.kind === 'claim_result' && rows.rows).toHaveLength(3);
  });

  const repairs: [string, () => MethodSession][] = [
    [
      'rep-3a-box',
      () => {
        const s = atA('m3a.c_count');
        s.line('7/2');
        return s;
      },
    ],
    [
      'rep-3a-bridge',
      () => {
        const s = atA('m3a.c_count');
        s.line('7*2 = 14');
        return s;
      },
    ],
    [
      'rep-3a-independence',
      () => {
        const s = atA('m3a.c_seq');
        s.line('7*1/2 = 7/2');
        return s;
      },
    ],
    [
      'rep-3a-law',
      () => {
        const s = atA('m3a.c_law');
        s.line('1/128');
        return s;
      },
    ],
  ];
  it.each(repairs)(
    '%s opens on its slip and closes inside 10 acts',
    (id, setup) => {
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
    },
  );

  it('"ما نعرفش" twice at the plan offers the n = 2 table; he re-orders after it', () => {
    const s = A();
    s.act({ type: 'not_sure' });
    s.act({ type: 'not_sure' });
    if (s.offer) {
      s.acceptOffer();
    }
    expect(s.openId).toBe('rep-3a-plan');
    while (s.openId === 'rep-3a-plan') {
      s.right();
    }
    expect(s.openId).toBe('m3a.plan');
  });

  it('both similar questions end the part with every line credited', () => {
    const s = A();
    s.until('m3a.sim_same');
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

  it('the twist (without replacement) labels the binomial answer 54/125 by name', () => {
    const a = loaded.answers.get(stepKey.main('3a', 'm3a.sim_twist'));
    if (a?.kind !== 'method' || a.frame !== 'similar') {
      throw new Error('similar');
    }
    expect(a.table.kept.some(c => c.id === 'binomial_for_dependent')).toBe(
      true,
    );
  });
});

describe('3b: E(X) and V(X)', () => {
  it('route: opening, plan, read, four frames, the pair of formulas, the recipe, two similar questions', () => {
    expect(ids('3b')).toEqual([
      's1',
      'm3b.opening',
      'm3b.plan',
      'm3b.read',
      'm3b.c_mean1',
      'm3b.c_meann',
      'm3b.c_var1',
      'm3b.c_varn',
      'm3b.p_formula',
      'm3b.recipe',
      'm3b.sim_same',
      'm3b.sim_twist',
    ]);
  });

  it('no mistake: 8 acts = the budget, all right', () => {
    const s = B();
    s.until('m3b.sim_same');
    expect(s.acts).toBe(8);
    expect(s.acts).toBe(THRESHOLDS.methodFastActs.m3b);
    expect(s.answers.every(e => e.t === 'answer' && e.correct)).toBe(true);
  });

  const slips: [string, string, string][] = [
    ['m3b.c_meann', '1/2', 'mut.mean_of_one_trial_for_n'],
    ['m3b.c_meann', '7', 'mut.n_instead_of_np'],
    ['m3b.c_var1', '1/2', 'mut.variance_as_mean'],
    ['m3b.c_varn', '1/4', 'mut.variance_forgets_n'],
    ['m3b.c_varn', '7*1/2 = 7/2', 'mut.variance_as_mean'],
  ];
  it.each(slips)('%s: %s -> %s', (frame, raw, id) => {
    const s = atB(frame);
    s.line(raw);
    expect(s.answers.at(-1)).toMatchObject({
      correct: false,
      misconceptionId: id,
      inferredBy: 'mutation',
    });
  });

  it('p squared coincides with p q at p = 1/2: the right 1/4 is never called wrong (the exam trap, dropped and listed)', () => {
    const s = atB('m3b.c_var1');
    s.line('1/2*1/2 = 1/4');
    expect(s.answers.at(-1)).toMatchObject({ correct: true });
  });

  it('the pair of formulas is tested on n = 7 (his) and n = 10: "V = n/2" fails on both of his numbers', () => {
    const s = atB('m3b.p_formula');
    s.card('g2');
    expect(s.answers.at(-1)).toMatchObject({
      correct: false,
      misconceptionId: 'mut.variance_as_mean',
    });
    const note = s.notes.filter(n => n.kind === 'claim_result').at(-1);
    expect(note?.kind === 'claim_result' && note.rows).toHaveLength(4);
    expect(note).toMatchObject({
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'V(X),\\ n = 7',
          predicted: '7/2',
          actual: '7/4',
          holds: false,
        }),
        expect.objectContaining({
          label: 'V(X),\\ n = 10',
          predicted: '5',
          actual: '5/2',
          holds: false,
        }),
      ]),
    });
  });

  const repairs: [string, () => MethodSession][] = [
    [
      'rep-3b-spread',
      () => {
        const s = atB('m3b.c_var1');
        s.line('1/2');
        return s;
      },
    ],
    [
      'rep-3b-runs',
      () => {
        const s = atB('m3b.c_meann');
        s.line('7');
        return s;
      },
    ],
    [
      'rep-3b-independence',
      () => {
        const s = atB('m3b.c_varn');
        s.line('1/4');
        return s;
      },
    ],
  ];
  it.each(repairs)(
    '%s opens on its slip and closes inside 10 acts',
    (id, setup) => {
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
    },
  );

  it('both similar questions end the part with every line credited', () => {
    const s = B();
    s.until('m3b.sim_same');
    while (s.right()) {
      // plays the similar questions
    }
    expect(s.state.finished).toBe(true);
    expect(
      s.notes
        .filter(n => n.kind === 'review')
        .every(n => n.kind === 'review' && n.outcome === 'credit'),
    ).toBe(true);
  });
});

describe('nothing early', () => {
  it('hints 1 and 2 of every Question 3 card hold no digit', () => {
    for (const part of ['3a', '3b']) {
      const steps = loaded.exercise.parts
        .find(p => p.id === part)!
        .groups.flatMap(g => g.steps);
      for (const s of steps) {
        if (
          s.kind === 'mframe' &&
          s.frame.type !== 'similar' &&
          s.frame.type !== 'recipe'
        ) {
          for (const h of (s.hints ?? []).slice(0, 2)) {
            expect(JSON.stringify(h)).not.toMatch(/[0-9]/);
          }
        }
      }
    }
  });
});
