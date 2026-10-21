import fs from 'node:fs';
import path from 'node:path';

import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import ex4 from './exercises/bac2022c-ex4.json';
import ex4Misconceptions from './exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from './loader';
import type { Rich } from './schema';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const errorsOf = (raw: unknown) => {
  const r = loadExercise(raw, ex4Misconceptions);
  return r.ok ? [] : r.errors;
};

describe('the exam paper list (number, subject, paper)', () => {
  it('both exercises load with their number, subject and paper', () => {
    for (const [raw, lib, n] of [
      [ex2, ex2Misconceptions, 2],
      [ex4, ex4Misconceptions, 4],
    ] as const) {
      const r = loadExercise(raw, lib);
      expect(r.ok && r.loaded.exercise.number).toBe(n);
      expect(r.ok && r.loaded.exercise.paper?.questions.length).toBeGreaterThan(
        0,
      );
    }
  });

  it('an authored part must be available, a missing one soon, none forgotten', () => {
    const soonAuthored = clone(ex4);
    soonAuthored.paper.questions[0]!.status = 'soon';
    expect(errorsOf(soonAuthored).join('\n')).toContain(
      'paper question A1 is authored: status must be available',
    );
    const availableMissing = clone(ex4);
    availableMissing.paper.questions[1]!.status = 'available';
    expect(errorsOf(availableMissing).join('\n')).toContain(
      'paper question A2 is not authored: status must be soon',
    );
    const forgotten = clone(ex4);
    forgotten.paper.questions = forgotten.paper.questions.slice(1);
    expect(errorsOf(forgotten).join('\n')).toContain(
      'part A1 is missing from the paper list',
    );
    const dup = clone(ex4);
    dup.paper.questions.push(clone(dup.paper.questions[3]!));
    expect(errorsOf(dup).join('\n')).toContain('duplicate paper question A4');
  });

  it('paper formulas must parse like every other formula', () => {
    const bad = clone(ex4);
    bad.paper.questions[1]!.wording![0]!.math = '\\lim_{x';
    expect(errorsOf(bad).join('\n')).toMatch(/formula/);
  });
});

/**
 * Wording guard: every paper wording is either the part's own goal (already
 * exam wording in the content) or appears verbatim in the "Exam wording"
 * section of docs/exercises/EX4_ANALYSIS.md. This compares with that
 * TRANSCRIPTION only (made by the product owner, "to verify against the
 * PDF"), not with the exam itself: no exam PDF is in the repo.
 */
describe('paper wording is transcribed, never paraphrased', () => {
  const doc = fs.readFileSync(
    path.resolve(__dirname, '../../docs/exercises/EX4_ANALYSIS.md'),
    'utf8',
  );
  const section = doc
    .split('## Exam wording')[1]!
    .split('\n## ')[0]!
    // The doc writes LaTeX as JSON strings ("\\lim"): compare unescaped too.
    .concat(
      '\n',
      doc
        .split('## Exam wording')[1]!
        .split('\n## ')[0]!
        .replace(/\\\\/g, '\\'),
    );
  const strings = (r: Rich) =>
    [r.fr, r.math].filter((s): s is string => s !== undefined);

  it.each([
    ['ex2', ex2],
    ['ex4', ex4],
  ] as const)('%s', (_, raw) => {
    const goals = new Map(raw.parts.map(p => [p.id, p.goal as Rich]));
    const offenders: string[] = [];
    for (const q of raw.paper.questions) {
      const goal = goals.get(q.id);
      for (const r of (q as { wording?: Rich[] }).wording ?? []) {
        for (const s of strings(r)) {
          const fromGoal = goal !== undefined && strings(goal).includes(s);
          if (!fromGoal && !section.includes(s)) {
            offenders.push(`${q.id}: ${s}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
