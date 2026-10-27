/**
 * D2 (round 2, 2026-10-22): a reveal is not the end. After a main step or a
 * transfer is revealed, a fresh variant on a new urn opens (one per reveal,
 * capped per skill and session), with a reason line and a quiet «موش توّا»
 * exit. A skill whose last reveal is not followed by a correct variant stays
 * at most "shaky".
 */
import { createRulesPlanner } from '../../planner/rules';
import { deriveState } from '../../state/derive';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { loadEx2 } from './fixtures/realSession1b';
import { buildContent, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { FeedItem, LessonAction, LessonState } from './types';

type Act = Omit<LessonAction, 'at'>;

function lesson() {
  const loaded = loadEx2();
  const content = buildContent(loaded, '1b');
  const log = new EventLog(
    {
      sessionId: 'rev',
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
    const keys = new Set(state.items.map(i => i.key));
    state = stepSync(
      content,
      state,
      { ...a, at: t } as LessonAction,
      log,
      rules,
    );
    return {
      events: log.all().slice(before),
      added: state.items.filter(i => !keys.has(i.key)),
    };
  };
  const ref = () => state.stack[state.stack.length - 1]?.ref;
  const status = (skill: string) =>
    deriveState(log.all(), content.catalog).skills[skill]?.status;
  return { act, ref, status, log, state: () => state };
}

const kinds = (items: FeedItem[]) =>
  items.map(i =>
    i.kind === 'feedback' && i.message ? `feedback:${i.message}` : i.kind,
  );
const planOf = (events: readonly Event[]) => {
  const p = events.find(e => e.t === 'plan');
  return p?.t === 'plan' ? p.decision : undefined;
};

/** 1b/s3 answered; 1b/s5 revealed after its hint ladder. */
function revealS5() {
  const l = lesson();
  l.act({ type: 'answer', value: { optionId: 'none' } } as Act);
  for (let i = 0; i < 3; i += 1) {
    l.act({ type: 'hint' } as Act);
  }
  const r = l.act({ type: 'reveal' } as Act);
  return { l, r };
}

describe('after a reveal: the fresh variant', () => {
  it('a main step revealed: the answer, a reason line, then the fresh variant (not offered)', () => {
    const { l, r } = revealS5();
    expect(planOf(r.events)).toMatchObject({
      ruleId: 'rule.after_reveal.fresh',
      next: { kind: 'variant', variantId: 'tr-1b-s5-fresh' },
    });
    expect(kinds(r.added)).toEqual(
      expect.arrayContaining([
        'answer',
        'feedback:afterRevealReason',
        'variant_start',
        'question',
      ]),
    );
    expect(l.ref()).toMatchObject({
      scope: 'variant',
      variantId: 'tr-1b-s5-fresh',
    });
    const card = r.added.find(i => i.kind === 'question');
    expect(card).toMatchObject({ freshExit: true });
  });

  it('answered right: the lesson goes on, and the skill is no longer held at "shaky"', () => {
    const { l } = revealS5();
    expect(l.status('counting-pairs')).toBe('shaky');
    l.act({ type: 'answer', value: { raw: '15' } } as Act);
    expect(l.ref()).toMatchObject({ scope: 'main', stepId: 's7' });
    expect(['known', 'recovering']).toContain(l.status('counting-pairs'));
  });

  it('double reveal: the fresh variant revealed too, no second one; the lesson moves on', () => {
    const { l } = revealS5();
    for (let i = 0; i < 3; i += 1) {
      l.act({ type: 'hint' } as Act);
    }
    const r = l.act({ type: 'reveal' } as Act);
    expect(planOf(r.events)).toMatchObject({
      ruleId: 'rule.after_reveal.none',
    });
    expect(l.ref()).toMatchObject({ scope: 'main', stepId: 's7' });
    expect(l.status('counting-pairs')).toBe('shaky');
  });

  it('«موش توّا» closes it without a failure: no transfer fail, the skill stays shaky, the cap is used', () => {
    const { l } = revealS5();
    const r = l.act({ type: 'leave_deep_dive' } as Act);
    expect(r.events.some(e => e.t === 'transfer')).toBe(false);
    expect(
      r.events.find(e => e.t === 'component_event' && e.name === 'closed'),
    ).toMatchObject({
      payload: { variantId: 'tr-1b-s5-fresh', outcome: 'abandoned' },
    });
    expect(l.ref()).toMatchObject({ scope: 'main', stepId: 's7' });
    expect(l.status('counting-pairs')).toBe('shaky');
  });
});

describe('skill state: a reveal holds the skill until a later correct variant', () => {
  const base = { questionId: '1b' } as const;
  function stateAfter(drafts: Parameters<EventLog['append']>[0]) {
    const loaded = loadEx2();
    const content = buildContent(loaded, '1b');
    const log = new EventLog(
      {
        sessionId: 'skill',
        studentId: 'anon',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    log.append(drafts);
    return deriveState(log.all(), content.catalog).skills['counting-pairs']
      ?.status;
  }
  const cleanTransfer = {
    ...base,
    stepId: 'var:tr-1b-s5-noneg',
    t: 'transfer',
    skillId: 'counting-pairs',
    correct: true,
    variantId: 'tr-1b-s5-noneg',
    hintsUsed: 0,
  } as const;
  const reveal = {
    ...base,
    stepId: 's5',
    t: 'reveal',
    hintsUsed: 3,
    attempt: 1,
  } as const;

  it('a clean transfer, then a reveal: back to "shaky" (was "known")', () => {
    expect(stateAfter([cleanTransfer])).toBe('known');
    expect(stateAfter([cleanTransfer, reveal])).toBe('shaky');
  });

  it('a reveal, then a correct fresh variant: lifted again', () => {
    const fresh = {
      ...cleanTransfer,
      stepId: 'var:tr-1b-s5-fresh',
      variantId: 'tr-1b-s5-fresh',
    };
    expect(['known', 'recovering']).toContain(stateAfter([reveal, fresh]));
  });
});
