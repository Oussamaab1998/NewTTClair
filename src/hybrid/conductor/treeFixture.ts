/**
 * Test helper, never shipped (imported by tests only): one small probability
 * tree question (`tree_other_path` on 3/5, 1/2, 7/10) loaded through the real
 * loader, with a slip text of its own and one prepared small example on its
 * first card, so the conductor and the board can be tested on a tree before
 * the real exercise exists. No trip is authored for it: the plan and the
 * word frames stay on the route (TO_FIRST_LINES plays them).
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { registerCaseFile } from '../../ai/move/prepared';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { questionCtx, type QuestionCtx } from './conductor';
import fixture from './__fixtures__/treeMini.json';

export const TREE_MINI_ID = fixture.exercise.id;
export const TREE_MINI_QUESTION = 't1';
/** The frames of the fixture's route, in order. */
export const TREE_MINI_FRAMES = {
  plan: 'm1.plan',
  read: 'm1.read',
  path: 'm1.c_af',
  split: 'm1.c_split',
  rest: 'm1.c_naf',
} as const;

/** The acts that pass the plan and the word frames: he is then on the first lines frame. */
export const TO_FIRST_LINES: StudentAct[] = [
  { kind: 'order', ids: ['c_af', 'c_split', 'c_naf'] },
  { kind: 'tap_word', token: 'arbre' },
];

let built: { loaded: LoadedExercise; raw: unknown; ctx: QuestionCtx } | null =
  null;

/** The loaded fixture and the conductor's context of its question (built once). */
export function treeMini(): {
  loaded: LoadedExercise;
  raw: unknown;
  ctx: QuestionCtx;
} {
  if (!built) {
    const r = loadExercise(fixture.exercise, fixture.misconceptions);
    if (!r.ok) {
      throw new Error(`tree fixture: ${r.errors.join('; ')}`);
    }
    registerCaseFile(fixture.cases);
    built = {
      loaded: r.loaded,
      raw: fixture.exercise,
      ctx: questionCtx(r.loaded, fixture.exercise as never, TREE_MINI_QUESTION),
    };
  }
  return built;
}
