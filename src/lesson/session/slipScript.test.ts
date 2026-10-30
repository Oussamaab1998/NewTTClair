/**
 * The SLIP SCRIPT of docs/METHOD_PLAY_GUIDE.md, typed exactly as a person
 * would type it: what each line must do. If the guide changes, this changes.
 */
import { loadSc2, MethodSession } from './methodTestkit';

const loaded = loadSc2();
const at = (part: string, plan: string[], frame: string) => {
  const s = new MethodSession(loaded, part);
  s.act({ type: 'answer', value: { plan } });
  s.until(frame);
  return s;
};
const q1 = (frame: string) => at('1', ['c_total', 'c_fav', 'c_ratio'], frame);
const last = (s: MethodSession) => s.answers.at(-1);
const lastNote = (s: MethodSession) => s.notes.at(-1);

describe('Question 1', () => {
  it('10×9×8 = 720 is named as a supporting step; the card stays, nothing graded', () => {
    const s = q1('m1.c_total');
    s.line('10*9*8 = 720');
    expect(lastNote(s)).toMatchObject({ kind: 'credit', support: true, nodeId: 'ord' });
    expect(s.openId).toBe('m1.c_total');
    expect(s.answers.filter(a => a.stepId === 'm1.c_total')).toHaveLength(0);
  });
  it('10×9×8÷3 = 240 opens the claim repair', () => {
    const s = q1('m1.c_total');
    s.line('10*9*8/3 = 240');
    expect(last(s)).toMatchObject({ misconceptionId: 'mut.divide_by_k_not_k_factorial' });
    expect(s.offer).toBeTruthy();
  });
  it('10+9+8 has no label (the generic line), no repair', () => {
    const s = q1('m1.c_total');
    s.line('10+9+8 = 27');
    expect(last(s)).toMatchObject({ correct: false });
    expect(last(s)).not.toHaveProperty('misconceptionId');
    expect(s.offer).toBeFalsy();
  });
  it('favourable: bare 1 is the one-ball slip; 4×3 is a table value (asked form); 6×5 the missing division', () => {
    for (const [raw, id] of [
      ['1', 'mut.over_generalised_order_rule'],
      ['6*5 = 30', 'mut.drop_division'],
    ] as const) {
      const s = q1('m1.c_fav');
      s.line(raw);
      expect(last(s)).toMatchObject({ misconceptionId: id });
    }
    const t = q1('m1.c_fav');
    t.line('4*3 = 12');
    expect(last(t)).toMatchObject({ correct: false, misconceptionId: 'mut.n_times_k' });
  });
  it('favourable: 6×5÷2×1 = 15 is right, bare 15 is credited as a count with no derivation', () => {
    const s = q1('m1.c_fav');
    s.line('4');
    s.line('6*5/2*1 = 15');
    expect(last(s)).toMatchObject({ correct: true });
    const b = q1('m1.c_fav');
    b.line('4');
    b.line('15');
    expect(b.notes.filter(n => n.kind === 'credit').at(-1)).toMatchObject({ nodeId: 'fav_black', derivation: 'absent' });
  });
  it('the decoy reason card gets its own message and the card stays', () => {
    const s = q1('m1.p_reason');
    s.card('r_add');
    expect(last(s)).toMatchObject({ misconceptionId: 'mut.add_instead_of_multiply' });
    expect(s.openId).toBe('m1.p_reason');
  });
  it('divide: 120÷60 above one, 60÷720 units, 60/120 unsimplified (card stays), 1 shows the target', () => {
    const a = q1('m1.c_ratio');
    a.line('120/60 = 2');
    expect(last(a)).toMatchObject({ misconceptionId: 'mut.swap_numerator_denominator' });
    const b = q1('m1.c_ratio');
    b.line('60/720 = 1/12');
    expect(last(b)).toMatchObject({ misconceptionId: 'mut.ordered_instead_of_groups' });
    const c = q1('m1.c_ratio');
    c.line('60/120');
    expect(c.openId).toBe('m1.c_ratio');
    expect(c.notes.filter(n => n.kind === 'credit').at(-1)).toMatchObject({ unsimplified: true });
    const d = q1('m1.c_ratio');
    d.line('1');
    expect(d.notes.some(n => n.kind === 'target')).toBe(true);
  });
});

describe('Questions 2 and 3: the owner’s slips', () => {
  it('Q2: bare 1/2 as p(B) is the complement of A; 60 bare is the earlier event’s count', () => {
    const s = at('2', ['c_total', 'c_fav', 'c_ratio'], 'm2.c_ratio');
    s.line('1/2');
    expect(last(s)).toMatchObject({ misconceptionId: 'mut.complement_of_A' });
    const t = at('2', ['c_total', 'c_fav', 'c_ratio'], 'm2.c_fav');
    t.line('60');
    expect(last(t)).toMatchObject({ misconceptionId: 'mut.a_count_for_b' });
  });
  it('Q3a: 1/128 as P(X=2), 1/4, 7/2 as the sequence, 42, 7/2 as the count, typed as a person types them', () => {
    const plan = ['c_type', 'c_seq', 'c_count', 'c_law'];
    const a = at('3a', plan, 'm3a.c_law');
    a.line('1/128');
    expect(last(a)).toMatchObject({ misconceptionId: 'mut.one_sequence_as_P_X_k' });
    const b = at('3a', plan, 'm3a.c_seq');
    b.line('1/2*1/2 = 1/4');
    expect(last(b)).toMatchObject({ misconceptionId: 'mut.forgets_failures' });
    const c = at('3a', plan, 'm3a.c_seq');
    c.line('7/2');
    expect(last(c)).toMatchObject({ misconceptionId: 'mut.adds_instead_of_multiplies' });
    const d = at('3a', plan, 'm3a.c_count');
    d.line('7*6 = 42');
    expect(last(d)).toMatchObject({ misconceptionId: 'mut.drop_division' });
    const e = at('3a', plan, 'm3a.c_count');
    e.line('7/2');
    expect(last(e)).toMatchObject({ misconceptionId: 'mut.reads_choose_as_fraction' });
  });
  it('the seven-factor line does not ask about the division', () => {
    const s = at('3a', ['c_type', 'c_seq', 'c_count', 'c_law'], 'm3a.c_seq');
    s.line('1/2*1/2*1/2*1/2*1/2*1/2*1/2 = 1/128');
    expect(last(s)).toMatchObject({ correct: true });
  });
});
