import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent } from '../../lesson/session/lesson';
import {
  buildPlanPack,
  buildTutorPack,
  serializePack,
  solutionSoFar,
} from './contextPack';
import { fixtureSituation } from './fixtures/guardFixtures';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const c1b = buildContent(r.loaded, '1b');
const at = (
  stepKey: string,
  extra: Partial<Parameters<typeof solutionSoFar>[1]> = {},
) =>
  solutionSoFar(c1b, {
    stepKey,
    hintsUsed: 0,
    hintCount: 3,
    revealed: false,
    ...extra,
  });

describe('answer-leak fix A: the model only gets the solution so far', () => {
  it('at 1b/s3: no answer of s3 or of any later step', () => {
    const s = at('1b/s3');
    expect(s.steps).toEqual([]);
    expect(Object.values(s.values)).not.toContain('3/10');
    const { situation, content } = fixtureSituation('s3');
    const text = serializePack(buildPlanPack(content, situation));
    expect(text).not.toContain('aucune des deux boules');
    expect(text).not.toContain('p3_10');
  });

  it('at 1b/s8: the answers of s3, s5, s7, never the answer of s8 itself', () => {
    const s = at('1b/s8', { hintCount: 2 });
    expect(s.steps.map(x => x.key)).toEqual(['1b/s3', '1b/s5', '1b/s7']);
    expect(s.steps.map(x => x.answer)).toEqual([
      expect.stringContaining('aucune des deux boules'),
      '3',
      expect.stringContaining('p3_10'),
    ]);
    // 7/10 (pB) is the answer of s8: not sent as a value while it is open.
    expect(Object.values(s.values)).not.toContain('7/10');
    expect(Object.values(s.values)).toContain('3/10');
  });

  it('the current answer is sent once revealed or the ladder is used up', () => {
    expect(at('1b/s5', { revealed: true }).steps.map(x => x.key)).toContain(
      '1b/s5',
    );
    expect(at('1b/s5', { hintsUsed: 3 }).steps.map(x => x.key)).toContain(
      '1b/s5',
    );
    expect(at('1b/s5', { hintsUsed: 2 }).steps.map(x => x.key)).not.toContain(
      '1b/s5',
    );
  });

  it('task steps: the EventPicker answer only after the step is done', () => {
    const c2a = buildContent(r.loaded, '2a');
    const open = solutionSoFar(c2a, {
      stepKey: '2a/s10',
      hintsUsed: 0,
      hintCount: 3,
      revealed: false,
    });
    expect(JSON.stringify(open)).not.toContain('a-b');
    const later = solutionSoFar(c2a, {
      stepKey: '2a/s15',
      hintsUsed: 0,
      hintCount: 2,
      revealed: false,
    });
    expect(later.steps.find(x => x.key === '2a/s10')?.answer).toContain('a-b');
  });

  it('the tutor pack follows the same rule', () => {
    const pack = buildTutorPack(c1b, {
      stepKey: '1b/s3',
      hintsUsed: 1,
      hintCount: 3,
      skills: {},
      history: [],
      studentText: 'كيفاش نعرف الحدث العكسي؟',
    });
    expect(serializePack(pack)).not.toContain('aucune des deux boules');
  });
});
