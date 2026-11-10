import { CATALOG } from '../app/exercises';
import type { Rich } from '../content/schema';
import { evaluateLine, type LineOutcome } from './frame';
import { replyForLine, replyForPlan } from './replies';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const answer = [...loaded!.answers].find(
  ([key, a]) =>
    key.startsWith('1/') && a.kind === 'method' && a.frame === 'lines',
)![1];
if (answer.kind !== 'method' || answer.frame !== 'lines') {
  throw new Error('no lines frame');
}

const outcome = (raw: string, card = 'total'): LineOutcome =>
  evaluateLine({
    raw,
    graph: answer.graph,
    table: answer.table,
    card,
    credited: new Set(),
    extra: answer.extra,
  }).outcome;

const TARGET: Rich = { math: '\\frac{1}{2}' };
const ctx = (raw: string, over: { shown?: string[]; target?: Rich } = {}) => ({
  raw,
  misconceptions: loaded!.misconceptions,
  shown: over.shown ?? [],
  target: over.target ?? null,
  recap: () =>
    ({ kind: 'recap' as const, found: { ar: [{ ar: 'x' }] } } as never),
});
const kinds = (parts: { kind: string }[]) => parts.map(p => p.kind);

describe('replyForLine', () => {
  it('says only "invalid" to an unreadable line, without echoing it', () => {
    const r = replyForLine(outcome('abc'), ctx('abc'));
    expect(r.verdict).toEqual({ kind: 'unreadable', reason: 'syntax' });
    expect(r.parts).toEqual([
      { kind: 'message', tone: 'info', message: 'invalidInput' },
    ]);
  });

  it('credits the main line and adds the recap when it closes the card', () => {
    const raw = '10*9*8/(3*2*1) = 120';
    const r = replyForLine(outcome(raw), ctx(raw));
    expect(r.verdict).toEqual({
      kind: 'credit',
      node: 'total',
      unsimplified: false,
      completes: true,
    });
    expect(kinds(r.parts)).toEqual(['student', 'note', 'note']);
    expect(r.parts[1]).toMatchObject({ tone: 'success' });
  });

  it('names a right intermediate without grading it', () => {
    const raw = '10*9*8 = 720';
    const r = replyForLine(outcome(raw), ctx(raw));
    expect(r.verdict).toEqual({
      kind: 'ungraded',
      outcome: 'support',
      node: 'ord',
    });
  });

  it('explains a known slip once, then says nothing new for it', () => {
    const slip = {
      kind: 'mutation',
      id: 'x',
      nodeId: 'total',
      strength: 'asked',
      misconceptionId: 'counts_ordered_draws',
    } as unknown as LineOutcome;
    const first = replyForLine(slip, ctx('10*9*8'));
    expect(first.verdict).toMatchObject({
      kind: 'wrong',
      misconceptionId: 'counts_ordered_draws',
      inferredBy: 'mutation',
      explained: 'counts_ordered_draws',
    });
    expect(kinds(first.parts)).toEqual(['student', 'feedback']);
    const again = replyForLine(
      slip,
      ctx('10*9*8', { shown: ['counts_ordered_draws'] }),
    );
    expect(again.verdict).not.toHaveProperty('explained');
    expect(kinds(again.parts)).toEqual(['student']);
  });

  it('puts an undiagnosed result next to the target the statement gives', () => {
    const r = replyForLine(outcome('0.7'), ctx('0.7', { target: TARGET }));
    expect(r.verdict).toEqual({ kind: 'wrong' });
    expect(r.parts.slice(1)).toEqual([
      {
        kind: 'note',
        tone: 'warning',
        note: { kind: 'neutral', code: 'generic' },
      },
      {
        kind: 'note',
        tone: 'info',
        note: { kind: 'target', line: '0.7', target: TARGET },
      },
    ]);
  });
});

describe('replyForPlan', () => {
  const cards = [
    { id: 'a', key: 'total', needs: [], short: { ar: [{ ar: 'الكل' }] } },
    { id: 'b', key: 'ratio', needs: ['a'], short: { ar: [{ ar: 'نقسمو' }] } },
  ] as never;

  it('explains the order when his plan holds', () => {
    const r = replyForPlan(cards, ['a', 'b']);
    expect(r.verdict.ok).toBe(true);
    expect(r.parts[0]).toMatchObject({ kind: 'note', tone: 'info' });
  });

  it('names the step that needs another one first', () => {
    const r = replyForPlan(cards, ['b', 'a']);
    expect(r.parts).toEqual([
      {
        kind: 'note',
        tone: 'warning',
        note: {
          kind: 'plan_violation',
          card: { ar: [{ ar: 'نقسمو' }] },
          needs: [{ ar: [{ ar: 'الكل' }] }],
        },
      },
    ]);
  });
});
