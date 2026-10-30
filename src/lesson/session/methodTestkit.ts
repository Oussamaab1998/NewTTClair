/**
 * Test helper: a method lesson played through the reducer and the rules
 * planner on the real content, with the dev "next right action" driver.
 * Not shipped: only test files import it.
 */
import { nextRightAction } from '../../app/dev/answerAll';
import exSc2 from '../../content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { createRulesPlanner } from '../../planner/rules';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { FeedItem, LessonAction, LessonState } from './types';

export type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

export function loadSc2(): LoadedExercise {
  const r = loadExercise(exSc2, exSc2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}

export class MethodSession {
  readonly content;
  readonly log;
  state: LessonState;
  private t = 0;
  private readonly planner;
  constructor(readonly loaded: LoadedExercise, readonly part: string) {
    this.content = buildContent(loaded, part);
    this.log = new EventLog(
      {
        sessionId: 's',
        studentId: 'a',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    this.planner = createRulesPlanner(this.content.menu);
    const r = startLesson(this.content);
    this.state = r.state;
    this.log.append(r.events);
  }
  act(a: ActionInput) {
    this.t += 1500;
    this.state = stepSync(
      this.content,
      this.state,
      { ...a, at: this.t } as LessonAction,
      this.log,
      this.planner,
    );
  }
  line(mline: string) {
    this.act({ type: 'answer', value: { mline } });
  }
  card(id: string) {
    this.act({ type: 'answer', value: { card: id } });
  }
  right(): boolean {
    const a = nextRightAction(this.state, this.loaded);
    if (!a) {
      return false;
    }
    this.act(a as ActionInput);
    return true;
  }
  /** Play right acts until the open card is `stepId` (a main step or a variant id). */
  until(stepId: string, max = 120) {
    for (let i = 0; i < max && this.openId !== stepId; i++) {
      if (!this.right()) {
        break;
      }
    }
    return this;
  }
  get openId(): string | undefined {
    const c = [...this.state.items].reverse().find(i => i.kind === 'question');
    if (c?.kind !== 'question' || c.status !== 'active') {
      return undefined;
    }
    return c.ref.scope === 'main'
      ? c.ref.stepId
      : c.ref.scope === 'variant'
      ? c.ref.variantId
      : c.ref.deepDiveId;
  }
  get items(): FeedItem[] {
    return this.state.items;
  }
  get events(): readonly Event[] {
    return this.log.all();
  }
  get offer() {
    return this.items.find(
      i =>
        i.kind === 'choice_card' &&
        i.purpose === 'repair' &&
        i.status === 'open',
    );
  }
  acceptOffer() {
    this.act({ type: 'card_choice', purpose: 'repair', choice: 'yes' });
  }
  /** Graded method answers plus ungraded acts (a picture seen, a repair stage). */
  get acts(): number {
    return this.events.filter(
      e =>
        (e.t === 'answer' && e.kind === 'method') ||
        (e.t === 'component_event' &&
          e.component === 'Method' &&
          e.name === 'act'),
    ).length;
  }
  get answers() {
    return this.events.filter(e => e.t === 'answer' && e.kind === 'method');
  }
  get notes() {
    return this.items.flatMap(i =>
      i.kind === 'feedback' && i.note ? [i.note] : [],
    );
  }
}
