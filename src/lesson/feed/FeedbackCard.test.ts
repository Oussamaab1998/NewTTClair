import type { FeedItem } from '../session/types';
import { feedbackCardAllowed } from './FeedbackCard';

const q = (key: string): FeedItem =>
  ({ key, kind: 'question', depth: 0, status: 'done' } as unknown as FeedItem);
const selfReport = (key: string): FeedItem =>
  ({
    key,
    kind: 'choice_card',
    depth: 0,
    purpose: 'self_report',
  } as unknown as FeedItem);
const done: FeedItem = { key: 'd', kind: 'done', depth: 0 };

describe('feedbackCardAllowed (D19 placement)', () => {
  it('only after the done line', () => {
    expect(feedbackCardAllowed([q('a')])).toBe(false);
    expect(feedbackCardAllowed([q('a'), done])).toBe(true);
  });

  it('not right after a self-report card on the same question', () => {
    expect(feedbackCardAllowed([q('a'), selfReport('s'), done])).toBe(false);
    // A later question card after the self-report: the card is allowed.
    expect(feedbackCardAllowed([selfReport('s'), q('b'), done])).toBe(true);
  });
});
