/**
 * The authored content of bac2022c-ex4 1.0.0, Partie A (Bac 2022, session de
 * contrôle, Mathématiques, exercice 4; docs/EX2_EX4_UPGRADE_PROGRESS.md)
 * against the engine and the hybrid board: five method questions, the trip,
 * the slip library of function analysis, the analysis prompt, and a full play
 * of each question by the conductor with no AI. The old 0.1.0 lives on in
 * src/content/fixtures.
 */
import fs from 'node:fs';
import path from 'node:path';

import { bannedIn } from '../ai/prompt/lexicon';
import { buildAnalysisMovePrompt } from '../ai/move/promptAnalysis';
import { CATALOG } from '../app/exercises';
import { hasConductorFrames } from '../app/screens/hybrid/useHybridSession';
import exRaw from '../content/exercises/bac2022c-ex4.json';
import analysisLibraryRaw from '../content/methodMutations.analysis.misconceptions.json';
import { MisconceptionLibrarySchema, type MethodStep } from '../content/schema';
import tripsRaw from '../content/trips.bac2022c-ex4.json';
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
  path.join(CONTENT, 'exercises', 'bac2022c-ex4.json'),
  path.join(CONTENT, 'methodMutations.analysis.misconceptions.json'),
  path.join(CONTENT, 'trips.bac2022c-ex4.json'),
];
const PARTS = ['A1', 'A2', 'A3a', 'A3b', 'A4'] as const;

const entry = CATALOG.find(e => e.id === 'bac2022c-ex4')!;
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

describe('the exercise loads and every question of Partie A opens on the board', () => {
  it('through the loader, on its content version', () => {
    if (!entry.result.ok) {
      throw new Error(entry.result.errors.join('\n'));
    }
    expect(exRaw.contentVersion).toBe('ex4-1.0.0');
    expect(loaded!.exercise.parts.map(p => p.id)).toEqual([...PARTS]);
  });

  it('each part is a text step and a method block, and has conductor frames', () => {
    for (const id of PARTS) {
      const part = exRaw.parts.find(p => p.id === id)!;
      expect(part.groups[0]!.steps.map(s => s.kind)).toEqual(['text', 'method']);
      expect(hasConductorFrames(loaded!, entry.raw, id)).toBe(true);
    }
  });

  it('the paper: Partie A on the board, Parties B and C later', () => {
    const [a, b, c] = exRaw.paper.parts;
    expect(a!.questions.map(q => `${q.id}:${q.label}:${q.status}`)).toEqual([
      'A1:1:available',
      'A2:2:available',
      'A3a:3.a:available',
      'A3b:3.b:available',
      'A4:4:available',
    ]);
    for (const q of [...b!.questions, ...c!.questions]) {
      expect(q.status).toBe('soon');
    }
    expect(ratToString(loaded!.values.get('f0')!)).toBe('1/2');
  });

  it('every step written with x is an analysis step of the board', () => {
    for (const m of methods) {
      const g = buildGraphFor(m.graph, { inputs: {} });
      expect(g.domain).toBe('analysis');
    }
  });

  it('the analysis prompt stays under 10,000 characters and names no ball', () => {
    const p = buildAnalysisMovePrompt();
    expect(p.length).toBeLessThan(10_000);
    expect(p).not.toMatch(/\bball|\burn\b/i);
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

describe('the slip library of function analysis', () => {
  const lib = MisconceptionLibrarySchema.parse(analysisLibraryRaw);
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

  it('A1: the domain, f(−x) simplified down to f(x), the conclusion', () => {
    const r = play('A1', [
      pick('k_negative'),
      pick('k_sym'),
      line('f(-x)=e^(-x)/(1+e^(-2x))'),
      line('e^(-x)/(1-e^(2x))'),
      line('(e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x))'),
      line('e^x/(e^(2x)+1)=f(x)'),
      pick('k_odd'),
      pick('k_even'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'pick_wrong',
      'pick_ok',
      'line_note',
      'slip_first',
      'line_note',
      'credit',
      'pick_wrong',
      'pick_ok',
    ]);
    expect(r.at).toBe('mA1.recipe');
  });

  it('A2: the rewritten form, the limit as 0/(0+1), the asymptote', () => {
    const r = play('A2', [
      line('e^x/(1+e^(2x))'),
      line('e^(-x)/(e^(-2x)+1)'),
      line('1/(1+1)=1/2'),
      line('0'),
      line('0/(0+1)=0'),
      pick('k_vertical'),
      pick('k_horizontal'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'line_note',
      'credit',
      'slip_first',
      'line_note',
      'credit',
      'pick_wrong',
      'pick_ok',
    ]);
    expect(r.at).toBe('mA2.recipe');
  });

  it("A3a: the quotient rule, v' with its 2, then the printed form", () => {
    const r = play('A3a', [
      pick('k_plus'),
      pick('k_quotient'),
      line('e^(2x)'),
      line('2e^(2x)'),
      line("f'(x)=(e^x(1+e^(2x))-e^x*2e^(2x))/(1+e^(2x))^2"),
      line('(e^x-e^(3x))/(1+e^(2x))^2'),
      line('e^x(1-e^(2x))/(1+e^(2x))^2'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'pick_wrong',
      'pick_ok',
      'slip_first',
      'credit',
      'line_note',
      'line_note',
      'credit',
    ]);
    expect(r.at).toBe('mA3a.recipe');
  });

  it('A3b: the sign, f(0), the ends and the table', () => {
    const r = play('A3b', [
      pick('k_reverse'),
      pick('k_sign'),
      line('0/(1+0)=0'),
      line('1/(1+1)=1/2'),
      pick('k_zero'),
      pick('k_table'),
    ]);
    expect(r.reasons).toEqual([
      'tour_done',
      'pick_wrong',
      'pick_ok',
      'slip_first',
      'credit',
      'pick_ok',
      'pick_ok',
    ]);
    expect(r.at).toBe('mA3b.recipe');
  });

  it('A4: the symmetry, the asymptote, the top point, then the curve', () => {
    const r = play('A4', [pick('k_axis'), pick('k_both'), line('1/2')]);
    expect(r.reasons).toEqual(['tour_done', 'pick_ok', 'pick_ok', 'credit']);
    expect(r.at).toBe('mA4.x_plot');
  });
});
