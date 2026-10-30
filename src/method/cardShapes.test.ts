/**
 * A pick must not give its answer away by SHAPE: the true card is not the
 * longest, and the cards of one pick are of similar length (D41, reason
 * cards). Runs over every pick and every cards stage of the exercise.
 */
import exSc2 from '../content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import type { CardOption } from '../content/schema';
import { richPlain } from './words';

const r = loadExercise(exSc2, exSc2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const sets: { where: string; cards: readonly CardOption[] }[] = [];
for (const p of r.loaded.exercise.parts) {
  for (const s of p.groups.flatMap(g => g.steps)) {
    if (s.kind === 'mframe' && s.frame.type === 'cards') {
      sets.push({ where: s.id, cards: s.frame.cards });
    }
  }
}
for (const v of r.loaded.exercise.variants) {
  if (v.step.kind === 'mframe' && v.step.frame.type === 'repair') {
    v.step.frame.stages.forEach((st, i) => {
      if (st.type === 'cards') {
        sets.push({ where: `${v.id}#${i}`, cards: st.cards });
      }
    });
  }
}
/** Words and formula together: a card that is only a formula has a length too. */
const len = (c: CardOption) => {
  const plain = richPlain(c.text);
  return plain.text.length + (plain.math?.length ?? 0);
};

describe('card sets', () => {
  it('there are sets to check', () => {
    expect(sets.length).toBeGreaterThanOrEqual(12);
  });
  it.each(sets.map(s => [s.where, s] as const))(
    '%s: similar length, and the true card is not the longest',
    (_, s) => {
      const lens = s.cards.map(len);
      expect(Math.max(...lens) / Math.min(...lens)).toBeLessThanOrEqual(1.6);
      const t = s.cards.find(c => c.truth === 'true')!;
      expect(len(t)).toBeLessThan(Math.max(...lens));
    },
  );
});
