import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent, startLesson } from '../session/lesson';
import type { FeedItem } from '../session/types';
import { reportTarget } from './reportTarget';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const content = buildContent(r.loaded, '1b');
const items = startLesson(content).state.items;

describe('reportTarget: placement and labels', () => {
  it('the active question is prominent; lesson blocks use the "..." menu, labelled unreviewed', () => {
    const question = items.find(i => i.kind === 'question')!;
    expect(reportTarget(question, content)).toMatchObject({
      prominent: true,
      trust: 'lesson_unreviewed',
      snapshotKey: question.key,
    });
    const tutor = items.find(i => i.kind === 'tutor')!;
    expect(reportTarget(tutor, content)).toMatchObject({
      prominent: false,
      source: 'lesson',
      trust: 'lesson_unreviewed',
    });
  });

  it('a done question is no longer prominent', () => {
    const question = items.find(i => i.kind === 'question')!;
    const done = { ...question, status: 'done' } as FeedItem;
    expect(reportTarget(done, content)?.prominent).toBe(false);
  });

  it('AI blocks are prominent and labelled ai_generated; engine values engine_computed', () => {
    const ai: FeedItem = {
      key: 'tutor-9',
      kind: 'tutor',
      depth: 0,
      rich: { fr: 'x' },
      longPress: false,
      trust: 'ai_generated',
    };
    expect(reportTarget(ai, content)).toMatchObject({
      prominent: true,
      source: 'ai',
      trust: 'ai_generated',
      blockId: 'rt:1b:tutor-9',
    });
    const engine: FeedItem = {
      key: 'answer-3',
      kind: 'answer',
      depth: 0,
      rich: { math: '7/10' },
      trust: 'engine_computed',
    };
    expect(reportTarget(engine, content)).toMatchObject({
      prominent: false,
      trust: 'engine_computed',
      source: 'lesson',
    });
  });

  it('student bubbles and dividers have no report entry', () => {
    for (const item of [
      {
        key: 's',
        kind: 'student',
        depth: 0,
        content: { kind: 'text', text: 'x' },
      },
      { key: 'r', kind: 'return', depth: 0 },
      { key: 'd', kind: 'done', depth: 0 },
    ] as FeedItem[]) {
      expect(reportTarget(item, content)).toBeNull();
    }
  });
});
