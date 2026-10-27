/**
 * The exam paper as each screen needs it (DESIGN.md §4.3, §4.4).
 * - The paper screen shows every part (`exercise.paper.parts`).
 * - The picker chips and the «الورقة» sheet show only the parts the app
 *   teaches (a part holding at least one authored question), with
 *   sub-questions flattened to «a) …» lines, exactly as before the paper was
 *   nested (D6).
 */
import type { Exercise, PaperPart, PaperQuestion, Rich } from './schema';

/** The paper parts the app teaches; without a paper list, one part of the authored parts. */
export function appPaperParts(exercise: Exercise): PaperPart[] {
  if (!exercise.paper) {
    return [
      {
        questions: exercise.parts.map(p => ({
          id: p.id,
          label: p.id,
          wording: [p.goal],
          status: 'available' as const,
        })),
      },
    ];
  }
  const authored = new Set(exercise.parts.map(p => p.id));
  return exercise.paper.parts.filter(part =>
    part.questions.some(q => authored.has(q.id)),
  );
}

/** A question's wording on one list: its own lines, then «a) …» per sub-question. */
export function flatWording(q: PaperQuestion): Rich[] | undefined {
  const subs = (q.subs ?? []).flatMap(s =>
    s.wording.map((w, i) =>
      i === 0 && w.fr !== undefined ? { ...w, fr: `${s.label}) ${w.fr}` } : w,
    ),
  );
  const lines = [...(q.wording ?? []), ...subs];
  return lines.length > 0 ? lines : undefined;
}

/** The questions of the parts the app teaches, sub-questions flattened. */
export function appPaperQuestions(exercise: Exercise): PaperQuestion[] {
  return appPaperParts(exercise).flatMap(part =>
    part.questions.map(q => {
      const wording = flatWording(q);
      return {
        id: q.id,
        label: q.label,
        status: q.status,
        ...(wording && { wording }),
      };
    }),
  );
}
