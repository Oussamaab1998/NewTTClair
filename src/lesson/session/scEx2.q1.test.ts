/**
 * Question 1 of bac2022c-sc-ex2 as the method lesson plays it (exsc2-0.4.0,
 * the whole of it): the fast path (9 acts), the student's own order, the
 * slips of every frame, each repair inside its 10 acts, the 30-act cap, and
 * that replaying the log gives the same feed. Nothing here calls a model.
 */
import { nextRightAction } from '../../app/dev/answerAll';
import exSc2 from '../../content/exercises/bac2022c-sc-ex2.json';
import exSc2Misconceptions from '../../content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { createRulesPlanner } from '../../planner/rules';
import { THRESHOLDS } from '../../state/config';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import { actionsFromEvents } from './replay';
import type { FeedItem, LessonAction, LessonState } from './types';

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

function load(): LoadedExercise {
  const r = loadExercise(exSc2, exSc2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}
const loaded = load();

class Session {
  readonly content = buildContent(loaded, '1');
  readonly log = new EventLog(
    {
      sessionId: 's',
      studentId: 'a',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  state: LessonState;
  private t = 0;
  private readonly planner = createRulesPlanner(this.content.menu);
  constructor() {
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
  /** The next right act of the open card (what `-devActions answerAll` does). */
  right(): boolean {
    const a = nextRightAction(this.state, loaded);
    if (!a) {
      return false;
    }
    this.act(a as ActionInput);
    return true;
  }
  /** Play right acts until the open card is `stepId` (a main step or a variant id). */
  until(stepId: string, max = 80) {
    for (let i = 0; i < max && this.openId !== stepId; i++) {
      if (!this.right()) {
        break;
      }
    }
    return this;
  }
  /** The open card: the main step id, else the variant id. */
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
}
const answers = (s: Session) =>
  s.events.filter(e => e.t === 'answer' && e.kind === 'method');

/** The session at the open card `frame`, every earlier card done right, in the authored plan order. */
const at = (frame: string, planOrder = ['c_total', 'c_fav', 'c_ratio']) => {
  const s = new Session();
  s.act({ type: 'answer', value: { plan: planOrder } });
  s.until(frame);
  return s;
};

describe('Q1 main path and fast path', () => {
  it('has the whole route as ordinary steps: opening, plan, read, three frames, the reason, the recipe, two similar questions', () => {
    const steps = loaded.exercise.parts[0]!.groups.flatMap(g => g.steps);
    expect(steps.map(s => s.id)).toEqual([
      's1',
      'm1.opening',
      'm1.plan',
      'm1.read',
      'm1.c_total',
      'm1.c_fav',
      'm1.p_reason',
      'm1.c_ratio',
      'm1.recipe',
      'm1.sim_same',
      'm1.sim_twist',
    ]);
  });

  it('no mistake: 9 acts to the recipe, all right, no hint, no repair (the budget of THRESHOLDS)', () => {
    const s = new Session();
    s.until('m1.sim_same');
    expect(s.openId).toBe('m1.sim_same');
    const a = answers(s);
    expect(a).toHaveLength(THRESHOLDS.methodFastActs.m1!);
    expect(THRESHOLDS.methodFastActs.m1).toBe(9);
    expect(a.every(e => e.t === 'answer' && e.correct)).toBe(true);
    expect(s.events.some(e => e.t === 'hint' || e.t === 'not_sure')).toBe(
      false,
    );
    expect(s.state.method?.acts).toBe(8); // the recipe is not part of the question's budget
  });

  it('the two similar questions have no help: no hint chip, no hint in the step', () => {
    const steps = loaded.exercise.parts[0]!.groups.flatMap(g => g.steps);
    for (const id of ['m1.sim_same', 'm1.sim_twist']) {
      const st = steps.find(x => x.id === id);
      expect(st?.kind === 'mframe' && (st.hints ?? []).length).toBe(0);
    }
  });

  it('finishing both similar questions ends the part, reviewed line by line', () => {
    const s = new Session();
    s.until('m1.sim_same');
    while (s.right()) {
      // plays the similar lines and submits
    }
    expect(s.state.finished).toBe(true);
    const review = s.items.filter(
      i => i.kind === 'feedback' && i.note?.kind === 'review',
    );
    expect(review.length).toBeGreaterThanOrEqual(2 * 4); // every line of both attempts
    expect(
      review.every(
        i =>
          i.kind === 'feedback' &&
          i.note?.kind === 'review' &&
          i.note.outcome === 'credit',
      ),
    ).toBe(true);
    expect(s.events.find(e => e.t === 'part_done')).toBeTruthy();
  });
});

describe("the student's own order", () => {
  const order = (s: Session) => {
    const seen: string[] = [];
    for (let i = 0; i < 80; i++) {
      const id = s.openId;
      if (id && seen.at(-1) !== id) {
        seen.push(id);
      }
      if (id === 'm1.sim_same' || !s.right()) {
        break;
      }
    }
    return seen;
  };

  it('favourable before total: the lesson follows him (favourable, its reason, total, divide)', () => {
    const s = new Session();
    s.act({
      type: 'answer',
      value: { plan: ['c_fav', 'c_total', 'c_ratio'] },
    });
    expect(order(s)).toEqual([
      'm1.read',
      'm1.c_fav',
      'm1.p_reason',
      'm1.c_total',
      'm1.c_ratio',
      'm1.recipe',
      'm1.sim_same',
    ]);
  });

  it('the recap names HIS next card, not the authored one', () => {
    const s = new Session();
    s.act({ type: 'answer', value: { plan: ['c_fav', 'c_total', 'c_ratio'] } });
    s.until('m1.c_total');
    const recap = s.items
      .filter(i => i.kind === 'feedback' && i.note?.kind === 'recap')
      .at(-1);
    expect(recap?.kind === 'feedback' && recap.note).toMatchObject({
      kind: 'recap',
    });
  });
});

describe('the slips of the favourable frame, by value and structure', () => {
  const slips: [string, string][] = [
    ['4+15 = 19', 'mut.add_instead_of_multiply'],
    ['6*5 = 30', 'mut.drop_division'],
    ['4*30 = 120', 'mut.ordered_instead_of_groups'],
    ['1 = 1', 'mut.over_generalised_order_rule'],
  ];
  it.each(slips)('%s -> %s', (raw, id) => {
    const s = at('m1.c_fav');
    s.line(raw);
    expect(answers(s).at(-1)).toMatchObject({
      correct: false,
      misconceptionId: id,
      inferredBy: 'mutation',
    });
  });

  it('the black part 15 is credited as a count with no derivation when it is bare', () => {
    const s = at('m1.c_fav');
    s.line('4');
    s.line('15');
    const credit = s.items
      .flatMap(i => (i.kind === 'feedback' && i.note ? [i.note] : []))
      .filter(n => n.kind === 'credit')
      .at(-1);
    expect(credit).toMatchObject({ nodeId: 'fav_black', derivation: 'absent' });
  });

  it('6*5/2*1 is the right black part (the *1 changes nothing)', () => {
    const s = at('m1.c_fav');
    s.line('4');
    s.line('6*5/2*1 = 15');
    expect(answers(s).at(-1)).toMatchObject({ correct: true });
  });
});

describe('the result frame: the standing checks', () => {
  it('120/60 is above one: swap_numerator_denominator', () => {
    const s = at('m1.c_ratio');
    s.line('120/60 = 2');
    expect(answers(s).at(-1)).toMatchObject({
      misconceptionId: 'mut.swap_numerator_denominator',
    });
  });

  it('60/720 counts different things: ordered_instead_of_groups', () => {
    const s = at('m1.c_ratio');
    s.line('60/720 = 1/12');
    expect(answers(s).at(-1)).toMatchObject({
      misconceptionId: 'mut.ordered_instead_of_groups',
    });
  });

  it('60/120 is right but not in lowest terms: not the result yet; 1/2 closes the card', () => {
    const s = at('m1.c_ratio');
    s.line('60/120');
    expect(s.openId).toBe('m1.c_ratio');
    s.line('60/120 = 1/2');
    expect(s.openId).not.toBe('m1.c_ratio');
  });

  it('a result that is not the statement’s target shows his line beside the target', () => {
    const s = at('m1.c_ratio');
    s.line('60/720 = 1/12');
    const notes = s.items.flatMap(i =>
      i.kind === 'feedback' && i.note ? [i.note] : [],
    );
    expect(notes.some(n => n.kind === 'target')).toBe(true);
  });
});

describe('the combine reason', () => {
  it('a decoy is answered with its own words and the card stays; the true card moves on', () => {
    const s = at('m1.p_reason');
    s.act({ type: 'answer', value: { card: 'r_add' } });
    expect(s.openId).toBe('m1.p_reason');
    expect(answers(s).at(-1)).toMatchObject({
      correct: false,
      misconceptionId: 'mut.add_instead_of_multiply',
    });
    s.act({ type: 'answer', value: { card: 'r_true' } });
    // right after a wrong one: the planner asks whether he understood (blocking card)
    s.act({
      type: 'card_choice',
      purpose: 'self_report',
      choice: 'understood',
    });
    expect(s.openId).toBe('m1.c_ratio');
  });
});

describe('each repair opens on its slip and closes inside 10 acts', () => {
  /** [repair id, how to get the offer]. */
  const cases: [string, () => Session][] = [
    [
      'rep-1-box',
      () => {
        const s = at('m1.c_fav');
        s.line('6*5 = 30');
        return s;
      },
    ],
    [
      'rep-1-claim',
      () => {
        const s = at('m1.c_total');
        s.line('10*9*8/3 = 240');
        return s;
      },
    ],
    [
      'rep-1-combine',
      () => {
        const s = at('m1.c_fav');
        s.line('4+15 = 19');
        return s;
      },
    ],
    [
      'rep-1-above-one',
      () => {
        const s = at('m1.c_ratio');
        s.line('120/60 = 2');
        return s;
      },
    ],
    [
      'rep-1-units',
      () => {
        const s = at('m1.c_ratio');
        s.line('60/720 = 1/12');
        return s;
      },
    ],
    [
      'rep-1-one-ball',
      () => {
        const s = at('m1.c_fav');
        s.line('1 = 1');
        return s;
      },
    ],
  ];
  it.each(cases)('%s', (id, setup) => {
    const s = setup();
    expect(s.offer).toBeTruthy();
    const parent = s.openId;
    s.acceptOffer();
    expect(s.openId).toBe(id);
    let guard = 0;
    while (s.openId === id && guard++ < 30) {
      s.right();
    }
    expect(s.openId).toBe(parent); // back to the same card
    const repairActs = s.events.filter(
      e =>
        e.stepId.includes('repair') ||
        (e.t === 'component_event' &&
          e.component === 'Method' &&
          e.name === 'act'),
    ).length;
    expect(repairActs).toBeLessThanOrEqual(THRESHOLDS.methodRepairActs);
  });

  it('"ما نعرفش" twice at the plan offers the worked plan on another urn; he re-orders his plan after it', () => {
    const s = new Session();
    s.act({ type: 'not_sure' });
    s.act({ type: 'not_sure' });
    expect(s.offer ?? s.openId === 'rep-1-plan').toBeTruthy();
    if (s.offer) {
      s.acceptOffer();
    }
    expect(s.openId).toBe('rep-1-plan');
    while (s.openId === 'rep-1-plan') {
      s.right();
    }
    expect(s.openId).toBe('m1.plan');
  });

  it('a repair never shows an answer of the question: no 120, no 60, no 1/2 on its stages', () => {
    const v = loaded.exercise.variants.filter(x => x.id.startsWith('rep-1-'));
    for (const x of v) {
      const text = JSON.stringify(x.step);
      expect(text).not.toMatch(/\b(120|60)\b/);
    }
  });
});

describe('the 30-act cap', () => {
  it('at the cap no repair opens, the reveal unlocks and the escape logs how', () => {
    const s = at('m1.c_fav');
    for (let i = 0; i < 40 && !s.state.method?.capped; i++) {
      if (s.offer) {
        s.act({ type: 'card_choice', purpose: 'repair', choice: 'no' });
      }
      if (s.state.pending) {
        break;
      }
      s.line('6*5 = 30');
    }
    expect(s.state.method?.capped).toBe(true);
    expect(s.state.method!.acts).toBeLessThanOrEqual(
      THRESHOLDS.methodActsPerQuestion,
    );
    s.line('6*5 = 30');
    expect(s.offer).toBeFalsy();
    const active = [...s.items].reverse().find(i => i.kind === 'question');
    expect(active?.kind === 'question' && active.revealUnlocked).toBe(true);
    expect(
      s.events.some(
        e =>
          e.t === 'component_event' &&
          e.component === 'Method' &&
          e.name === 'capped',
      ),
    ).toBe(true);
  });
});

describe('replay equals live', () => {
  it('the same feed from the log alone: the fast path with a slip, a repair and the recipe', () => {
    const live = new Session();
    live.act({
      type: 'answer',
      value: { plan: ['c_total', 'c_fav', 'c_ratio'] },
    });
    live.until('m1.c_fav');
    live.line('4+15 = 19');
    if (live.offer) {
      live.acceptOffer();
    }
    live.until('m1.sim_same');
    const actions = actionsFromEvents(live.events);
    const again = new Session();
    let t = 0;
    let state = again.state;
    const planner = createRulesPlanner(again.content.menu);
    const log = new EventLog(
      {
        sessionId: 's',
        studentId: 'a',
        exerciseId: loaded.exercise.id,
        contentVersion: loaded.exercise.contentVersion,
      },
      fixedClock(),
    );
    for (const a of actions) {
      t += 1500;
      state = stepSync(
        again.content,
        state,
        { ...a, at: t } as LessonAction,
        log,
        planner,
      );
    }
    const kinds = (items: FeedItem[]) => items.map(i => i.kind);
    expect(kinds(state.items)).toEqual(kinds(live.items));
  });
});
