import { ArRunsSchema, findRunIssues } from '../../lesson/rich/runs';
import { FEED_SAMPLE, SENTENCES } from './bidiTestFixtures';

describe('bidi test fixtures', () => {
  const all = [
    ...SENTENCES.map(s => ({ id: s.id, runs: s.runs })),
    { id: 'feed.intro', runs: FEED_SAMPLE.intro },
    { id: 'feed.question', runs: FEED_SAMPLE.question },
  ];

  it.each(all)('$id is valid and follows the RTL content rules', ({ runs }) => {
    expect(ArRunsSchema.safeParse(runs).success).toBe(true);
    expect(findRunIssues(runs)).toEqual([]);
  });
});
