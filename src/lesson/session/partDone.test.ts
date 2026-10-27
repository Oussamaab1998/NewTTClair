/**
 * D3 (round 2, 2026-10-22): reveals inside detours count in `part_done`.
 * `revealed` = main steps revealed + detour steps (variant / mini) revealed
 * at least once; `answered` and `counted` are unchanged, so "done"
 * (answered >= 1) is unchanged.
 */
import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { countsAsDone } from '../../state/doneParts';
import type { Event } from '../../telemetry/events';
import { playRealSession1b } from './fixtures/realSession1b';

describe('part_done counts reveals in detours', () => {
  it('the real 1.b session: the transfer was revealed, so revealed 1 (was 0); answered and done unchanged', () => {
    const done = playRealSession1b().events.filter(
      (e): e is Extract<Event, { t: 'part_done' }> => e.t === 'part_done',
    );
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ counted: 4, answered: 4, revealed: 1 });
    expect(countsAsDone(done[0]!)).toBe(true);
  });
});

describe('a skip inside a variant cannot be logged as a reveal', () => {
  it('variants cannot hold an optional (skippable) step: the loader rejects it', () => {
    // completeStep(false) would close a variant as "revealed" after a skip;
    // that path cannot happen because no variant step may be optional.
    const raw = JSON.parse(JSON.stringify(ex2)) as typeof ex2;
    const v = raw.variants.find(x => x.id === 'alt-1b-s5-pick')!;
    (v.step as { optional?: boolean }).optional = true;
    const r = loadExercise(raw, ex2Misconceptions);
    expect(r.ok ? [] : r.errors).toContain(
      'var:alt-1b-s5-pick: variants cannot fill the law or be optional',
    );
  });
});
