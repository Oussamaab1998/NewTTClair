import ex2 from '../../src/content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../src/content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../src/content/loader';
import { playRealSession1b } from '../../src/lesson/session/fixtures/realSession1b';
import { contentCoverage, formatCoverage, usageByStep } from './coverage';

const loaded = () => {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
};

describe('content coverage (replay -- coverage)', () => {
  it('1.b after content round C1: s3 and s7 have every kind of help that applies', () => {
    const rows = contentCoverage(loaded()).filter(r => r.key.startsWith('1b/'));
    expect(
      rows.map(r => [r.key, r.fresh, r.walkthrough, r.twin, r.alternative]),
    ).toEqual([
      ['1b/s3', '✓', '✓', '✓', '✓'],
      ['1b/s5', '✓', '✓', '✓', '✓'],
      ['1b/s7', '✓', '✓', '✓', '✓'],
      ['1b/s8', '✓', '✓', '✓', '✓'],
    ]);
    // Still missing: a deep dive on 1b/s7 (not in C1).
    expect(rows.find(r => r.key === '1b/s7')?.deepDive).toBe('✗');
  });

  it('the table, with usage from a log', () => {
    const usage = usageByStep(playRealSession1b().events);
    expect(usage.get('var:tr-1b-s5-noneg')).toEqual({
      wrong: 4,
      hint: 0,
      reveal: 1,
      notSure: 2,
    });
    const text = formatCoverage(contentCoverage(loaded()), usage);
    expect(text.split('\n')[0]).toContain('wrong/hint/reveal/not sure in logs');
    expect(text).toContain(
      '| 1b/s7 | choice | 3 | – | ✓ | ✓ | ✓ | ✗ | ✓ | 2/2 | ✓ | 1/0/0/0 |',
    );
  });
});
