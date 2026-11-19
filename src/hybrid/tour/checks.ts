/**
 * The rules a trips file must follow against its exercise (schema.ts), as a
 * function that returns what is wrong (empty: fine). The coverage test and
 * `npm run check:exercise -- <id>` both run it (docs/NEW_EXERCISE.md):
 * - the file parses and names its exercise;
 * - the overview lists the exercise's questions, in order;
 * - one map per question, its steps the plan cards of the question, in order;
 * - a carried or reused result names an earlier question and a node of it.
 */
import {
  stepKey,
  type LoadedExercise,
  type ResolvedAnswer,
} from '../../content/loader';
import { questionCtx } from '../conductor/conductor';
import { TripFileSchema } from './schema';
import { planStep } from './tour';

/** Zod issues as short lines: where, then what. */
export const zodLines = (
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  max = 8,
): string[] =>
  issues
    .slice(0, max)
    .map(i => `${i.path.map(String).join('.') || '(file)'}: ${i.message}`);

const partsOf = (raw: unknown): string[] =>
  ((raw as { parts?: { id: string }[] } | undefined)?.parts ?? []).map(
    p => p.id,
  );

/** Every node id of a question's method graphs (what a later question can carry). */
function nodesOf(loaded: LoadedExercise, questionId: string): Set<string> {
  const out = new Set<string>();
  for (const [key, a] of loaded.answers) {
    const answer = a as ResolvedAnswer;
    if (
      key.startsWith(stepKey.main(questionId, '')) &&
      answer.kind === 'method' &&
      'graph' in answer
    ) {
      answer.graph.nodes.forEach(n => out.add(n.id));
    }
  }
  return out;
}

export function tripIssues(
  loaded: LoadedExercise,
  raw: unknown,
  file: unknown,
): string[] {
  const r = TripFileSchema.safeParse(file);
  if (!r.success) {
    return zodLines(r.error.issues);
  }
  const trips = r.data;
  const out: string[] = [];
  const exerciseId = loaded.exercise.id;
  if (trips.exerciseId !== exerciseId) {
    out.push(
      `exerciseId is ${trips.exerciseId}, the exercise is ${exerciseId}`,
    );
  }
  const parts = partsOf(raw);
  const overview = trips.overview.questions.map(q => q.id);
  if (overview.join(',') !== parts.join(',')) {
    out.push(
      `overview lists ${
        overview.join(', ') || 'nothing'
      }; the questions are ${parts.join(', ')}`,
    );
  }
  for (const q of Object.keys(trips.questions)) {
    if (!parts.includes(q)) {
      out.push(`${q}: a map for a question the exercise does not have`);
    }
  }
  parts.forEach((q, i) => {
    const map = trips.questions[q];
    if (!map) {
      out.push(`${q}: no map yet`);
      return;
    }
    const plan = planStep(questionCtx(loaded, raw as never, q));
    if (!plan || plan.frame.type !== 'plan') {
      out.push(
        `${q}: the question has no plan frame (the map follows its cards)`,
      );
    } else {
      const cards = plan.frame.cards.map(c => c.id);
      const steps = map.steps.map(s => s.card);
      if (steps.join(',') !== cards.join(',')) {
        out.push(
          `${q}: map steps ${steps.join(', ')}; the plan cards are ${cards.join(
            ', ',
          )}`,
        );
      }
    }
    const refs = [
      ...map.have.flatMap(h => (h.carried ? [h.carried] : [])),
      ...map.steps.flatMap(s => (s.reuse ? [s.reuse] : [])),
    ];
    for (const ref of refs) {
      const from = parts.indexOf(ref.from);
      if (from < 0 || from >= i) {
        out.push(`${q}: carries from ${ref.from}, not an earlier question`);
      } else if (!nodesOf(loaded, ref.from).has(ref.node)) {
        out.push(`${q}: carries ${ref.from}/${ref.node}, no such node`);
      }
    }
  });
  return out;
}
