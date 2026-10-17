import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise, type LoadedExercise } from '../../content/loader';
import { createRulesPlanner } from '../../planner/rules';
import type { Event } from '../../telemetry/events';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, experimentForRef, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { LessonAction, LessonState } from './types';

type Raw = typeof ex2;
const clone = (): Raw => JSON.parse(JSON.stringify(ex2));
const trust = ex2.deepDives[0]!.trust;

function load(raw: unknown = ex2): LoadedExercise {
  const r = loadExercise(raw, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}
const errors = (raw: unknown) => {
  const r = loadExercise(raw, ex2Misconceptions);
  return r.ok ? '' : r.errors.join('\n');
};

/** 2.a with product_zero turned into a deep dive whose mini question is a task. */
function withTaskMini(): Raw {
  const raw = clone();
  const dive = raw.deepDives.find(d => d.id === 'product_zero')! as Record<
    string,
    unknown
  >;
  dive.blocks = [
    {
      type: 'tutor_text',
      blockId: 'dd-pz-t',
      trust,
      text: { ar: [{ ar: 'كي تكون كورة عليها صفر، الجداء صفر.' }] },
    },
  ];
  dive.mini = {
    id: 'mini',
    blockId: 'dd-pz-mini-task',
    trust,
    skills: ['product-zero'],
    kind: 'component',
    component: {
      component: 'EventPicker',
      props: {
        valueFn: 'product',
        event: { id: 'value_eq', args: { value: 0 } },
        reveal: 'live',
      },
    },
    prompt: { ar: [{ ar: 'اختار التيراجات اللي الجداء متاعهم صفر.' }] },
    hints: [
      { ar: [{ ar: 'ثبّت في الكور اللي عليهم صفر.' }] },
      { ar: [{ ar: 'ما تنساش التيراج اللي فيه الزوز صفر.' }] },
    ],
  };
  return raw;
}

function session(loaded: LoadedExercise, questionId: string) {
  const content = buildContent(loaded, questionId);
  const log = new EventLog(
    {
      sessionId: 's',
      studentId: 'a',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const planner = createRulesPlanner(content.menu);
  const start = startLesson(content);
  log.append(start.events);
  let state: LessonState = start.state;
  let t = 0;
  const act = (a: Omit<LessonAction, 'at'>): Event[] => {
    t += 3000;
    const before = log.all().length;
    state = stepSync(
      content,
      state,
      { ...a, at: t } as LessonAction,
      log,
      planner,
    );
    return log.all().slice(before);
  };
  const card = () => {
    const last = state.items[state.items.length - 1];
    if (last?.kind !== 'question') {
      throw new Error(`last item is ${last?.kind}`);
    }
    return last;
  };
  return {
    content,
    log,
    act,
    card,
    get state() {
      return state;
    },
  };
}

const ZERO_PAIRS = ['a-b', 'a-c', 'b-c', 'b-d', 'b-e', 'c-d', 'c-e'];
const result = (correct: boolean): Omit<LessonAction, 'at'> =>
  ({
    type: 'component_result',
    correct,
    details: { selected: correct ? ZERO_PAIRS : ['a-d'] },
    misconceptionHints: [],
  } as Omit<LessonAction, 'at'>);

/** Plays 2.a to the s10 EventPicker and opens its deep dive with "ما نعرفش". */
function toTaskMini() {
  const s = session(load(withTaskMini()), '2a');
  s.act({ type: 'answer', value: { raw: '10' } } as Omit<LessonAction, 'at'>);
  s.act({ type: 'answer', value: { optionId: 'ok' } } as Omit<
    LessonAction,
    'at'
  >);
  s.act({ type: 'not_sure' });
  expect(s.card().ref).toEqual({ scope: 'mini', deepDiveId: 'product_zero' });
  return s;
}
const lastDive = (s: { log: EventLog }) =>
  s.log
    .all()
    .filter(e => e.t === 'deepdive')
    .at(-1);

describe('interactive deep dives: loader limits', () => {
  it('accepts a task as the mini question (with a hint ladder)', () => {
    expect(errors(withTaskMini())).toBe('');
  });

  it('a task mini needs at least one hint (reveal can end it)', () => {
    const raw = withTaskMini();
    delete (
      raw.deepDives.find(d => d.id === 'product_zero')!.mini as {
        hints?: unknown;
      }
    ).hints;
    expect(errors(raw)).toContain(
      'dd:product_zero: task components need at least one hint',
    );
  });

  it('at most one interactive component per deep dive', () => {
    const raw = withTaskMini();
    const dive = raw.deepDives.find(d => d.id === 'product_zero')! as {
      blocks: unknown[];
    };
    dive.blocks.push({
      type: 'component',
      blockId: 'dd-pz-os',
      trust,
      spec: { component: 'OutcomeSpace', props: {} },
    });
    expect(errors(raw)).toContain(
      'at most one interactive component per deep dive',
    );
  });

  it('the component comes after 1-2 short text blocks', () => {
    const none = clone();
    const amc = none.deepDives.find(d => d.id === 'au_moins_contraire')! as {
      blocks: unknown[];
    };
    amc.blocks = [amc.blocks[2]];
    expect(errors(none)).toContain('needs 1-2 short text blocks before it');

    const long = clone();
    const amc2 = long.deepDives.find(d => d.id === 'au_moins_contraire')! as {
      blocks: { text?: { ar: { ar: string }[] } }[];
    };
    amc2.blocks[0]!.text = { ar: [{ ar: 'كلام '.repeat(60) }] };
    expect(errors(long)).toContain('max 240 characters');
  });

  it('a task in the blocks (not as the mini) is rejected', () => {
    const raw = clone();
    const amc = raw.deepDives.find(d => d.id === 'au_moins_contraire')! as {
      blocks: { spec?: unknown }[];
    };
    amc.blocks[2]!.spec = {
      component: 'EventPicker',
      props: { event: { id: 'any_value', args: { value: 0 } } },
    };
    expect(errors(raw)).toContain(
      'a task in a deep dive must be its mini question',
    );
  });

  it('a deep dive with its own urn cannot use \\val', () => {
    const raw = clone();
    const pl = raw.deepDives.find(d => d.id === 'pairs_listing')!;
    (pl.mini!.prompt as { math?: string }).math = '\\val{nTotal}';
    expect(errors(raw)).toContain(
      'dd:pairs_listing: \\val is not allowed with its own experiment',
    );
  });
});

describe('interactive deep dives: in the lesson', () => {
  it('logs shown as text+<Component> and the component itself', () => {
    const s = session(load(), '1b');
    s.act({ type: 'not_sure' });
    const shown = s.log
      .all()
      .filter(e => e.t === 'component_event' && e.name === 'shown');
    expect(
      shown.map(
        e =>
          e.t === 'component_event' && [
            e.component,
            e.payload.representation ?? null,
          ],
      ),
    ).toEqual([
      ['DeepDive', 'text+ComplementView'],
      ['ComplementView', null],
    ]);
    // The rain example moved to the long-press of the second line (no text lost).
    expect(
      s.state.items.find(i => i.kind === 'tutor' && i.blockId === 'dd-amc-2'),
    ).toMatchObject({
      asks: { example: [expect.anything()] },
    });
  });

  it("uses the deep dive's own urn for its component and its mini answer", () => {
    const s = session(load(), '2a');
    s.act({ type: 'not_sure' });
    expect(s.card().ref).toEqual({
      scope: 'mini',
      deepDiveId: 'pairs_listing',
    });
    const list = s.state.items.find(
      i => i.kind === 'component' && i.blockId === 'dd-pl-os',
    );
    expect(
      list?.kind === 'component' && list.experiment?.urn.map(b => b.value),
    ).toEqual([1, 2, 3]);
    expect(experimentForRef(s.content, s.card().ref)?.urn).toHaveLength(3);
    const events = s.act({ type: 'answer', value: { raw: '3' } } as Omit<
      LessonAction,
      'at'
    >);
    expect(events.find(e => e.t === 'answer')).toMatchObject({ correct: true });
  });

  it('a task mini keeps "back to the question" and the hint ladder; reveal ends the deep dive', () => {
    const s = toTaskMini();
    expect(s.card()).toMatchObject({ canGoBack: true, hintCount: 2 });
    s.act({ type: 'hint' });
    s.act({ type: 'hint' });
    s.act({ type: 'reveal' });
    expect(lastDive(s)).toMatchObject({
      deepDiveId: 'product_zero',
      outcome: 'completed',
      miniCorrect: false,
      helped: false,
    });
    // It did not help: another representation, not the same deep dive again.
    expect(
      s.log
        .all()
        .filter(e => e.t === 'plan')
        .at(-1),
    ).toMatchObject({
      decision: { ruleId: 'rule.deep_dive_failed', next: { kind: 'variant' } },
    });
  });

  it('a task mini "did not help" after 2 wrong tries; one wrong try still helped', () => {
    const twice = toTaskMini();
    twice.act(result(false));
    twice.act(result(false));
    twice.act(result(true));
    expect(lastDive(twice)).toMatchObject({
      miniCorrect: false,
      helped: false,
    });
    expect(
      twice.log
        .all()
        .filter(e => e.t === 'plan')
        .at(-1),
    ).toMatchObject({
      decision: { ruleId: 'rule.deep_dive_failed' },
    });

    const once = toTaskMini();
    once.act(result(false));
    once.act(result(true));
    expect(lastDive(once)).toMatchObject({ miniCorrect: false, helped: true });
    expect(
      once.log
        .all()
        .filter(e => e.t === 'plan')
        .at(-1),
    ).toMatchObject({
      decision: { ruleId: 'rule.detour_done' },
    });
  });

  it('"back" from a task mini is logged as abandoned and re-asks the question', () => {
    const s = toTaskMini();
    s.act({ type: 'leave_deep_dive' });
    expect(lastDive(s)).toMatchObject({ outcome: 'abandoned' });
    expect(s.card().ref).toMatchObject({ scope: 'main', stepId: 's10' });
  });
});
