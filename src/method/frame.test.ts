import type { PlanCardRef, Rich } from '../content/schema';
import { buildUrnGraph } from './graph';
import { mutationsFor } from './mutations';
import { checkPlan, checkRead, evaluateLine } from './frame';
import { reasonOrder, recap, stripFor } from './narration';

const r = (text: string): Rich => ({ ar: [{ ar: text }] });
const header = (n: string) => ({
  now: r(`now ${n}`),
  why: r(`why ${n}`),
  next: r(`next ${n}`),
});
const cards: PlanCardRef[] = [
  {
    id: 'c_total',
    key: 'total',
    short: r('الكل'),
    text: r('t1'),
    header: header('1'),
    needs: [],
  },
  {
    id: 'c_fav',
    key: 'fav',
    short: r('المطلوب'),
    text: r('t2'),
    header: header('2'),
    needs: [],
  },
  {
    id: 'c_ratio',
    key: 'ratio',
    short: r('القسمة'),
    text: r('t3'),
    header: header('3'),
    needs: ['c_total', 'c_fav'],
  },
];

describe('the plan: any order that respects what each card uses', () => {
  it('total, fav, ratio and fav, total, ratio are both fine', () => {
    expect(checkPlan(cards, ['c_total', 'c_fav', 'c_ratio'])).toEqual({
      ok: true,
    });
    expect(checkPlan(cards, ['c_fav', 'c_total', 'c_ratio'])).toEqual({
      ok: true,
    });
  });

  it('dividing first names the card and what it needs, nothing else', () => {
    const v = checkPlan(cards, ['c_ratio', 'c_total', 'c_fav']);
    expect(v).toEqual({
      ok: false,
      reason: 'dependency',
      card: 'c_ratio',
      needs: ['c_total', 'c_fav'],
    });
    const w = checkPlan(cards, ['c_total', 'c_ratio', 'c_fav']);
    expect(w).toEqual({
      ok: false,
      reason: 'dependency',
      card: 'c_ratio',
      needs: ['c_fav'],
    });
  });

  it('a missing, repeated or unknown card is incomplete', () => {
    expect(checkPlan(cards, ['c_total', 'c_fav'])).toMatchObject({
      ok: false,
      reason: 'incomplete',
    });
    expect(checkPlan(cards, ['c_total', 'c_total', 'c_ratio'])).toMatchObject({
      ok: false,
      reason: 'incomplete',
    });
    expect(checkPlan(cards, ['c_total', 'c_fav', 'zzz'])).toMatchObject({
      ok: false,
      reason: 'incomplete',
    });
  });
});

describe('reading the statement: one tap on the word that says whether order matters', () => {
  const targets = [
    {
      token: 'simultanément',
      effect: { order: 'unordered' as const, replacement: false },
    },
  ];
  it('the right word gives the fact for the rest of the question', () => {
    expect(checkRead(targets, 'simultanément')).toEqual({
      ok: true,
      effect: { order: 'unordered', replacement: false },
    });
  });
  it('ignores case, spaces and a trailing full stop', () => {
    expect(checkRead(targets, ' Simultanément. ').ok).toBe(true);
  });
  it('any other word is not the one', () => {
    expect(checkRead(targets, 'trois')).toEqual({ ok: false });
    expect(checkRead(targets, 'urne')).toEqual({ ok: false });
  });
});

describe('the reason for the order is derived from the dependencies only', () => {
  it('"divide comes after total and favourable, because it uses their results"', () => {
    const n = reasonOrder(cards);
    expect(n).toEqual({
      kind: 'reason_order',
      clauses: [{ card: r('القسمة'), needs: [r('الكل'), r('المطلوب')] }],
    });
  });
  it('does not depend on the order the student chose', () => {
    expect(reasonOrder([...cards].reverse())).toEqual(reasonOrder(cards));
  });
  it('cards without needs add no clause', () => {
    expect(reasonOrder(cards.slice(0, 2))).toEqual({
      kind: 'reason_order',
      clauses: [],
    });
  });
});

describe('the recap: what he found, what is next; a number only if it is his own line', () => {
  it('names the cards, no number', () => {
    const n = recap(r('الكل'), r('المطلوب'));
    expect(n).toEqual({ kind: 'recap', found: r('الكل'), next: r('المطلوب') });
    expect(JSON.stringify(n)).not.toMatch(/[0-9]/);
  });
  it('his own credited line may follow, as he typed it', () => {
    expect(recap(r('الكل'), null, '10*9*8/(3*2*1) = 120')).toEqual({
      kind: 'recap',
      found: r('الكل'),
      next: null,
      line: '10*9*8/(3*2*1) = 120',
    });
  });
});

describe('the strip follows the current step', () => {
  const roadmap = [
    { id: 'plan', kind: 'plan' as const, short: r('خطة'), header: header('p') },
    {
      id: 'read',
      kind: 'read' as const,
      short: r('قراءة'),
      header: header('r'),
    },
    {
      id: 'c_total',
      kind: 'card' as const,
      short: r('الكل'),
      header: header('1'),
    },
    {
      id: 'paper',
      kind: 'paper' as const,
      short: r('ورقة'),
      header: header('z'),
    },
  ];
  it('gives now, why, next of the current entry and its place', () => {
    const s = stripFor(roadmap, 'read');
    expect(s?.entry.header.now).toEqual(r('now r'));
    expect(s?.index).toBe(1);
    expect(s?.total).toBe(4);
  });
  it('unknown id: nothing', () => {
    expect(stripFor(roadmap, 'zzz')).toBeNull();
  });
});

describe('a line is evaluated and matched in one call', () => {
  const g = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 1 });
  const table = mutationsFor(g);
  const run = (raw: string, credited: string[] = []) =>
    evaluateLine({
      raw,
      graph: g,
      table,
      card: 'total',
      credited: new Set(credited),
    });

  it('a right total is credited and closes the card', () => {
    const e = run('10*9*8/(3*2*1) = 120');
    expect(e.outcome).toMatchObject({ kind: 'credit', completes: true });
  });
  it('an unreadable line says why and is never graded', () => {
    expect(run('1+').outcome).toEqual({ kind: 'unreadable', reason: 'syntax' });
  });
  it('an unfinished line asks for the "=" and the result', () => {
    expect(run('10*9*8/(3*2*1)').outcome).toEqual({ kind: 'unfinished' });
  });
  it('a mismatch repeats his line with ≠ and no new number', () => {
    const e = run('10*9*8/(3*2*1) = 121');
    expect(e.outcome).toEqual({
      kind: 'mismatch',
      at: 0,
      shown: '10*9*8/(3*2*1) ≠ 121',
    });
  });
  it('a slip comes with its misconception id', () => {
    const e = run('10*9*8/3*2*1 = 480');
    expect(e.outcome).toMatchObject({
      kind: 'mutation',
      misconceptionId: 'mut.bracket_left_to_right',
      strength: 'confirmed',
    });
  });
  it('the readback is found on the raw line, before it is graded', () => {
    expect(run('10*9*8/3*2*1 = 480').readback?.grouped).toBe(
      '10*9*8/(3*2*1) = 480',
    );
    expect(run('10*9*8/(3*2*1) = 120').readback).toBeNull();
  });
});
