import { recordLine, type StudentAct } from '../../ai/checks/autoCheck';
import { bannedIn } from '../../ai/prompt/lexicon';
import { restoreRuntime } from '../../ai/session/state';
import type { RenderBlock } from '../../ai/verify/message';
import { CATALOG } from '../../app/exercises';
import templateJson from '../../content/replyTemplates.sc-ex2.json';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
} from '../conductor/conductor';
import type { ActOut, ConductorState } from '../conductor/types';
import { passTour } from '../tour/passTour';
import { fill, pick, TEMPLATE_FILES, templates } from './fill';
import { ReplyTemplateFileSchema, ReplyTemplateSchema } from './schema';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const ctxs = new Map(
  ['1', '2'].map(q => [q, questionCtx(loaded!, entry.raw as never, q)]),
);
const ctxOf = (q: string) => ctxs.get(q)!;
const file = TEMPLATE_FILES[0]!;
const template = (id: string) => file.templates.find(t => t.id === id)!;

/** Plays acts (prepared replies shown, as with no AI); the last act's state and output. */
function play(
  q: string,
  acts: StudentAct[],
  from = startQuestion(ctxOf(q)),
): { state: ConductorState; out: ActOut } {
  const ctx = ctxOf(q);
  let state = from;
  let out: ActOut | null = null;
  acts.forEach((a, i) => {
    const r = act(ctx, state, a);
    // The last act's state as the screen gets it (before applyFallback).
    state = i === acts.length - 1 ? r.state : applyFallback(r.state, r.out);
    out = r.out;
  });
  return { state, out: out! };
}

const line = (raw: string): StudentAct => ({ kind: 'line', raw });
const DK: StudentAct = { kind: 'dont_know' };
const Q1_START: StudentAct[] = passTour(ctxOf('1'));
const Q1_RATIO: StudentAct[] = [
  ...Q1_START,
  line('720/6=120'),
  line('4*15=60'),
  { kind: 'choice', optionId: 'r_true' },
];
const Q2_FAV: StudentAct[] = [...passTour(ctxOf('2')), line('720/6=120')];

/** Plays to the act, fills, and returns the template used with its blocks. */
function filled(q: string, acts: StudentAct[]) {
  const { state, out } = play(q, acts);
  return { state, out, picked: pick(file, ctxOf(q), state, out) };
}

const studentLines = (blocks: RenderBlock[]) =>
  blocks.flatMap(b =>
    b.type === 'student_line'
      ? [b.raw]
      : b.type === 'compare'
      ? b.lines.map(l => l.raw)
      : [],
  );
const maths = (blocks: RenderBlock[]) =>
  blocks.flatMap(b => (b.type === 'math' ? [b.latex] : []));

describe('reply templates: the file', () => {
  it('parses, is unreviewed, and has the ten templates of plan v2', () => {
    expect(ReplyTemplateFileSchema.safeParse(templateJson).success).toBe(true);
    expect(file.reviewed).toBe(false);
    expect(file.templates.map(t => t.id)).toEqual([
      'drop_division_total',
      'drop_division_black',
      'swapped_ratio',
      'unsimplified',
      'result_vs_target',
      'a_count_for_b',
      'divide_by_k_small_case',
      'stage_recap_total',
      'scaffold_fav_intro',
      'mismatch_multiply_back',
    ]);
  });

  it('names only misconceptions the exercise knows', () => {
    for (const t of file.templates) {
      if (t.when.misconception !== undefined) {
        expect(loaded!.misconceptions.has(t.when.misconception)).toBe(true);
      }
    }
  });

  it('has no non-Tunisian word in any text', () => {
    const texts = file.templates.flatMap(t =>
      t.say.flatMap(s => ('ar' in s ? [s.ar] : 'fr' in s ? [s.fr] : [])),
    );
    expect(texts.length).toBeGreaterThan(20);
    expect(texts.flatMap(t => bannedIn(t).map(b => b.phrase))).toEqual([]);
  });

  const base = {
    id: 'x',
    about: 'test',
    when: { reasons: ['credit'] },
  };
  const parses = (say: unknown[]) =>
    ReplyTemplateSchema.safeParse({ ...base, say }).success;

  it('refuses a digit in a text: every number comes from a filler', () => {
    expect(parses([{ ar: 'سطرك يعطي:' }])).toBe(true);
    expect(parses([{ ar: 'سطرك يعطي 120' }])).toBe(false);
    expect(parses([{ ar: 'سطرك يعطي \u0661\u0662\u0660' }])).toBe(false);
    expect(parses([{ fr: 'Il y a 10 boules' }])).toBe(false);
  });

  it('refuses a non-Tunisian word, a bidi control, two questions, a bad reason', () => {
    expect(parses([{ ar: 'واش لقيت؟' }])).toBe(false);
    expect(parses([{ ar: 'الحدث \u2066A\u2069 هنا' }])).toBe(false);
    expect(parses([{ ar: 'شنوّة لقيت؟' }, { ar: 'وعلاش؟' }])).toBe(false);
    expect(
      ReplyTemplateSchema.safeParse({
        ...base,
        when: { reasons: ['nonsense'] },
        say: [{ ar: 'باهي' }],
      }).success,
    ).toBe(false);
  });
});

describe('reply templates: each one fills from a real lesson and passes verifyAsk', () => {
  it('drop_division_total: his ordered count at the total', () => {
    const { out, picked } = filled('1', [...Q1_START, line('10*9*8=720')]);
    expect(out.reason).toBe('line_note');
    expect(picked?.id).toBe('drop_division_total');
    expect(studentLines(picked!.blocks)).toEqual(['10*9*8=720']);
  });

  it('drop_division_black: his total line and his black-part line side by side', () => {
    const { out, picked } = filled('1', [
      ...Q1_START,
      line('720/6=120'),
      line('6*5=30'),
    ]);
    expect(out.reason).toBe('slip_first');
    expect(picked?.id).toBe('drop_division_black');
    expect(picked!.blocks.find(b => b.type === 'compare')).toMatchObject({
      lines: [{ raw: '720/6=120' }, { raw: '6*5=30' }],
    });
  });

  it('swapped_ratio: his line and its value, in Q1 and Q2', () => {
    const q1 = filled('1', [...Q1_RATIO, line('120/60=2')]);
    expect(q1.picked?.id).toBe('swapped_ratio');
    expect(maths(q1.picked!.blocks)).toEqual(['2']);
    const q2 = filled('2', [
      ...Q2_FAV,
      line('6*5*4/(3*2*1)=20'),
      line('120/20=6'),
    ]);
    expect(q2.picked?.id).toBe('swapped_ratio');
    expect(maths(q2.picked!.blocks)).toEqual(['6']);
  });

  it('unsimplified: a right ratio that still simplifies', () => {
    const { out, picked } = filled('1', [...Q1_RATIO, line('60/120=30/60')]);
    expect(out.reason).toBe('line_note');
    expect(picked?.id).toBe('unsimplified');
  });

  it('result_vs_target: his value next to the result the exam gives', () => {
    // Both hints used first, so the prepared reply carries no pending hint.
    const { out, picked } = filled('1', [
      ...Q1_RATIO,
      DK,
      DK,
      line('60/100=3/5'),
    ]);
    expect(out).toMatchObject({ reason: 'undiagnosed', tier: 'deep' });
    expect(out.hintPending).toBeUndefined();
    expect(picked?.id).toBe('result_vs_target');
    expect(maths(picked!.blocks)).toEqual([
      '\\frac{3}{5}',
      'P(A) = \\frac{1}{2}',
    ]);
  });

  it('a_count_for_b: his line and the count of A the statement gives', () => {
    const { out, picked } = filled('2', [...Q2_FAV, line('4*15=60')]);
    expect(out.reason).toBe('slip_first');
    expect(picked?.id).toBe('a_count_for_b');
    expect(maths(picked!.blocks)).toEqual(['60']);
    expect(picked!.blocks).toContainEqual({
      type: 'fr',
      text: 'Obtenir aucune boule rouge',
    });
  });

  it('divide_by_k_small_case: fills only next to his line on a small case', () => {
    const atTotal = play('1', Q1_START).state;
    expect(
      filled('1', [...Q1_START, line('720/3=240')]).picked?.id,
    ).toBeUndefined();
    // What an AI move with a small case would leave (the conductor does not record it today).
    const s = JSON.parse(JSON.stringify(atTotal)) as ConductorState;
    s.session.cases.C1 = { kind: 'box', n: 4, k: 3 };
    recordLine(
      restoreRuntime(s.session, ctxOf('1').pack.main),
      '4*3*2/(3*2*1)=4',
      { kind: 'node', graph: 'C1', node: 'groups' },
    );
    const { out, state } = play('1', [line('720/3=240')], s);
    expect(out.reason).toBe('slip_first');
    const picked = pick(file, ctxOf('1'), state, out);
    expect(picked?.id).toBe('divide_by_k_small_case');
    expect(studentLines(picked!.blocks)).toEqual([
      '4*3*2/(3*2*1)=4',
      '720/3=240',
    ]);
  });

  it('stage_recap_total: his credited line and its value', () => {
    const { out, picked } = filled('1', [...Q1_START, line('720/6=120')]);
    expect(out).toMatchObject({ reason: 'credit', advanced: true });
    expect(picked?.id).toBe('stage_recap_total');
    expect(maths(picked!.blocks)).toEqual(['120']);
  });

  it('scaffold_fav_intro: the first hint with his own total line', () => {
    const { out, picked } = filled('1', [...Q1_START, line('720/6=120'), DK]);
    expect(out.reason).toBe('hint');
    expect(picked?.id).toBe('scaffold_fav_intro');
    expect(studentLines(picked!.blocks)).toEqual(['720/6=120']);
  });

  it('mismatch_multiply_back: the product to compute, from his own numbers', () => {
    const { out, picked } = filled('1', [...Q1_START, line('720/6=125')]);
    expect(out.reason).toBe('line_note');
    expect(picked?.id).toBe('mismatch_multiply_back');
    expect(maths(picked!.blocks)).toEqual(['125\\times 6']);
  });

  it('gives the screen right-to-left runs, never raw Arabic with Latin inside', () => {
    const { picked } = filled('2', [...Q2_FAV, line('4*15=60')]);
    for (const b of picked!.blocks) {
      expect(['ar', 'fr', 'math', 'student_line', 'compare']).toContain(b.type);
    }
    expect(picked!.blocks.filter(b => b.type === 'ar').length).toBe(3);
  });
});

describe('reply templates: what keeps the conductor reply', () => {
  it('a slot that cannot be filled: no total line yet', () => {
    const { state, out } = play('1', [
      ...passTour(ctxOf('1')),
      DK,
    ]);
    expect(out.reason).toBe('hint');
    expect(fill(template('scaffold_fav_intro'), ctxOf('1'), state, out)).toBe(
      null,
    );
    expect(templates(ctxOf('1'), state, out)).toBeNull();
  });

  it('a slot that cannot be filled: a mismatch that is not a division', () => {
    const { state, out } = play('1', [...Q1_START, line('10*9*8=700')]);
    expect(out.reason).toBe('line_note');
    expect(
      fill(template('mismatch_multiply_back'), ctxOf('1'), state, out),
    ).toBeNull();
  });

  it('a reply that ends with the next hint', () => {
    const { state, out } = play('2', [...Q2_FAV, line('4*15=60'), line('60')]);
    expect(out).toMatchObject({ reason: 'slip_again', hintPending: true });
    expect(fill(template('a_count_for_b'), ctxOf('2'), state, out)).toBeNull();
  });

  it('an unfinished line is not his ordered count yet', () => {
    const { state, out } = play('1', [...Q1_START, line('10*9*8')]);
    expect(templates(ctxOf('1'), state, out)).toBeNull();
  });

  it('a message verifyAsk rejects (too long for a phone)', () => {
    const long = ReplyTemplateSchema.parse({
      id: 'long',
      about: 'test',
      when: { card: 'total', reasons: ['credit'] },
      say: [{ ar: 'كلام '.repeat(80) }, { ar: 'كلام '.repeat(80) }],
    });
    const { state, out } = play('1', [...Q1_START, line('720/6=120')]);
    expect(fill(long, ctxOf('1'), state, out)).toBeNull();
  });

  it('another exercise, or an act no template answers', () => {
    const { state, out } = play('1', Q1_START);
    expect(out.reason).toBe('tour_done');
    expect(templates(ctxOf('1'), state, out)).toBeNull();
    const other = { ...file, exerciseId: 'bac2022c-ex2' };
    const credit = play('1', [...Q1_START, line('720/6=120')]);
    expect(pick(other, ctxOf('1'), credit.state, credit.out)).toBeNull();
    expect(templates(ctxOf('1'), credit.state, credit.out)).not.toBeNull();
  });

  it('is pure', () => {
    const { state, out } = play('1', [...Q1_START, line('720/6=125')]);
    const copy = JSON.stringify(state);
    templates(ctxOf('1'), state, out);
    expect(JSON.stringify(state)).toBe(copy);
  });
});
