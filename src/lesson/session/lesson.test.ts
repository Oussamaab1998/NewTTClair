import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { EventSchema, type Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { createRulesPlanner, type RulesPlanner } from '../../planner/rules';
import {
  buildContent,
  reduce,
  startLesson,
  type LessonContent,
} from './lesson';
import { deriveState } from '../../state/derive';
import { stepSync } from './orchestrate';
import { actionsFromEvents } from './replay';
import type { FeedItem, FeedItemOf, LessonAction, LessonState } from './types';

function load(raw: unknown = ex2): LoadedExercise {
  const r = loadExercise(raw, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

class Session {
  readonly content: LessonContent;
  readonly log = new EventLog(
    {
      sessionId: 'sess-1',
      studentId: 'anon-1',
      exerciseId: 'bac2022c-ex2',
      contentVersion: 'ex2-test',
    },
    fixedClock(),
  );
  state: LessonState;
  private t = 0;
  private readonly planner: RulesPlanner;

  constructor(loaded: LoadedExercise = load(), questionId = '1b') {
    this.content = buildContent(loaded, questionId);
    // The test log stamps 'ex2-test': map it to the loaded content's steps.
    this.content.catalog.versions.set(
      'ex2-test',
      this.content.catalog.versions.get(loaded.exercise.contentVersion)!,
    );
    this.planner = createRulesPlanner(this.content.menu);
    const r = startLesson(this.content);
    this.state = r.state;
    this.log.append(r.events);
  }
  /** A student action, then the rules planner's decision if one is pending (like the app). */
  act(action: ActionInput): Event[] {
    this.t += 1500;
    const before = this.log.all().length;
    this.state = stepSync(
      this.content,
      this.state,
      { ...action, at: this.t } as LessonAction,
      this.log,
      this.planner,
    );
    return this.log.all().slice(before);
  }
  /** Replays a logged action with the reducer alone: logged plans are applied as they are. */
  replay(action: LessonAction) {
    this.t += 1500;
    const r = reduce(this.content, this.state, { ...action, at: this.t });
    this.state = r.state;
    this.log.append(r.events);
  }
  /** Events of an action without the planner's `plan` record. */
  static effects(events: Event[]): Event[] {
    return events.filter(e => e.t !== 'plan');
  }
  card_(
    purpose: 'self_report' | 'compress' | 'clarify' | 'repair' | 'teacher_note',
    choice: string,
  ) {
    const card = [...this.items]
      .reverse()
      .find(
        i =>
          i.kind === 'choice_card' &&
          i.purpose === purpose &&
          i.status === 'open',
      );
    expect(card).toBeDefined();
    return this.act({ type: 'card_choice', purpose, choice });
  }
  choose(optionId: string) {
    return this.act({ type: 'answer', value: { optionId } });
  }
  type(raw: string) {
    return this.act({ type: 'answer', value: { raw }, keys: raw.split('') });
  }
  get items(): FeedItem[] {
    return this.state.items;
  }
  get last(): FeedItem {
    return this.items[this.items.length - 1]!;
  }
  get card(): FeedItemOf<'question'> {
    const c = this.last;
    if (c.kind !== 'question') {
      throw new Error(`last item is ${c.kind}`);
    }
    return c;
  }
  cardFor(stepId: string) {
    const c = this.card;
    const id =
      c.ref.scope === 'main'
        ? c.ref.stepId
        : c.ref.scope === 'mini'
        ? `dd:${c.ref.deepDiveId}`
        : `var:${c.ref.variantId}`;
    expect(id).toBe(stepId);
    expect(c.status).toBe('active');
    return c;
  }
  depth() {
    return this.state.stack.length - 1;
  }
}

/** Plays the guided path with correct answers. */
function playHappyPath(s: Session) {
  s.cardFor('s3');
  s.choose('none');
  s.cardFor('s5');
  s.type('3');
  s.cardFor('s7');
  s.choose('p3_10');
  s.cardFor('s8');
  s.type('0,7');
}

describe('lesson 1.b, happy path', () => {
  it('starts with the statement, the goal and the first steps', () => {
    const s = new Session();
    expect(s.items.map(i => i.kind)).toEqual([
      'statement',
      'statement',
      'tutor',
      'tutor',
      'question',
    ]);
    s.cardFor('s3');
    expect(s.log.all()).toEqual([]);
  });

  it('plays end to end from JSON and ends with the writeup', () => {
    const s = new Session();
    playHappyPath(s);
    expect(s.state.finished).toBe(true);
    const writeup = s.items.find(
      (i): i is FeedItemOf<'writeup'> => i.kind === 'writeup',
    );
    expect(writeup?.lines.at(-1)).toBe(
      'Par conséquent p(B) = 1 − p(B̄) = 1 − 3/10 = 7/10.',
    );
    expect(s.last.kind).toBe('done');
    const answers = s.log.all().filter(e => e.t === 'answer');
    expect(
      answers.map(
        e => e.t === 'answer' && [e.stepId, e.value, e.correct, e.attempt],
      ),
    ).toEqual([
      ['s3', 'none', true, 1],
      ['s5', '3', true, 1],
      ['s7', 'p3_10', true, 1],
      ['s8', '0,7', true, 1],
    ]);
  });

  it('accepts equivalent forms of a fraction (7/10, 0,7, 1 - 3/10)', () => {
    for (const raw of ['7/10', '0,7', '0.7', '14/20', '1 - 3/10']) {
      const s = new Session();
      s.choose('none');
      s.type('3');
      s.choose('p3_10');
      s.type(raw);
      expect(s.state.finished).toBe(true);
    }
  });

  it('logs the typed keystrokes and the duration with each typed answer', () => {
    const s = new Session();
    s.choose('none');
    const events = s.type('3');
    // A correct answer is a decision point: the planner's choice is logged after it.
    expect(events.map(e => e.t)).toEqual(['component_event', 'answer', 'plan']);
    expect(events[2]).toMatchObject({
      trigger: 'correct',
      decision: { ruleId: 'rule.next_step', next: { kind: 'continue' } },
    });
    expect(events[0]).toMatchObject({
      component: 'NumericKeypad',
      name: 'input_trace',
      payload: { keys: ['3'] },
    });
    expect(events[1]).toMatchObject({ durationMs: 1500, kind: 'typed' });
  });
});

describe('wrong answers', () => {
  it('logs the misconception, shows its feedback and keeps the question active and last', () => {
    const s = new Session();
    const [e] = s.choose('one');
    expect(e).toMatchObject({
      t: 'answer',
      correct: false,
      misconceptionId: 'au_moins_direct_miscount',
      attempt: 1,
    });
    // The misconception has a repair component (EventPicker) with an authored
    // alternative: it is offered (optional) between the feedback and the card.
    const kinds = s.items.slice(-4).map(i => i.kind);
    expect(kinds).toEqual(['student', 'feedback', 'choice_card', 'question']);
    const fb = s.items.at(-3) as FeedItemOf<'feedback'>;
    expect(fb.tone).toBe('warning');
    expect(fb.rich?.ar).toBeDefined();
    expect(s.items.at(-2)).toMatchObject({
      purpose: 'repair',
      variantId: 'alt-1b-s3-pick',
      ruleId: 'rule.first_wrong.repair',
      status: 'open',
      blocking: false,
    });
    expect(s.cardFor('s3').attempts).toBe(1);
  });

  it('recognizes a known wrong typed value in any equivalent form', () => {
    const s = new Session();
    s.choose('none');
    s.type('3');
    s.choose('p3_10');
    const [, e] = s.type('0,3');
    expect(e).toMatchObject({
      correct: false,
      misconceptionId: 'confuses_event_and_complement',
    });
  });

  it('changes representation after the second wrong answer (opens the deep dive)', () => {
    const s = new Session();
    s.choose('one');
    s.choose('two');
    expect(s.state.shownDeepDives).toEqual(['au_moins_contraire']);
    const paused = s.items.find(
      i => i.kind === 'question' && i.status === 'paused',
    );
    expect(paused).toBeDefined();
    s.cardFor('dd:au_moins_contraire');
    s.choose('aucun');
    const [deepdive] = s.log.all().filter(e => e.t === 'deepdive');
    expect(deepdive).toMatchObject({
      deepDiveId: 'au_moins_contraire',
      outcome: 'completed',
      miniCorrect: true,
      stepId: 's3',
      reaction: {
        reactionId: 'rule.second_wrong',
        // A deep dive with its interactive component is "text+<Component>".
        representation: 'text+ComplementView',
      },
    });
    expect(s.cardFor('s3').attempts).toBe(2);
  });

  it('asks what is unclear at the third struggle signal, then follows the answer', () => {
    const s = new Session();
    s.choose('none');
    s.type('6');
    s.type('10');
    // Second wrong: s5's deep dive (pairs_listing) opens; come back and answer.
    s.cardFor('dd:pairs_listing');
    s.type('3');
    s.cardFor('s5');
    const third = s.type('5');
    expect(third.find(e => e.t === 'plan')).toMatchObject({
      trigger: 'wrong',
      decision: {
        ruleId: 'rule.struggle_clarify',
        next: { kind: 'ask_clarify', choices: ['counting', 'why', 'link'] },
      },
    });
    expect(s.items.at(-2)).toMatchObject({
      kind: 'choice_card',
      purpose: 'clarify',
    });
    s.cardFor('s5');
    const events = s.card_('clarify', 'counting');
    expect(events[0]).toMatchObject({ t: 'clarify', choice: 'counting' });
    expect(events.find(e => e.t === 'plan')).toMatchObject({
      decision: { ruleId: 'rule.clarify.counting' },
    });
    // An authored alternative that addresses counting, with a task to do.
    s.cardFor('var:alt-1b-s5-pick');
  });

  it('gives a hint on the second wrong answer when no other representation is left', () => {
    const s = new Session();
    s.choose('none');
    s.act({ type: 'not_sure' });
    s.cardFor('dd:pairs_listing');
    s.type('20');
    s.type('9');
    const hint = s.log
      .all()
      .filter(e => e.t === 'hint')
      .at(-1);
    expect(hint).toMatchObject({
      t: 'hint',
      level: 1,
      stepId: 'dd:pairs_listing',
      reaction: { reactionId: 'rule.second_wrong.hint' },
    });
  });

  it('treats unparsable input as a typing problem, not a wrong attempt', () => {
    const s = new Session();
    s.choose('none');
    const events = s.type('3/');
    expect(events.map(e => e.t)).toEqual([
      'component_event',
      'component_event',
    ]);
    expect(events[1]).toMatchObject({
      name: 'invalid_input',
      payload: { raw: '3/', reason: 'syntax' },
    });
    expect(s.cardFor('s5').attempts).toBe(0);
    expect((s.items.at(-2) as FeedItemOf<'feedback'>).message).toBe(
      'invalidInput',
    );
  });
});

describe('ما نعرفش and the deep-dive stack', () => {
  it('nests to depth 3, falls back to a hint at the cap, and re-asks every question on the way back', () => {
    const s = new Session();
    const firstCard = s.cardFor('s3').key;

    expect(s.act({ type: 'not_sure' })[0]).toMatchObject({
      t: 'not_sure',
      deepDiveId: 'au_moins_contraire',
      attempt: 1,
    });
    s.cardFor('dd:au_moins_contraire');
    s.act({ type: 'not_sure' });
    s.cardFor('dd:contraire_sens');
    s.act({ type: 'not_sure' });
    s.cardFor('dd:total_one');
    expect(s.depth()).toBe(3);
    expect(s.card.depth).toBe(3);

    // At the cap there is no deeper dive: the next hint instead.
    const capped = s.act({ type: 'not_sure' });
    expect(capped.map(e => e.t)).toEqual(['not_sure', 'plan', 'hint']);
    expect(capped[0]).not.toHaveProperty('deepDiveId');
    expect(capped[2]).toMatchObject({
      level: 1,
      reaction: { reactionId: 'rule.not_sure.hint' },
    });
    expect(s.depth()).toBe(3);

    s.choose('one');
    expect(s.items.at(-2)?.kind).toBe('return');
    s.cardFor('dd:contraire_sens');
    expect(s.depth()).toBe(2);
    s.type('3/5');
    s.cardFor('dd:au_moins_contraire');
    s.choose('aucun');

    const reasked = s.cardFor('s3');
    expect(reasked.key).not.toBe(firstCard);
    expect(s.items.find(i => i.key === firstCard)).toMatchObject({
      status: 'paused',
    });
    expect(s.depth()).toBe(0);

    s.choose('none');
    // Correct after help: one self-report card, then the next step.
    s.card_('self_report', 'understood');
    s.cardFor('s5');
    const dives = s.log.all().filter(e => e.t === 'deepdive');
    expect(
      dives.map(
        e =>
          e.t === 'deepdive' && [
            e.deepDiveId,
            e.outcome,
            e.miniCorrect,
            e.stepId,
          ],
      ),
    ).toEqual([
      ['total_one', 'completed', true, 'dd:contraire_sens'],
      ['contraire_sens', 'completed', true, 'dd:au_moins_contraire'],
      ['au_moins_contraire', 'completed', true, 's3'],
    ]);
  });

  it('logs an abandoned deep dive and re-asks the question', () => {
    const s = new Session();
    s.act({ type: 'not_sure' });
    expect(s.card.canGoBack).toBe(true);
    const [e] = s.act({ type: 'leave_deep_dive' });
    expect(e).toMatchObject({
      t: 'deepdive',
      outcome: 'abandoned',
      deepDiveId: 'au_moins_contraire',
      stepId: 's3',
    });
    expect(e).not.toHaveProperty('miniCorrect');
    s.cardFor('s3');
    s.choose('none');
    s.card_('self_report', 'guessed');
    s.cardFor('s5');
  });

  it('does not show the same deep dive twice in a session: another representation instead', () => {
    const s = new Session();
    s.act({ type: 'not_sure' });
    s.choose('aucun');
    s.choose('none');
    s.card_('self_report', 'understood');
    s.type('3');
    s.choose('p3_10');
    // s8 also points to au_moins_contraire, already shown: not again in that form.
    const events = s.act({ type: 'not_sure' });
    expect(events.map(e => e.t).slice(0, 2)).toEqual(['not_sure', 'plan']);
    expect(events[1]).toMatchObject({
      decision: {
        ruleId: 'rule.deep_dive_repeat',
        // ComplementView was already seen inside the deep dive: the untried bar.
        next: { kind: 'variant', variantId: 'alt-1b-s8-bar' },
      },
    });
    expect(s.state.shownDeepDives).toEqual(['au_moins_contraire']);
    s.cardFor('var:alt-1b-s8-bar');
  });
});

describe('self-report and "not sure" evidence (Phase 3 follow-up)', () => {
  it('"not now" on the self-report: logged as dismissed, no transfer this time, no evidence', () => {
    const s = new Session();
    s.choose('none');
    s.type('6');
    s.type('3');
    const card = s.items.at(-1);
    expect(card).toMatchObject({
      kind: 'choice_card',
      purpose: 'self_report',
      choices: ['understood', 'guessed', 'dismissed'],
      blocking: true,
    });
    const events = s.card_('self_report', 'dismissed');
    expect(events[0]).toMatchObject({ t: 'self_report', value: 'dismissed' });
    expect(events.find(e => e.t === 'plan')).toMatchObject({
      decision: { ruleId: 'rule.self_report_dismissed' },
    });
    // 1b/s5 has a transfer variant, but not after a dismissal: the next step.
    s.cardFor('s7');
    const counting = deriveState(s.log.all(), s.content.catalog).skills[
      'counting-pairs'
    ]!;
    expect(counting.evidence).toMatchObject({ correct: 1, guessed: 0 });
  });

  it('"not sure" counts toward the clarify threshold but never as a wrong answer', () => {
    const s = new Session();
    s.choose('none');
    s.type('6');
    s.act({ type: 'not_sure' });
    s.act({ type: 'leave_deep_dive' });
    s.cardFor('s5');
    const third = s.type('10');
    // wrong, not sure, wrong: the 3rd struggle signal.
    expect(third.find(e => e.t === 'plan')).toMatchObject({
      decision: { ruleId: 'rule.struggle_clarify' },
    });
    const ev = deriveState(s.log.all(), s.content.catalog).skills[
      'counting-pairs'
    ]!.evidence;
    expect(ev).toMatchObject({ wrong: 2, notSure: 1 });
  });
});

describe('hint ladder and reveal', () => {
  it('gives up to 3 levels, then allows the answer', () => {
    const s = new Session();
    expect(s.act({ type: 'reveal' })).toEqual([]);
    for (const level of [1, 2, 3]) {
      expect(s.act({ type: 'hint' })).toMatchObject([{ t: 'hint', level }]);
      expect(s.cardFor('s3').hintLevel).toBe(level);
      expect(s.items.at(-2)).toMatchObject({ kind: 'hint', level, total: 3 });
    }
    expect(s.act({ type: 'hint' })).toEqual([]);
    expect(s.act({ type: 'reveal' })).toMatchObject([
      { t: 'reveal', hintsUsed: 3, attempt: 1 },
    ]);
    expect(s.items.find(i => i.kind === 'answer')).toMatchObject({
      rich: { fr: 'aucune des deux boules ne porte le numéro 0' },
    });
    s.cardFor('s5');
  });

  it('reveals the engine value for typed steps', () => {
    const s = new Session();
    s.choose('none');
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'reveal' });
    expect(s.items.filter(i => i.kind === 'answer')).toMatchObject([
      { rich: { math: '3' } },
    ]);
  });
});

describe('asking', () => {
  it('answers a long-press from verified content and logs the quote and snapshot', () => {
    const s = new Session();
    const [e] = s.act({
      type: 'ask_longpress',
      blockId: 'q1b-s1',
      mode: 'explain',
      quoted: 'الحدث B',
    });
    expect(e).toMatchObject({
      t: 'ask',
      via: 'longpress',
      mode: 'explain',
      quoted: 'الحدث B',
      source: 'local',
      snapshot: { blockId: 'q1b-s1', stepKey: '1b/s3', depth: 0 },
    });
    expect(s.items.slice(-3).map(i => i.kind)).toEqual([
      'student',
      'ask_answer',
      'question',
    ]);
  });

  it('falls back to a canned message when there is no verified answer', () => {
    const s = new Session();
    s.act({
      type: 'ask_longpress',
      blockId: 'q1b-s2',
      mode: 'example',
      quoted: 'x',
    });
    expect(s.items.at(-2)).toMatchObject({
      kind: 'feedback',
      message: 'noCannedAnswer',
    });
  });

  it('answers starter chips and logs free text (truncated)', () => {
    const s = new Session();
    const [chip] = s.act({ type: 'ask_field', chipId: 'why_complement' });
    expect(chip).toMatchObject({
      via: 'field',
      snapshot: { chipId: 'why_complement' },
    });
    expect(s.items.at(-2)?.kind).toBe('ask_answer');
    const [free] = s.act({ type: 'ask_field', text: `  ${'a'.repeat(600)} ` });
    expect(free).toMatchObject({ via: 'field', source: 'local' });
    expect(free?.t === 'ask' && free.text?.length).toBe(500);
    expect(s.act({ type: 'ask_field', text: '   ' })).toEqual([]);
  });
});

describe('event log', () => {
  const NO_ZERO = ['a-d', 'a-e', 'd-e'];
  const picked = (selected: string[]) => ({
    type: 'component_result' as const,
    correct: true,
    details: { selected, correct: selected, missed: [], extra: [] },
    misconceptionHints: [],
  });

  /** Touches every student action and every planner reaction kind used in 1.b. */
  function busySession() {
    const s = new Session();
    s.act({
      type: 'ask_longpress',
      blockId: 'q1b-s1',
      mode: 'why',
      quoted: 'B',
    });
    s.choose('one');
    s.card_('repair', 'yes');
    s.cardFor('var:alt-1b-s3-pick');
    s.act(picked(NO_ZERO));
    s.cardFor('s3');
    s.act({ type: 'hint' });
    s.act({ type: 'not_sure' });
    s.act({ type: 'not_sure' });
    s.type('2/5');
    s.act({ type: 'leave_deep_dive' });
    s.choose('aucun');
    s.choose('none');
    s.card_('self_report', 'guessed');
    s.cardFor('s5');
    s.type('6');
    s.type('3/');
    s.act({ type: 'ask_field', chipId: 'what_simultane' });
    s.act({ type: 'ask_field', text: 'pourquoi ?' });
    s.act({ type: 'request', kind: 'change_method' });
    s.cardFor('dd:pairs_listing');
    s.type('3');
    s.type('3');
    s.cardFor('var:tr-1b-s5-noneg');
    s.type('6');
    s.cardFor('s7');
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'reveal' });
    s.cardFor('s8');
    s.act({ type: 'request', kind: 'simpler' });
    s.cardFor('var:pre-event-as-set');
    s.act(picked(['a-e', 'b-e', 'c-e', 'd-e']));
    s.cardFor('s8');
    s.type('3/10');
    s.card_('repair', 'no');
    s.act({ type: 'not_sure' });
    // ComplementView was seen inside the deep dive: the untried bar instead.
    s.cardFor('var:alt-1b-s8-bar');
    s.type('3');
    s.cardFor('s8');
    s.type('6/10');
    s.card_('clarify', 'why');
    // "why": the not-yet-shown alternative that addresses it.
    s.cardFor('var:alt-1b-s8-complement');
    s.choose('bbar');
    s.cardFor('s8');
    s.type('7/10');
    s.cardFor('var:tr-1b-aumoins2');
    s.type('2/5');
    return s;
  }

  it('stores only schema-valid events with every DATA.md base field', () => {
    const s = busySession();
    expect(s.state.finished).toBe(true);
    const events = s.log.all();
    expect(events.length).toBeGreaterThan(25);
    for (const e of events) {
      expect(EventSchema.safeParse(e).success).toBe(true);
      expect(e).toMatchObject({
        sessionId: 'sess-1',
        studentId: 'anon-1',
        exerciseId: 'bac2022c-ex2',
        contentVersion: 'ex2-test',
        questionId: '1b',
      });
      expect(e.id).toMatch(/^ev-\d+$/);
      expect(typeof e.ts).toBe('number');
      expect(e.stepId).not.toBe('none');
      expect(Object.isFrozen(e)).toBe(true);
    }
    expect(new Set(events.map(e => e.id)).size).toBe(events.length);
    expect(s.log.toJsonl().split('\n')).toHaveLength(events.length);
    // The session exercises every Phase 3 event the lesson emits.
    const types = new Set(events.map(e => e.t));
    for (const t of [
      'plan',
      'request',
      'clarify',
      'self_report',
      'offer_response',
      'transfer',
      'deepdive',
      'reveal',
    ] as const) {
      expect(types).toContain(t);
    }
    const plans = events.filter(e => e.t === 'plan');
    expect(
      plans.every(e => e.t === 'plan' && e.decision.source === 'rules'),
    ).toBe(true);
  });

  it('can rebuild the same feed from the log alone (nothing state-changing is unlogged)', () => {
    const s = busySession();
    const replay = new Session();
    for (const action of actionsFromEvents(s.log.all())) {
      replay.replay(action);
    }
    expect(replay.items).toEqual(s.items);
    expect(replay.log.all().map(e => e.t)).toEqual(s.log.all().map(e => e.t));
  });

  it('rejects an event that does not match the schema', () => {
    const s = new Session();
    expect(() =>
      s.log.append([
        { t: 'hint', level: 4, questionId: '1b', stepId: 's3' } as never,
      ]),
    ).toThrow();
    expect(s.log.all()).toEqual([]);
  });
});

describe('fallbacks', () => {
  it('renders a neutral fallback and logs component_error for a component without a registry entry', () => {
    // The loader rejects unregistered components; planner output can still contain one.
    const loaded = load();
    const steps = loaded.exercise.parts[0]!.groups[0]!.steps;
    steps.splice(1, 0, {
      id: 'sx',
      blockId: 'q1b-sx',
      trust: steps[0]!.trust,
      skills: [],
      kind: 'component',
      // A contract name with no registered view yet.
      component: { component: 'BinomialExplorer', props: {} },
    });
    const s = new Session(loaded);
    expect(s.items.some(i => i.kind === 'component_fallback')).toBe(true);
    expect(s.log.all()).toMatchObject([
      {
        t: 'component_error',
        component: 'BinomialExplorer',
        reason: 'unknown_component',
      },
    ]);
    s.cardFor('s3');
  });
});

describe('Exercise 2, question 2.a (components)', () => {
  const ZERO_PAIRS = ['a-b', 'a-c', 'b-c', 'b-d', 'b-e', 'c-d', 'c-e'];
  const ok = (selected: string[]) => ({
    type: 'component_result' as const,
    correct: true,
    details: { selected, correct: selected, missed: [], extra: [] },
    misconceptionHints: [],
  });
  const lawOk = {
    type: 'component_result' as const,
    correct: true,
    details: { sum: [1, 1], correctCells: [-2, -1, 0, 2], wrongCells: [] },
    misconceptionHints: [],
  };
  const taskCard = (s: Session, stepId: string) => {
    const c = s.cardFor(stepId);
    expect(s.content.steps.get(`2a/${stepId}`)?.kind).toBe('component');
    return c;
  };
  const components = (s: Session) =>
    s.items.flatMap(i =>
      i.kind === 'component' && !i.superseded ? [i.spec.component] : [],
    );
  /** The newest (not superseded) law table's filled cells. */
  const table = (s: Session) => {
    const t = s.items.filter(
      i => i.kind === 'component' && i.blockId === 'q2a-law' && !i.superseded,
    );
    expect(t).toHaveLength(1);
    const item = t[0]!;
    const filled =
      item.kind === 'component' ? item.lessonState?.filled ?? [] : [];
    return filled as { value: number; source: string }[];
  };

  function playTo(s: Session, stepId: 's10' | 's15' | 'sum' | 's18') {
    s.type('10');
    s.choose('ok');
    if (stepId === 's10') return;
    s.act(ok(ZERO_PAIRS));
    if (stepId === 's15') return;
    s.act(ok(['a-e']));
    s.act(ok(['a-d']));
    s.act(ok(['d-e']));
    if (stepId === 'sum') return;
    s.type('1');
  }

  it('plays end to end: the law table fills as each EventPicker is solved', () => {
    const s = new Session(load(), '2a');
    expect(components(s)).toEqual(['Urn', 'OutcomeSpace']);
    playTo(s, 's10');
    expect(components(s)).toEqual([
      'Urn',
      'OutcomeSpace',
      'OutcomeSpace',
      'LawBuilder',
    ]);
    expect(table(s)).toEqual([]);
    taskCard(s, 's10');
    s.act(ok(ZERO_PAIRS));
    expect(table(s)).toEqual([{ value: 0, source: 'solved' }]);
    expect(components(s)).toContain('ComplementView');
    s.act(ok(['a-e']));
    s.act(ok(['a-d']));
    s.act(ok(['d-e']));
    expect(table(s).map(c => c.value)).toEqual([0, -2, -1, 2]);
    // Older copies shrink to one line; only the newest table is shown in full.
    expect(
      s.items.filter(i => i.kind === 'component' && i.superseded),
    ).toHaveLength(4);
    s.cardFor('sum');
    s.type('1');
    taskCard(s, 's18');
    s.act(lawOk);
    expect(components(s).at(-1)).toBe('LawChart');
    expect(s.state.finished).toBe(true);
    const writeup = s.items.find(i => i.kind === 'writeup');
    expect(writeup?.kind === 'writeup' && writeup.lines).toContain(
      'Vérification : 1/10 + 1/10 + 7/10 + 1/10 = 1.',
    );

    const all = s.log.all();
    const answers = all.filter(e => e.t === 'answer');
    expect(answers.map(e => e.t === 'answer' && [e.kind, e.correct])).toEqual([
      ['typed', true],
      ['choice', true],
      ['task', true],
      ['task', true],
      ['task', true],
      ['task', true],
      ['typed', true],
      ['task', true],
    ]);
    expect(answers[2]).toMatchObject({
      stepId: 's10',
      value: { component: 'EventPicker', selected: ZERO_PAIRS, missed: [] },
    });
    const fills = all.filter(
      e => e.t === 'component_event' && e.name === 'cell_filled_by_lesson',
    );
    expect(fills.map(e => e.t === 'component_event' && e.payload)).toEqual([
      { blockId: 'q2a-law', value: 0, source: 'solved' },
      { blockId: 'q2a-law', value: -2, source: 'solved' },
      { blockId: 'q2a-law', value: -1, source: 'solved' },
      { blockId: 'q2a-law', value: 2, source: 'solved' },
    ]);
  });

  it('logs a shown event per representation, and contentVersion on every event', () => {
    const s = new Session(load(), '2a');
    playTo(s, 's10');
    const shown = s.log
      .all()
      .filter(e => e.t === 'component_event' && e.name === 'shown')
      .map(e => e.t === 'component_event' && [e.component, e.stepId]);
    expect(shown).toEqual([
      ['Urn', 's3'],
      ['OutcomeSpace', 's5'],
      ['OutcomeSpace', 's8'],
      ['LawBuilder', 'law'],
      ['EventPicker', 's10'],
    ]);
    expect(s.log.all().every(e => e.contentVersion === 'ex2-test')).toBe(true);
  });

  it('fills a revealed cell as revealed, never as a correct answer', () => {
    const s = new Session(load(), '2a');
    playTo(s, 's15');
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'reveal' });
    expect(table(s)).toEqual([
      { value: 0, source: 'solved' },
      { value: -2, source: 'revealed' },
    ]);
    const s15 = s.log.all().filter(e => e.stepId === 's15');
    expect(s15.some(e => e.t === 'answer')).toBe(false);
    expect(s15.map(e => e.t)).toContain('reveal');
    expect(
      s15.find(
        e => e.t === 'component_event' && e.name === 'cell_filled_by_lesson',
      ),
    ).toMatchObject({ payload: { value: -2, source: 'revealed' } });
  });

  it('skips the optional practice with a reason, logged as neither pass nor fail', () => {
    const s = new Session(load(), '2a');
    playTo(s, 's18');
    expect(taskCard(s, 's18').optional).toBe(true);
    const events = s.act({ type: 'skip', reason: 'knows_it' });
    expect(events.map(e => e.t)).toContain('skip');
    expect(events.find(e => e.t === 'skip')).toMatchObject({
      stepId: 's18',
      reason: 'knows_it',
    });
    expect(events.some(e => e.t === 'answer' || e.t === 'reveal')).toBe(false);
    expect(
      s.items.find(
        i =>
          i.kind === 'question' &&
          i.ref.scope === 'main' &&
          i.ref.stepId === 's18',
      ),
    ).toMatchObject({ status: 'done', skipped: true });
    expect(s.state.finished).toBe(true);
  });

  it('refuses to skip a task that is not optional', () => {
    const s = new Session(load(), '2a');
    playTo(s, 's10');
    expect(s.act({ type: 'skip', reason: 'not_now' })).toEqual([]);
    taskCard(s, 's10');
  });

  it('shows content feedback for a known pattern, then changes representation on the 2nd wrong result', () => {
    const s = new Session(load(), '2a');
    playTo(s, 's10');
    const forgot = ZERO_PAIRS.filter(id => id !== 'b-c');
    const events = s.act({
      type: 'component_result',
      correct: false,
      details: {
        selected: forgot,
        correct: ZERO_PAIRS,
        missed: ['b-c'],
        extra: [],
      },
      misconceptionHints: ['misses_duplicate_value_pair'],
    });
    expect(events[0]).toMatchObject({
      t: 'answer',
      kind: 'task',
      correct: false,
      misconceptionId: 'misses_duplicate_value_pair',
      attempt: 1,
    });
    const feedback = s.items.filter(i => i.kind === 'feedback').at(-1);
    expect(feedback?.kind === 'feedback' && feedback.rich?.math).toBe(
      "0 \\times 0' = 0",
    );
    expect(taskCard(s, 's10').attempts).toBe(1);

    s.act({
      type: 'component_result',
      correct: false,
      details: {
        selected: ['a-d'],
        correct: ZERO_PAIRS,
        missed: ZERO_PAIRS,
        extra: ['a-d'],
      },
      misconceptionHints: [],
    });
    // The step's deep dive (product_zero) teaches x·0 = 0, but the misconception is
    // about the event as a set: an alternative for that skill instead (expected table row 7).
    expect(s.items.some(i => i.kind === 'deep_dive_start')).toBe(false);
    expect(
      s.log
        .all()
        .filter(e => e.t === 'plan')
        .at(-1),
    ).toMatchObject({
      decision: {
        ruleId: 'rule.second_wrong',
        next: { kind: 'variant', variantId: 'alt-2a-s10-complement' },
        representation: 'ComplementView',
      },
    });
    s.cardFor('var:alt-2a-s10-complement');
    s.act(ok(['a-d', 'a-e', 'd-e']));
    expect(taskCard(s, 's10').attempts).toBe(2);
  });

  it('rebuilds the same feed from the event log alone', () => {
    const s = new Session(load(), '2a');
    playTo(s, 's15');
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'reveal' });
    s.act(ok(['a-d']));
    s.act(ok(['d-e']));
    s.type('9/10');
    s.type('1');
    s.card_('self_report', 'understood');
    s.act({
      type: 'component_result',
      correct: false,
      details: { sum: [9, 10], correctCells: [-2, -1, 2], wrongCells: [0] },
      misconceptionHints: ['law_sum_not_one'],
    });
    s.act({ type: 'skip', reason: 'not_now' });
    expect(s.state.finished).toBe(true);

    const replay = new Session(load(), '2a');
    for (const action of actionsFromEvents(s.log.all())) {
      replay.replay(action);
    }
    expect(replay.items).toEqual(s.items);
    expect(replay.log.all().map(e => e.t)).toEqual(s.log.all().map(e => e.t));
  });
});
