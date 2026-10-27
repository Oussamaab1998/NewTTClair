import fs from 'node:fs';
import path from 'node:path';

import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import ex4 from './exercises/bac2022c-ex4.json';
import ex4Misconceptions from './exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from './loader';
import { appPaperParts, appPaperQuestions } from './paper';
import type { Exercise, Rich } from './schema';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
/** An editable copy of ex4 (the JSON import's literal types are too narrow to mutate). */
type LooseQuestion = {
  id: string;
  label: string;
  status: string;
  wording?: Rich[];
  subs?: { label: string; wording: Rich[] }[];
};
type LooseEx4 = Omit<typeof ex4, 'paper'> & {
  paper: {
    source?: string;
    points?: number;
    parts: { heading?: Rich; intro?: Rich[]; questions: LooseQuestion[] }[];
  };
};
const ex4Copy = () => clone(ex4) as unknown as LooseEx4;
const errorsOf = (raw: unknown) => {
  const r = loadExercise(raw, ex4Misconceptions);
  return r.ok ? [] : r.errors;
};
const loaded = (raw: unknown, lib: unknown): Exercise => {
  const r = loadExercise(raw, lib as typeof ex4Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded.exercise;
};
/** Partie A of ex4 (the part the app teaches). */
const partA = (raw: LooseEx4) => raw.paper.parts[0]!.questions;

describe('the exam paper (number, subject, paper)', () => {
  it('both exercises load with their number, subject and paper', () => {
    for (const [raw, lib, n] of [
      [ex2, ex2Misconceptions, 2],
      [ex4, ex4Misconceptions, 4],
    ] as const) {
      const r = loadExercise(raw, lib);
      expect(r.ok && r.loaded.exercise.number).toBe(n);
      expect(
        r.ok && r.loaded.exercise.paper?.parts[0]?.questions.length,
      ).toBeGreaterThan(0);
    }
  });

  it('ex4: source, 7 points, Parties A / B / C with sub-questions (D6)', () => {
    const paper = loaded(ex4, ex4Misconceptions).paper!;
    expect(paper.source).toBe(
      'Examen du baccalauréat · Session de contrôle 2022 · Mathématiques',
    );
    expect(paper.points).toBe(7);
    expect(paper.parts.map(p => p.heading?.fr)).toEqual([
      'Partie A',
      'Partie B',
      'Partie C',
    ]);
    const b2 = paper.parts[1]!.questions.find(q => q.id === 'B2')!;
    expect(b2.subs?.map(s => s.label)).toEqual(['a', 'b', 'c']);
    // Not authored: «قريبا» in the app.
    expect(
      paper.parts
        .slice(1)
        .every(p => p.questions.every(q => q.status === 'soon')),
    ).toBe(true);
  });

  it('the app scope (chips, «الورقة»): Partie A only, A3 as its two «a) b)» lines', () => {
    const ex = loaded(ex4, ex4Misconceptions);
    expect(appPaperParts(ex).map(p => p.heading?.fr)).toEqual(['Partie A']);
    const qs = appPaperQuestions(ex);
    expect(qs.map(q => q.id)).toEqual(['A1', 'A2', 'A3', 'A4']);
    expect(qs.find(q => q.id === 'A3')!.wording!.map(w => w.fr)).toEqual([
      'a) Montrer que, pour tout réel x,',
      'b) Dresser le tableau de variation de f.',
    ]);
    const ex2Ids = appPaperQuestions(loaded(ex2, ex2Misconceptions)).map(
      q => q.id,
    );
    expect(ex2Ids).toEqual(['1a', '1b', '2a', '2b', '3a', '3b']);
  });

  it('an authored part must be available, a missing one soon, none forgotten', () => {
    const soonAuthored = ex4Copy();
    partA(soonAuthored)[0]!.status = 'soon';
    expect(errorsOf(soonAuthored).join('\n')).toContain(
      'paper question A1 is authored: status must be available',
    );
    const availableMissing = ex4Copy();
    partA(availableMissing)[1]!.status = 'available';
    expect(errorsOf(availableMissing).join('\n')).toContain(
      'paper question A2 is not authored: status must be soon',
    );
    const availableLater = ex4Copy();
    availableLater.paper.parts[2]!.questions[0]!.status = 'available';
    expect(errorsOf(availableLater).join('\n')).toContain(
      'paper question C1 is not authored: status must be soon',
    );
    const forgotten = ex4Copy();
    forgotten.paper.parts[0]!.questions = partA(forgotten).slice(1);
    expect(errorsOf(forgotten).join('\n')).toContain(
      'part A1 is missing from the paper list',
    );
    const dup = ex4Copy();
    dup.paper.parts[1]!.questions.push(clone(partA(dup)[3]!));
    expect(errorsOf(dup).join('\n')).toContain('duplicate paper question A4');
  });

  it('paper formulas must parse like every other formula (sub-questions and intros too)', () => {
    const bad = ex4Copy();
    partA(bad)[1]!.wording![0]!.math = '\\lim_{x';
    expect(errorsOf(bad).join('\n')).toMatch(/formula/);
    const badSub = ex4Copy();
    badSub.paper.parts[2]!.questions[1]!.subs![1]!.wording[0]!.math =
      '\\frac{1}';
    expect(errorsOf(badSub).join('\n')).toMatch(/formula/);
    const badIntro = ex4Copy();
    badIntro.paper.parts[1]!.intro![0]!.math = '\\int_{0';
    expect(errorsOf(badIntro).join('\n')).toMatch(/formula/);
  });
});

/**
 * Wording guard: every paper string (source, part headings and intros,
 * question and sub-question wording) is either the part's own goal (already
 * exam wording in the content) or appears verbatim in the "Exam wording"
 * section of docs/exercises/EX4_ANALYSIS.md. This compares with that
 * TRANSCRIPTION only (Partie A "to verify against the PDF"; Parties B and C
 * verified by the product owner on 2026-10-21), not with the exam itself: no
 * exam PDF is in the repo.
 */
describe('paper wording is transcribed, never paraphrased', () => {
  const doc = fs.readFileSync(
    path.resolve(__dirname, '../../docs/exercises/EX4_ANALYSIS.md'),
    'utf8',
  );
  const transcription = doc.split('## Exam wording')[1]!.split('\n## ')[0]!;
  // The doc writes LaTeX as JSON strings ("\\lim"): compare unescaped too.
  const section = transcription.concat(
    '\n',
    transcription.replace(/\\\\/g, '\\'),
  );
  const strings = (r: Rich) =>
    [r.fr, r.math].filter((s): s is string => s !== undefined);

  type RawPaper = {
    source?: string;
    parts: {
      heading?: Rich;
      intro?: Rich[];
      questions: {
        id: string;
        wording?: Rich[];
        subs?: { wording: Rich[] }[];
      }[];
    }[];
  };
  /** Every paper string with where it comes from (the question id, if any). */
  function paperStrings(paper: RawPaper): { at: string; s: string }[] {
    const out: { at: string; s: string }[] = [];
    if (paper.source !== undefined) {
      out.push({ at: 'source', s: paper.source });
    }
    for (const part of paper.parts) {
      for (const r of [
        ...(part.heading ? [part.heading] : []),
        ...(part.intro ?? []),
      ]) {
        strings(r).forEach(s => out.push({ at: 'part', s }));
      }
      for (const q of part.questions) {
        const rich = [
          ...(q.wording ?? []),
          ...(q.subs ?? []).flatMap(sub => sub.wording),
        ];
        rich.forEach(r => strings(r).forEach(s => out.push({ at: q.id, s })));
      }
    }
    return out;
  }
  function offenders(raw: {
    parts: { id: string; goal: unknown }[];
    paper: unknown;
  }) {
    const goals = new Map(raw.parts.map(p => [p.id, p.goal as Rich]));
    return paperStrings(raw.paper as RawPaper)
      .filter(({ at, s }) => {
        const goal = goals.get(at);
        const fromGoal = goal !== undefined && strings(goal).includes(s);
        return !fromGoal && !section.includes(s);
      })
      .map(({ at, s }) => `${at}: ${s}`);
  }

  it.each([
    ['ex2', ex2],
    ['ex4', ex4],
  ] as const)('%s', (_, content) => {
    expect(offenders(content)).toEqual([]);
  });

  it('fails on anything not in the transcription (an invented sub-question, a changed word)', () => {
    const invented = ex4Copy();
    invented.paper.parts[1]!.questions[1]!.subs!.push({
      label: 'd',
      wording: [{ fr: 'Montrer que g est continue.' }],
    });
    expect(offenders(invented)).toEqual(['B2: Montrer que g est continue.']);
    const changed = ex4Copy();
    changed.paper.parts[2]!.intro![0]!.fr = 'Pour tout n ∈ ℕ, on pose';
    expect(offenders(changed)).toEqual(['part: Pour tout n ∈ ℕ, on pose']);
  });
});
