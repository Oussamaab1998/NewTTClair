/**
 * C2 (Tutor intelligence 1): per-step tables of known wrong procedures. The
 * loader computes each procedure's value with the engine (src/engine/
 * procedures.ts) and rejects a table whose procedure does not fit the
 * answer, names an unknown misconception, or gives the correct answer.
 */
import { frac } from '../engine/rational';
import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from './loader';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
type Row = { id: string; misconceptionId: string; reviewed: boolean };

const errorsOf = (raw: unknown) => {
  const r = loadExercise(raw, ex2Misconceptions);
  return r.ok ? [] : r.errors;
};
const loaded = () => {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
};
/** A main step of 1.b (typed), to edit its table. */
const step1b = (raw: typeof ex2, id: string) =>
  raw.parts[0]!.groups[0]!.steps.find(s => s.id === id) as unknown as {
    procedures?: Row[];
  };

describe('procedure tables (content + loader)', () => {
  it('the transfer of 1b/s5: values computed by the engine, in table order', () => {
    const a = loaded().answers.get('var:tr-1b-s5-noneg');
    expect(a?.kind === 'number' && a.procedures).toEqual([
      {
        id: 'balls_in_event',
        misconceptionId: 'counts_balls_not_pairs',
        values: [frac(4)],
      },
      {
        id: 'all_balls',
        misconceptionId: 'counts_balls_not_pairs',
        values: [frac(5)],
      },
      {
        id: 'opposite_event',
        misconceptionId: 'confuses_event_and_complement',
        values: [frac(4)],
      },
      {
        id: 'all_outcomes',
        misconceptionId: 'counts_all_outcomes',
        values: [frac(10)],
      },
      {
        id: 'ordered_draw',
        misconceptionId: 'counts_ordered_pairs',
        values: [frac(12)],
      },
      {
        id: 'merged_identical',
        misconceptionId: 'merges_identical_balls',
        values: [frac(3)],
      },
      // 1b/s5's answer, shown before the transfer.
      {
        id: 'earlier_result',
        misconceptionId: 'reuses_earlier_result',
        values: [frac(3)],
      },
    ]);
  });

  it('earlier results of a main step: the numeric answers before it in the part (1b/s8: s5 = 3, s7 = 3/10)', () => {
    const a = loaded().answers.get('1b/s8');
    const earlier =
      a?.kind === 'number'
        ? a.procedures?.find(p => p.id === 'earlier_result')
        : undefined;
    expect(earlier?.values).toEqual([frac(3), frac(3, 10)]);
  });

  it('every row is marked reviewed: false (teacher review)', () => {
    const rows = [
      ...ex2.parts.flatMap(p =>
        p.groups.flatMap(g =>
          g.steps.flatMap(s => (s as { procedures?: Row[] }).procedures ?? []),
        ),
      ),
      ...ex2.variants.flatMap(
        v => (v.step as { procedures?: Row[] }).procedures ?? [],
      ),
    ];
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every(r => r.reviewed === false)).toBe(true);
  });

  it('rejects a procedure whose value is the correct answer', () => {
    const raw = clone(ex2);
    // Balls with no 0 = -1, 1, 2 = 3: the answer of 1b/s5.
    step1b(raw, 's5').procedures!.push({
      id: 'balls_in_event',
      misconceptionId: 'counts_balls_not_pairs',
      reviewed: false,
    });
    expect(errorsOf(raw)).toContain(
      '1b/s5: procedure balls_in_event gives the answer 3',
    );
  });

  it('rejects a procedure that does not fit the answer', () => {
    const raw = clone(ex2);
    step1b(raw, 's8').procedures!.push({
      id: 'all_outcomes',
      misconceptionId: 'counts_all_outcomes',
      reviewed: false,
    });
    expect(errorsOf(raw).join('\n')).toMatch(
      /1b\/s8: procedure all_outcomes does not apply/,
    );
  });

  it('rejects an unknown misconception and an unknown procedure', () => {
    const raw = clone(ex2);
    step1b(raw, 's5').procedures![0]!.misconceptionId = 'ghost';
    expect(errorsOf(raw)).toContain('1b/s5: unknown misconception ghost');
    const raw2 = clone(ex2);
    step1b(raw2, 's5').procedures![0]!.id = 'magic';
    expect(errorsOf(raw2).join('\n')).toMatch(/procedures\.0\.id/);
  });
});
