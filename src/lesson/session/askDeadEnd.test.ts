/**
 * Round 1 "dead ends", item 4 (product owner, 2026-10-22): a long-press ask
 * with no verified answer is never a dead end. The first time on a block:
 * the "no canned answer" line, then an offer of the next hint or the deep
 * dive. Never the same dead end twice for a block: the next time, the help
 * comes at once. The ask is logged as a struggle signal.
 */
import { buildSituation } from '../../planner/situation';
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
      sessionId: 'ask',
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
    const n = state.items.length;
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
      n,
    };
  };
  return { act, log, content, state: () => state };
}

/** q1b-s2 is a tutor block with no verified answers; the active card is 1b/s3 (3 hints, a deep dive). */
const askS2 = (mode = 'why'): Act =>
  ({ type: 'ask_longpress', blockId: 'q1b-s2', mode, quoted: 'x' } as Act);
const kinds = (items: FeedItem[]) =>
  items.map(i => (i.kind === 'choice_card' ? `card:${i.purpose}` : i.kind));

describe('long-press with no verified answer: never a dead end', () => {
  it('the first time: the line, then an offer of the next hint or the deep dive', () => {
    const l = lesson();
    const r = l.act(askS2());
    expect(kinds(r.added)).toEqual(['student', 'feedback', 'card:ask_next']);
    expect(r.added[1]).toMatchObject({ message: 'noCannedAnswer' });
    expect(r.added[2]).toMatchObject({
      choices: ['hint', 'deep_dive', 'dismissed'],
      blocking: false,
    });
  });

  it('the offer leads somewhere: «تلميح» gives hint 1, «نفهمو الفكرة» opens the deep dive', () => {
    const a = lesson();
    a.act(askS2());
    const h = a.act({
      type: 'card_choice',
      purpose: 'ask_next',
      choice: 'hint',
    } as Act);
    expect(h.events.find(e => e.t === 'hint')).toMatchObject({ level: 1 });
    expect(kinds(h.added)).toContain('hint');
    const b = lesson();
    b.act(askS2());
    const d = b.act({
      type: 'card_choice',
      purpose: 'ask_next',
      choice: 'deep_dive',
    } as Act);
    expect(kinds(d.added)).toContain('deep_dive_start');
    expect(b.state().stack.at(-1)?.ref).toMatchObject({
      scope: 'mini',
      deepDiveId: 'au_moins_contraire',
    });
  });

  it('never the same dead end twice for a block: the second ask gets the next hint at once', () => {
    const l = lesson();
    l.act(askS2('why'));
    l.act({
      type: 'card_choice',
      purpose: 'ask_next',
      choice: 'dismissed',
    } as Act);
    const r = l.act(askS2('example'));
    expect(
      r.added.some(
        i => i.kind === 'feedback' && i.message === 'noCannedAnswer',
      ),
    ).toBe(false);
    expect(r.added.some(i => i.kind === 'choice_card')).toBe(false);
    expect(r.events.find(e => e.t === 'hint')).toMatchObject({ level: 1 });
  });

  it('when no hint and no deep dive is left: a line points to the ask field (still not silent)', () => {
    const l = lesson();
    for (let i = 0; i < 3; i += 1) {
      l.act({ type: 'hint' } as Act);
    }
    l.act({ type: 'not_sure' } as Act); // opens the deep dive
    l.act({ type: 'leave_deep_dive' } as Act);
    const r = l.act(askS2());
    expect(r.added.some(i => i.kind === 'choice_card')).toBe(false);
    expect(
      r.added.map(i => (i.kind === 'feedback' ? i.message : null)),
    ).toContain('noCannedAnswerField');
  });

  it('a blocked answer is logged as a struggle signal (event, situation, derived state)', () => {
    const l = lesson();
    const r = l.act(askS2());
    const ask = r.events.find(e => e.t === 'ask');
    expect(ask).toMatchObject({ via: 'longpress', unanswered: true });
    // The planner's view of the step at a "not sure" now.
    const events = l.log.all();
    const last = events[events.length - 1]!;
    const probe = {
      ...last,
      id: 'p',
      ts: last.ts + 1,
      stepId: 's3',
      t: 'not_sure',
      attempt: 1,
    } as Event;
    const sit = buildSituation([...events, probe], l.content.catalog);
    expect(sit?.step.struggle).toBe(2);
    const d = deriveState(events, l.content.catalog);
    expect(d.skills['complement-event']?.evidence).toMatchObject({
      unanswered: 1,
    });
  });

  it('a block with a verified answer is unchanged (no offer, no struggle)', () => {
    const l = lesson();
    const r = l.act({
      type: 'ask_longpress',
      blockId: 'q1b-s1',
      mode: 'why',
      quoted: 'x',
    } as Act);
    expect(kinds(r.added)).toEqual(['student', 'ask_answer']);
    expect(r.events.find(e => e.t === 'ask')).not.toHaveProperty('unanswered');
  });
});
