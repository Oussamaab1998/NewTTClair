import { createRulesPlanner } from '../../planner/rules';
import { EventLog, fixedClock } from '../../telemetry/log';
import { loadEx2 } from './fixtures/realSession1b';
import { buildContent, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { LessonAction, LessonState } from './types';

type Act = Omit<LessonAction, 'at'>;

function lesson() {
  const loaded = loadEx2();
  const content = buildContent(loaded, '1b');
  const log = new EventLog(
    {
      sessionId: 'rv',
      studentId: 'anon',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const rules = createRulesPlanner(content.menu);
  const start = startLesson(content);
  log.append(start.events);
  let state: LessonState = start.state;
  let t = 1000;
  const act = (a: Act) => {
    t += 5000;
    const before = log.all().length;
    state = stepSync(
      content,
      state,
      { ...a, at: t } as LessonAction,
      log,
      rules,
    );
    return log.all().slice(before);
  };
  const ref = () => state.stack[state.stack.length - 1]?.ref;
  const card = () =>
    [...state.items]
      .reverse()
      .find(i => i.kind === 'question' && i.status === 'active');
  return { act, ref, card, state: () => state };
}

const ans = (raw: string): Act => ({ type: 'answer', value: { raw } } as Act);

/** Up to the transfer of 1b/s5 (s3 right, s5 with a hint, "guessed"). */
function atTransfer() {
  const l = lesson();
  l.act({ type: 'answer', value: { optionId: 'none' } } as Act);
  l.act({ type: 'hint' } as Act);
  l.act(ans('3'));
  l.act({
    type: 'card_choice',
    purpose: 'self_report',
    choice: 'guessed',
  } as Act);
  expect(l.ref()).toMatchObject({
    scope: 'variant',
    variantId: 'tr-1b-s5-noneg',
  });
  return l;
}

describe('reveal on variant / transfer steps: after 2 closed detours or the end of the ladder (2026-10-22)', () => {
  it('refused before (no hint used, no detour): no reveal event', () => {
    const l = atTransfer();
    expect(l.act({ type: 'reveal' } as Act).some(e => e.t === 'reveal')).toBe(
      false,
    );
    expect(l.card()).not.toMatchObject({ revealUnlocked: true });
  });

  const reveals = (l: ReturnType<typeof atTransfer>) =>
    l.act({ type: 'reveal' } as Act).some(e => e.t === 'reveal');
  /** Detour 1: "not sure" opens the pairs deep dive; its mini answered (acted). */
  const answeredDeepDive = (l: ReturnType<typeof atTransfer>) => {
    l.act({ type: 'not_sure' } as Act);
    expect(l.ref()).toMatchObject({ scope: 'mini' });
    l.act(ans('3'));
    expect(l.ref()).toMatchObject({ variantId: 'tr-1b-s5-noneg' });
  };

  it('a detour left at once does not count (product owner, 2026-10-22)', () => {
    const l = atTransfer();
    answeredDeepDive(l);
    expect(reveals(l)).toBe(false);
    l.act({ type: 'request', kind: 'change_method' } as Act);
    expect(l.ref()).not.toMatchObject({ variantId: 'tr-1b-s5-noneg' });
    l.act({ type: 'leave_deep_dive' } as Act);
    expect(l.ref()).toMatchObject({ variantId: 'tr-1b-s5-noneg' });
    expect(l.card()).not.toMatchObject({ revealUnlocked: true });
    expect(reveals(l)).toBe(false);
  });

  it('a detour with a tap in it, then left, counts: allowed after 2; the card shows it', () => {
    const l = atTransfer();
    answeredDeepDive(l);
    l.act({ type: 'request', kind: 'change_method' } as Act);
    l.act({ type: 'detour_acted' } as Act);
    l.act({ type: 'leave_deep_dive' } as Act);
    expect(l.ref()).toMatchObject({ variantId: 'tr-1b-s5-noneg' });
    expect(l.card()).toMatchObject({ revealUnlocked: true });
    expect(reveals(l)).toBe(true);
  });

  it('a hint taken in the detour is acting too', () => {
    const l = atTransfer();
    answeredDeepDive(l);
    l.act({ type: 'request', kind: 'change_method' } as Act);
    l.act({ type: 'hint' } as Act);
    l.act({ type: 'leave_deep_dive' } as Act);
    expect(reveals(l)).toBe(true);
  });

  it('a tap on the transfer itself does not count as a detour', () => {
    const l = atTransfer();
    answeredDeepDive(l);
    l.act({ type: 'detour_acted' } as Act);
    expect(reveals(l)).toBe(false);
  });

  it('main steps keep rule 6: only after the ladder', () => {
    const l = lesson();
    expect(l.act({ type: 'reveal' } as Act).some(e => e.t === 'reveal')).toBe(
      false,
    );
    for (let i = 0; i < 3; i += 1) {
      l.act({ type: 'hint' } as Act);
    }
    expect(l.act({ type: 'reveal' } as Act).some(e => e.t === 'reveal')).toBe(
      true,
    );
  });
});

describe('help chips after a declined repair offer (2026-10-22)', () => {
  it('the card holds the chips until the next wrong answer or "not sure" on the step', () => {
    const l = lesson();
    l.act({ type: 'answer', value: { optionId: 'one' } } as Act);
    l.act({ type: 'card_choice', purpose: 'repair', choice: 'no' } as Act);
    expect(l.card()).toMatchObject({ attempts: 1, chipsHold: 1 });
  });
});
