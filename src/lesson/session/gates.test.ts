/**
 * Audit (Group 2a): nothing after a step that asks the student appears
 * before the student answers. Asked steps are question cards (the reducer
 * stops there); a visual component that asks something must be a gate.
 */
import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { componentKind, isGate } from '../../components/registry';

const EXERCISES = [
  loadExercise(ex2, ex2Misconceptions),
  loadExercise(ex4, ex4Misconceptions),
];

describe('gates (audit of A1 and Exercise 2)', () => {
  it('every main-path visual that asks something holds the lesson', () => {
    const asking: string[] = [];
    for (const r of EXERCISES) {
      if (!r.ok) {
        throw new Error(r.errors.join('\n'));
      }
      for (const part of r.loaded.exercise.parts) {
        for (const step of part.groups.flatMap(g => g.steps)) {
          if (
            step.kind === 'component' &&
            componentKind(step.component) === 'visual' &&
            'prompt' in step.component.props
          ) {
            asking.push(`${part.id}/${step.id}`);
            expect(isGate(step.component.component)).toBe(true);
          }
        }
      }
    }
    // Today only A1's PredictReveal asks; Exercise 2's visuals only illustrate.
    expect(asking).toEqual(['A1/s4']);
  });
});
