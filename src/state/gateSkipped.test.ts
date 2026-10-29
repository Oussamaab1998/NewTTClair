import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import { makeExplored, makeFinding } from '../components/probability2/finding';
import type { EventDraft } from '../telemetry/events';
import { EventLog, fixedClock } from '../telemetry/log';
import { catalogFor } from './catalog';
import { deriveState } from './derive';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
const catalog = catalogFor(loaded);

function stateAfter(drafts: EventDraft[]) {
  const log = new EventLog(
    {
      sessionId: 's1',
      studentId: 'anon-1',
      exerciseId: 'bac2022c-ex2',
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  return deriveState(log.append(drafts), catalog);
}

const at = { questionId: '1b', stepId: 's5' };
const wrong: EventDraft = {
  t: 'answer',
  ...at,
  kind: 'typed',
  value: '10',
  correct: false,
  attempt: 1,
};
const explored = (how: 'done' | 'skipped'): EventDraft => ({
  t: 'component_event',
  ...at,
  component: 'GroupBoxes',
  name: 'explored',
  payload: makeExplored(how === 'done' ? '3_positions' : 'not_sure', how),
});
const finding = (how: 'found' | 'skipped'): EventDraft => ({
  t: 'component_event',
  ...at,
  component: 'GroupBoxes',
  name: 'finding',
  payload: makeFinding({
    findingId: 'groupboxes.orderings_per_box',
    numbers: { boxes: '120' },
    route: ['predict:boxes=120'],
    how,
    correct: how === 'found' ? true : null,
  }),
});

describe('a skipped gate never counts as understanding (change 2)', () => {
  const base = stateAfter([wrong]);

  it('explored and finding events, skipped or not, leave the student state exactly as it was', () => {
    expect(stateAfter([wrong, explored('skipped'), finding('skipped')])).toEqual(base);
    expect(stateAfter([wrong, explored('done'), finding('found')])).toEqual(base);
  });

  it('on their own they create no skill evidence at all', () => {
    const s = stateAfter([explored('skipped'), finding('skipped')]);
    const evidence = Object.values(s.skills).flatMap(k => [
      k.evidence.correct,
      k.evidence.helped,
      k.evidence.revealed,
      k.evidence.skipped,
      k.evidence.transferOk,
    ]);
    expect(evidence.every(n => n === 0)).toBe(true);
  });
});
