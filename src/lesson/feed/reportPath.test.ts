import type { FeedItem } from '../session/types';
import { reportPath, visualOwners } from './reportTarget';

const item = (kind: FeedItem['kind'], key: string = kind, extra: object = {}) =>
  ({ kind, key, depth: 0, ...extra } as unknown as FeedItem);

describe('reportPath: every content block can reach its trust label and Report', () => {
  it('content blocks each have a path; non-content items have none', () => {
    const content: [FeedItem, string][] = [
      [item('tutor', 't', { longPress: true, blockId: 'b1' }), 'text'],
      [item('tutor', 't2', { longPress: false }), 'longpress'],
      [item('statement'), 'longpress'],
      [item('math'), 'longpress'],
      [item('feedback'), 'longpress'],
      [item('hint'), 'longpress'],
      [item('answer'), 'longpress'],
      [item('ask_answer'), 'longpress'],
      [item('writeup'), 'longpress'],
      [item('component_fallback'), 'longpress'],
      [item('choice_card'), 'title'],
      [item('question'), 'card'],
      [item('component'), 'owner'],
    ];
    expect(content.map(([i]) => reportPath(i))).toEqual(
      content.map(([, p]) => p),
    );
    for (const kind of [
      'student',
      'variant_start',
      'deep_dive_start',
      'return',
      'done',
      'thinking',
    ] as const) {
      expect(reportPath(item(kind))).toBeNull();
    }
  });
});

describe('visualOwners: a visual is reported from a card', () => {
  it('the next card after the visual owns it', () => {
    const items = [
      item('component', 'urn'),
      item('tutor', 't'),
      item('component', 'space'),
      item('question', 'q1'),
      item('component', 'law'),
      item('question', 'q2'),
    ];
    expect(Object.fromEntries(visualOwners(items))).toEqual({
      urn: 'q1',
      space: 'q1',
      law: 'q2',
    });
  });

  it('a visual with no card after it goes to the last card before it', () => {
    const items = [
      item('question', 'q1'),
      item('question', 'q2'),
      item('component', 'chart'),
      item('done', 'end'),
    ];
    expect(visualOwners(items).get('chart')).toBe('q2');
  });

  it('a part with no card at all leaves the visual without an owner', () => {
    expect(visualOwners([item('component', 'urn')]).size).toBe(0);
  });
});
