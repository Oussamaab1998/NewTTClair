import { readQueueExport } from '../../src/telemetry/reports';
import { formatReports } from './reports';

const line = (o: object) => JSON.stringify(o);
const device = {
  appVersion: '0.0.1',
  platform: 'ios',
  osVersion: '26.5',
  locale: 'ar-TN',
};
const event = {
  id: 'r1',
  ts: 0,
  sessionId: 's',
  studentId: 'local-anon',
  exerciseId: 'bac2022c-ex2',
  contentVersion: 'ex2-0.5.0',
  questionId: '2a',
  stepId: 's10',
  t: 'report',
  blockId: 'q2a-s10',
  reason: 'wrong_math',
  source: 'ai',
  text: 'a | b',
};

describe('replay reports', () => {
  it('prints one row per entry, counts, and skipped lines', () => {
    const text = [
      line({
        kind: 'report',
        id: 'r1',
        event,
        context: { device, lastEvents: [] },
      }),
      'garbage',
    ].join('\n');
    const { entries, errors } = readQueueExport(text);
    const out = formatReports(entries, errors);
    expect(out).toContain(
      '| 1 | report | 1970-01-01T00:00:00.000Z | ex2-0.5.0 2a/s10 | q2a-s10 | ai | wrong_math | a / b |',
    );
    expect(out).toContain('by reason: wrong_math: 1');
    expect(out).toContain('by source: ai: 1');
    expect(out).toContain('skipped lines: 2 (not JSON)');
  });

  it('lists feedback entries and counts them by choice', () => {
    const fb = {
      kind: 'feedback',
      id: 'f1',
      event: {
        ...event,
        id: 'f1',
        t: 'feedback',
        choice: 'ok',
        text: 'x',
        blockId: undefined,
        reason: undefined,
        source: undefined,
      },
      context: { device, lastEvents: [] },
    };
    const clean = JSON.parse(JSON.stringify(fb));
    const { entries, errors } = readQueueExport(line(clean));
    expect(errors).toEqual([]);
    const out = formatReports(entries);
    expect(out).toContain('| feedback |');
    expect(out).toContain('feedback: ok: 1');
  });
});
