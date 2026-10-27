import type { Event } from './events';
import { formatHelpUsage, helpUsage } from './helpUsage';

const base = {
  id: 'e',
  ts: 1,
  sessionId: 's',
  studentId: 'a',
  exerciseId: 'x',
  contentVersion: 'v',
  questionId: '1b',
  stepId: 's5',
};
const ev = (e: Record<string, unknown>) => ({ ...base, ...e } as Event);

describe('help usage summary (help chips, 2026-10-22)', () => {
  const events = [
    ev({
      t: 'component_event',
      component: 'HelpChips',
      name: 'shown',
      payload: { reason: 'wrong' },
    }),
    ev({ t: 'request', kind: 'change_method', via: 'chip', attempt: 2 }),
    ev({ t: 'request', kind: 'simpler', via: 'chip', attempt: 2 }),
    ev({ t: 'request', kind: 'simpler' }), // older log: the "⋯" was the only way
    ev({
      t: 'component_event',
      component: 'HelpChoice',
      name: 'opened',
      payload: {},
    }),
    ev({ t: 'request', kind: 'change_method', via: 'choice', attempt: 1 }),
    ev({
      t: 'component_event',
      component: 'HelpChoice',
      name: 'picked',
      payload: { choice: 'hint' },
    }),
    ev({ t: 'offer_response', offer: 'repair', accepted: true }),
    ev({ t: 'offer_response', offer: 'repair', accepted: false }),
    ev({ t: 'offer_response', offer: 'compress', accepted: true }),
  ];

  it('counts chips, the "⋯", the choice, the repair offer and why chips showed', () => {
    expect(helpUsage(events)).toEqual({
      chip: { change: 1, easier: 1 },
      menu: { change: 0, easier: 1 },
      choice: { opened: 1, change: 1, easier: 0, hint: 1, notSure: 0 },
      offer: { yes: 1, no: 1 },
      shown: { wrong: 1, not_sure: 0, idle: 0 },
    });
  });

  it('formats one line for the dev panel', () => {
    expect(formatHelpUsage(helpUsage(events))).toBe(
      'help: chip change 1 / easier 1 · ⋯ change 0 / easier 1 · choice opened 1 (change 1, easier 0, hint 1, not sure 0) · offer yes 1 / no 1 · shown wrong 1 / not sure 0 / idle 0',
    );
  });
});
