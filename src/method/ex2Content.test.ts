/**
 * The authored content of bac2022c-ex2 1.0.0 (Bac 2022, session de contrôle,
 * Mathématiques, exercice 2; docs/EX2_EX4_UPGRADE_PROGRESS.md) against the
 * engine and the hybrid board: the four method questions, the trip, the slip
 * library of numbered balls, and a full play of each question by the
 * conductor with no AI. The old 0.5.0 lives on in src/content/fixtures.
 */
import fs from 'node:fs';
import path from 'node:path';

import { bannedIn } from '../ai/prompt/lexicon';
import { CATALOG } from '../app/exercises';
import { hasConductorFrames } from '../app/screens/hybrid/useHybridSession';
import exRaw from '../content/exercises/bac2022c-ex2.json';
import lawLibraryRaw from '../content/methodMutations.law.misconceptions.json';
import { MisconceptionLibrarySchema, type MethodStep } from '../content/schema';
import tripsRaw from '../content/trips.bac2022c-ex2.json';
import { ratToString } from '../engine/rationalFormat';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
  view,
} from '../hybrid/conductor/conductor';
import { passTour } from '../hybrid/tour/passTour';
import { TripFileSchema } from '../hybrid/tour/schema';
import { TRIP_FILE_ISSUES } from '../hybrid/tour/tour';
import { parseLatexSubset } from '../lesson/math/latexSubset';
import { findRunIssues } from '../lesson/rich/runs';
import type { StudentAct } from '../ai/checks/autoCheck';
import { mutationLibrary } from './library';
import { mutationsFor } from './mutations';
import { buildGraphFor } from './templates';
import { studentFacingIssues } from './words';

const CONTENT = path.join(__dirname, '..', 'content');
const NEW_FILES = [
  path.join(CONTENT, 'exercises', 'bac2022c-ex2.json'),
  path.join(CONTENT, 'methodMutations.law.misconceptions.json'),
  path.join(CONTENT, 'trips.bac2022c-ex2.json'),
];
const PARTS = ['1a', '1b', '2a', '2b', 'c3a', 'c3b'] as const;

const entry = CATALOG.find(e => e.id === 'bac2022c-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const methods = (exRaw.parts as { id: string; groups: { steps: { kind: string }[] }[] }[]).map(
  p => p.groups.flatMap(g => g.steps).find(s => s.kind === 'method') as unknown as MethodStep,
);

/** Every Arabic run and every formula of a JSON value. */
function walk(
  v: unknown,
  out: { ar: string[]; math: string[] } = { ar: [], math: [] },
) {
  if (Array.isArray(v)) {
    v.forEach(x => walk(x, out));
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === 'ar' && typeof x === 'string') {
        out.ar.push(x);
      } else if (k === 'math' && typeof x === 'string') {
        out.math.push(x);
      } else {
        walk(x, out);
      }
    }
  }
  return out;
}

describe('the exercise loads and every question opens on the board', () => {
  it('through the loader, on its content version', () => {
    if (!entry.result.ok) {
      throw new Error(entry.result.errors.join('\n'));
    }
    expect(exRaw.contentVersion).toBe('ex2-1.0.0');
    expect(loaded!.exercise.parts.map(p => p.id)).toEqual([...PARTS]);
  });

  it('each part is a text step and a method block, and has conductor frames', () => {
    for (const id of PARTS) {
      const part = exRaw.parts.find(p => p.id === id)!;
      expect(part.groups[0]!.steps.map(s => s.kind)).toEqual(['text', 'method']);
      expect(hasConductorFrames(loaded!, entry.raw, id)).toBe(true);
    }
  });

  it('the engine values the paper prints and the write-ups cite', () => {
    const v = (id: string) => ratToString(loaded!.values.get(id)!);
    expect(v('pA')).toBe('1/10');
    expect(v('pB')).toBe('7/10');
    expect(v('pNotB')).toBe('3/10');
    expect([v('pXm2'), v('pXm1'), v('pX0'), v('pX2')]).toEqual([
      '1/10',
      '1/10',
      '7/10',
      '1/10',
    ]);
    expect(v('eX')).toBe('\u22121/10');
    expect(v('eX2')).toBe('9/10');
    // The official correction prints V(X) = 8,9: the engine's value is 0,89.
    expect(v('vX')).toBe('89/100');
  });

  it('the paper lists the six questions of the exam, all on the board', () => {
    const qs = exRaw.paper.parts[0]!.questions;
    expect(qs.map(q => `${q.id}:${q.label}:${q.status}`)).toEqual([
      '1a:1.a:available',
      '1b:1.b:available',
      '2a:2.a:available',
      '2b:2.b:available',
      'c3a:3.a:available',
      'c3b:3.b:available',
    ]);
    expect(ratToString(loaded!.values.get('nMin')!)).toBe('8');
  });
});

describe('picks, hints and words', () => {
  const library = new Set(
    (mutationLibrary() as { id: string }[]).map(m => m.id),
  );

  it('every pick has exactly one right card and names misconceptions that exist', () => {
    for (const m of methods) {
      for (const p of m.picks) {
        expect(p.cards.filter(c => c.truth === 'true')).toHaveLength(1);
        for (const c of p.cards) {
          if (c.misconceptionId) {
            expect(
              library.has(c.misconceptionId) ||
                loaded!.misconceptionIds.has(c.misconceptionId),
            ).toBe(true);
          }
        }
      }
    }
  });

  it('hints 1 and 2 of every card and pick hold no digit and no formula', () => {
    for (const m of methods) {
      const ladders = [...m.plan.cards.map(c => c.hints), ...m.picks.map(p => p.hints)];
      for (const hints of ladders) {
        for (const h of hints.slice(0, 2)) {
          const w = walk(h);
          expect(w.math).toEqual([]);
          expect(w.ar.join(' ')).not.toMatch(/[0-9]/);
        }
      }
    }
  });

  it('the opening, the plan, the read tap and every header pass the word scan', () => {
    for (const m of methods) {
      for (const r of [...m.opening.route, m.opening.help]) {
        expect(studentFacingIssues(r, { header: true })).toEqual([]);
      }
      for (const c of m.plan.cards) {
        for (const h of [c.header.now, c.header.why, c.header.next]) {
          expect(studentFacingIssues(h, { header: true })).toEqual([]);
        }
      }
    }
  });

  it('no non-Tunisian word, and nothing that is not Arabic inside an Arabic run', () => {
    for (const f of NEW_FILES) {
      const w = walk(JSON.parse(fs.readFileSync(f, 'utf8')));
      for (const text of w.ar) {
        expect({ f, text, banned: bannedIn(text) }).toEqual({ f, text, banned: [] });
        expect({ text, issues: findRunIssues([{ ar: text }]) }).toEqual({
          text,
          issues: [],
        });
      }
    }
  });

  it('every formula is drawn by the math renderer', () => {
    for (const f of NEW_FILES) {
      for (const m of walk(JSON.parse(fs.readFileSync(f, 'utf8'))).math) {
        const tex = m
          .replace(/\\val\{[A-Za-z0-9]+\}/g, '1')
          .replace(/\\his\{[a-z0-9_]+\}/g, '\\ldots');
        expect(() => parseLatexSubset(tex)).not.toThrow();
      }
    }
  });
});

describe('the slip library of numbered balls', () => {
  const lib = MisconceptionLibrarySchema.parse(lawLibraryRaw);
  const all = new Set((mutationLibrary() as { id: string }[]).map(m => m.id));

  it('holds every slip the templates can name, for the exam and the similar questions', () => {
    const graphs = methods.flatMap(m => [
      m.graph,
      ...(m.similar ?? []).map(s => s.graph),
    ]);
    for (const g of graphs) {
      const graph = buildGraphFor(g, { inputs: {} });
      const t = mutationsFor(graph);
      for (const c of [...t.kept, ...(t.traps ?? [])]) {
        expect({ id: c.id, known: all.has(`mut.${c.id}`) }).toEqual({
          id: c.id,
          known: true,
        });
      }
    }
  });

  it('each entry asks first and names it plainly after, with no digit', () => {
    for (const m of lib) {
      expect(m.feedback).toBeDefined();
      expect(m.feedbackConfirmed).toBeDefined();
      const text = walk([m.feedback, m.feedbackConfirmed]).ar.join(' ');
      expect(text).not.toMatch(/[0-9]/);
      expect(m.trust.reviewed).toBe(false);
    }
  });
});

describe('the trip', () => {
  const trips = TripFileSchema.parse(tripsRaw);

  it('is valid and registered', () => {
    expect(TRIP_FILE_ISSUES).toEqual([]);
    expect(trips.overview.questions.map(q => q.id)).toEqual([...PARTS]);
  });

  it('one map per question, its steps the plan cards of the question', () => {
    methods.forEach((m, i) => {
      const q = trips.questions[PARTS[i]!]!;
      expect(q.steps.map(s => s.card)).toEqual(m.plan.cards.map(c => c.id));
    });
  });

  it('a carried or reused result names an earlier question and a node of its graph', () => {
    for (const [qid, q] of Object.entries(trips.questions)) {
      const refs = [
        ...q.have.flatMap(h => (h.carried ? [h.carried] : [])),
        ...q.steps.flatMap(s => (s.reuse ? [s.reuse] : [])),
      ];
      for (const r of refs) {
        expect(PARTS.indexOf(r.from as never)).toBeLessThan(
          PARTS.indexOf(qid as never),
        );
        const from = methods[PARTS.indexOf(r.from as never)]!;
        const g = buildGraphFor(from.graph, { inputs: {} });
        expect(g.nodes.map(n => n.id)).toContain(r.node);
      }
    }
  });
});

describe('every question plays to its recipe on the board, with no AI', () => {
  const line = (raw: string): StudentAct => ({ kind: 'line', raw });
  const pick = (optionId: string): StudentAct => ({ kind: 'choice', optionId });

  function play(questionId: string, acts: StudentAct[]) {
    const ctx = questionCtx(loaded!, entry.raw as never, questionId);
    let s = startQuestion(ctx);
    const reasons: string[] = [];
    for (const a of [...passTour(ctx), ...acts]) {
      const r = act(ctx, s, a);
      s = applyFallback(r.state, r.out);
      reasons.push(r.out.reason);
    }
    return { reasons, at: view(ctx, s)?.frameId };
  }

  it('1.a: the total with C(5,2), one draw, the pick, the ratio', () => {
    const r = play('1a', [
      line('10'),
      line('C(5,2)=10'),
      line('2'),
      line('1'),
      pick('k_twice'),
      pick('k_one_ball'),
      line('2/5'),
      line('1/10'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'line_note',
      'credit',
      'slip_first',
      'credit',
      'pick_wrong',
      'pick_ok',
      'slip_first',
      'credit',
    ]);
    expect(r.at).toBe('m1a.recipe');
  });

  it('1.b: the opposite event, its probability, then 1 minus it', () => {
    const r = play('1b', [
      line('C(5,2)=10'),
      pick('k_exactly'),
      pick('k_none'),
      line('C(3,2)=3'),
      line('3/5'),
      line('3/10'),
      line('7/10'),
      line('1-3/10=7/10'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'credit',
      'pick_wrong',
      'pick_ok',
      'line_note',
      'slip_first',
      'credit',
      'line_note',
      'credit',
    ]);
    expect(r.at).toBe('m1b.recipe');
  });

  it('2.a: the values, P(X = 0) = p(B), the three other values, the sum', () => {
    const r = play('2a', [
      pick('k_balls'),
      pick('k_values'),
      line('3/10'),
      line('7/10'),
      pick('k_one_zero'),
      line('1/10'),
      line('1/10'),
      line('1/10'),
      line('1/10+1/10+7/10+1/10=1'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'pick_wrong',
      'pick_ok',
      'slip_first',
      'credit',
      'pick_ok',
      'line_note',
      'line_note',
      'credit',
      'credit',
    ]);
    expect(r.at).toBe('m2a.recipe');
  });

  it('3.a: the binomial law, p reused, then P(Y = 1) as a formula in n', () => {
    const r = play('c3a', [
      pick('k_dependent'),
      pick('k_binomial'),
      line('3/10'),
      line('7/10'),
      line('(7/10)*(3/10)^(n-1)'),
      line('P(Y=1)=C(n,1)*(7/10)*(3/10)^(n-1)'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'pick_wrong',
      'pick_ok',
      'slip_first',
      'credit',
      'slip_first',
      'credit',
    ]);
    expect(r.at).toBe('m3a.recipe');
  });

  it('3.b: E(Y) in n, the bound, the first whole number after it', () => {
    const r = play('c3b', [
      line('n*7/10*3/10'),
      line('7n/10'),
      line('5*7/10=7/2'),
      line('5/(7/10)=50/7'),
      line('7'),
      line('8'),
      pick('k_below'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'slip_first',
      'credit',
      'slip_first',
      'credit',
      'slip_first',
      'credit',
      'pick_ok',
    ]);
    expect(r.at).toBe('m3b.recipe');
  });

  it('2.b: E(X), E(X²), the variance and the sign pick', () => {
    const r = play('2b', [
      line('-1/10'),
      line('-2*1/10-1*1/10+0*7/10+2*1/10=-1/10'),
      line('4*1/10+1*1/10+4*1/10=9/10'),
      line('9/10+1/10=1'),
      line('9/10-1/100=89/100'),
      pick('k_never'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'line_note',
      'credit',
      'credit',
      'slip_first',
      'credit',
      'pick_ok',
    ]);
    expect(r.at).toBe('m2b.recipe');
  });
});
