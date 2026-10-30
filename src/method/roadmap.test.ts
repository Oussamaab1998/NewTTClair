import { loadExercise } from '../content/loader';
import { buildContent, startLesson } from '../lesson/session/lesson';
import { methodExercise } from './fixtures/methodExercise';
import { roadmapFor } from './roadmap';

const trust = {
  reviewed: false,
  contentVersion: 'fxm-0.1.0',
  source: 'authored',
  status: 'ok',
};
const own = (id: string) => ({
  id,
  skillId: 'combinations-count',
  description: id,
  signature: id,
  trust,
});
const r = loadExercise(methodExercise(), [
  own('draws_with_replacement'),
  own('counts_balls_not_draws'),
]);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const content = buildContent(r.loaded, '1');
const base = startLesson(content).state;

describe('the roadmap behind the strip and the sheet', () => {
  it('lists the route in order: plan, read, the cards, the paper (6 rows)', () => {
    const rm = roadmapFor(content.question.groups, base)!;
    expect(rm.entries.map(e => `${e.kind}:${e.id}`)).toEqual([
      'plan:m1.plan',
      'read:m1.read',
      'card:m1.c_total',
      'card:m1.c_fav',
      'card:m1.c_ratio',
      'paper:m1.paper',
    ]);
  });

  it('marks the open frame as current and the rest as upcoming', () => {
    const rm = roadmapFor(content.question.groups, base)!;
    expect(rm.entries.map(e => e.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(rm.current.id).toBe('m1.plan');
  });

  it('frames before the open one are done; unbuilt cards stay upcoming', () => {
    const state = {
      ...base,
      stack: [
        { ...base.stack[0]!, stepId: 'm1.c_total', stepKey: '1/m1.c_total' },
      ],
    };
    const rm = roadmapFor(content.question.groups, state)!;
    expect(rm.entries.map(e => e.status)).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  it('a finished part: every built frame is done, the rest is still to come', () => {
    const rm = roadmapFor(content.question.groups, {
      ...base,
      stack: [],
      finished: true,
    })!;
    expect(rm.entries.map(e => e.status)).toEqual([
      'done',
      'done',
      'done',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(rm.current.id).toBe('m1.c_fav'); // the next thing on the route
  });

  it('a part without a method block has no roadmap', () => {
    expect(roadmapFor([{ steps: [] }], base)).toBeNull();
  });
});
