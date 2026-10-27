/**
 * B4 (2026-10-22): no line of a guided walk-through states the step's
 * answer (rule 6: the final value is the student's to type). Each line is
 * checked like an AI answer (planner/llm/solutionConcepts.ts): the answer's
 * values in digits or words, its words and authored phrases, and counting
 * formulas that evaluate to it. Runs after loading (src/app/exercises.ts),
 * since it needs the lesson content; the loader itself cannot import it.
 */
import { stepKey, type LoadedExercise } from '../content/loader';
import type { Rich, Step } from '../content/schema';
import { valueKey } from '../planner/llm/shown';
import { numbersIn } from '../planner/llm/numbers';
import {
  formulaLeak,
  leaksSolution,
  solutionConcepts,
} from '../planner/llm/solutionConcepts';
import { toPlainText } from './rich/runs';
import { buildContent } from './session/lesson';

const texts = (r: Rich) =>
  [r.ar && toPlainText(r.ar), r.fr, r.math].filter(
    (x): x is string => typeof x === 'string' && x.length > 0,
  );

type Walked = Step & { walkthrough?: { lines: Rich[] } };

export function checkWalkthroughs(loaded: LoadedExercise): string[] {
  const ex = loaded.exercise;
  const firstPart = ex.parts[0]?.id;
  if (firstPart === undefined) {
    return [];
  }
  const sites: { key: string; part: string; step: Walked }[] = [
    ...ex.parts.flatMap(p =>
      p.groups
        .flatMap(g => g.steps)
        .map(s => ({
          key: stepKey.main(p.id, s.id),
          part: p.id,
          step: s as Walked,
        })),
    ),
    ...ex.variants.map(v => ({
      key: stepKey.variant(v.id),
      part: v.forSteps[0]?.split('/')[0] ?? firstPart,
      step: v.step as Walked,
    })),
  ];
  const errors: string[] = [];
  for (const { key, part, step } of sites) {
    const lines = step.walkthrough?.lines;
    if (!lines) {
      continue;
    }
    const content = buildContent(loaded, part);
    const concepts = solutionConcepts(content, key);
    lines.forEach((line, i) => {
      const leaks = texts(line).some(
        t =>
          leaksSolution(concepts, t) ||
          numbersIn(t).some(v => concepts.values.has(valueKey(v))) ||
          formulaLeak(content, key, t, 0) === 'formula_answer',
      );
      if (leaks) {
        errors.push(`${key}: walk-through line ${i + 1} states the answer`);
      }
    });
  }
  return errors;
}
