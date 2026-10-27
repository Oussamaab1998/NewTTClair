/**
 * The product owner's real 1.b session (simulator, 2026-10-22, session
 * sess-mvj9lr9w), as a scripted student, for the "Tutor intelligence 1"
 * regression test. The student's own inputs on their cards are replayed in
 * order; planner cards get the choices made that day; any detour (variant,
 * deep dive, prerequisite) is answered correctly, as the student did. The
 * rules decide everything else, so the session follows the CURRENT rules.
 *
 * Real inputs: s3 "none"; s5 hint then 3; self-report "guessed"; the
 * transfer (draws with no negative number, answer 6): 4, not sure, 5, then
 * after the clarify card ("counting") not sure, 0, 4; the teacher-note offer
 * left unanswered; reveal; s7: 3/5, then the repair (accepted), then 3/10;
 * s8: 7/10.
 */
import ex2 from '../../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../../content/exercises/bac2022c-ex2.misconceptions.json';
import { nextRightAction } from '../../../app/dev/answerAll';
import { loadExercise, type LoadedExercise } from '../../../content/loader';
import { stepKey } from '../../../content/loader';
import { createRulesPlanner } from '../../../planner/rules';
import type { Event } from '../../../telemetry/events';
import { EventLog, fixedClock } from '../../../telemetry/log';
import { buildContent, startLesson, type LessonContent } from '../lesson';
import { stepSync } from '../orchestrate';
import type { CardPurpose, LessonAction, LessonState } from '../types';

type Act = Omit<LessonAction, 'at'>;

const answer = (raw: string): Act =>
  ({ type: 'answer', value: { raw } } as Act);
const option = (optionId: string): Act =>
  ({ type: 'answer', value: { optionId } } as Act);
const notSure: Act = { type: 'not_sure' } as Act;

/** The student's own inputs, per card (step key), in the order typed. */
export const REAL_INPUTS: Record<string, Act[]> = {
  '1b/s3': [option('none')],
  '1b/s5': [{ type: 'hint' } as Act, answer('3')],
  'var:tr-1b-s5-noneg': [
    answer('4'),
    notSure,
    answer('5'),
    notSure,
    answer('0'),
    answer('4'),
    { type: 'reveal' } as Act,
  ],
  '1b/s7': [option('p3_5'), option('p3_10')],
  '1b/s8': [answer('7/10')],
};

/** Choices on planner cards; null = left open (the student acted on the step). */
export const REAL_CARDS: Partial<Record<CardPurpose, string | null>> = {
  self_report: 'guessed',
  clarify: 'counting',
  teacher_note: null,
  repair: 'yes',
  // C3: the real student never saw a probe card; they acted on the step next.
  probe: null,
};

export interface SessionRow {
  /** What the student did. */
  action: string;
  /** Card the action was on (step key or card purpose). */
  on: string;
  /** Planner decisions it caused: "ruleId -> action". */
  decisions: string[];
  /** Feed items it added (kind, and what for). */
  feed: string[];
}

function frameKey(state: LessonState): string | null {
  const ref = state.stack[state.stack.length - 1]?.ref;
  if (!ref) {
    return null;
  }
  return ref.scope === 'main'
    ? stepKey.main(ref.questionId, ref.stepId)
    : ref.scope === 'mini'
    ? stepKey.mini(ref.deepDiveId)
    : stepKey.variant(ref.variantId);
}

const describe = (a: Act): string => {
  switch (a.type) {
    case 'answer': {
      const v = (a as unknown as { value: Record<string, string> }).value;
      return `answer ${v.raw ?? v.optionId ?? v.line ?? '?'}`;
    }
    case 'card_choice':
      return `card ${(a as unknown as { purpose: string }).purpose}: ${
        (a as unknown as { choice: string }).choice
      }`;
    case 'component_result':
      return 'component: right';
    default:
      return a.type;
  }
};

function feedLabel(i: LessonState['items'][number]): string {
  switch (i.kind) {
    case 'choice_card':
      return `choice_card ${i.purpose} [${i.choices.join(', ')}]`;
    case 'question':
      return `question ${(i as { stepId?: string }).stepId ?? ''}`.trim();
    case 'hint':
      return `hint ${i.level}/${i.total}`;
    case 'feedback':
      return `feedback ${(i as { tone?: string }).tone ?? ''}`.trim();
    case 'variant_start':
      return `variant_start ${i.variantKind}`;
    case 'deep_dive_start':
      return `deep_dive_start ${i.deepDiveId}`;
    case 'component':
      return `component ${i.spec.component}`;
    default:
      return i.kind;
  }
}

function planOf(e: Event): string | null {
  if (e.t !== 'plan') {
    return null;
  }
  const n = e.decision.next as {
    kind: string;
    variantId?: string;
    deepDiveId?: string;
    level?: number;
  };
  const target = n.variantId ?? n.deepDiveId ?? (n.level ? `L${n.level}` : '');
  return `${e.decision.ruleId} -> ${n.kind}${target ? ` ${target}` : ''}`;
}

export function loadEx2() {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}

/**
 * The scripted student, one action at a time (shared by the regression
 * test and the debug-only `-devScript real1b` that plays it in the app).
 * Their own inputs per card, the card choices of that day, a walk-through
 * read through, and any other detour answered right.
 */
export function realSessionPlayer(loaded: LoadedExercise) {
  const queues = Object.fromEntries(
    Object.entries(REAL_INPUTS).map(([k, v]) => [k, [...v]]),
  );
  return {
    next(state: LessonState): { act: Act; on: string } | null {
      const card = [...state.items]
        .reverse()
        .find(i => i.kind === 'choice_card' && i.status === 'open');
      const on = frameKey(state) ?? 'none';
      // B4: a walk-through on screen is read through, one «التالي» per line.
      if (state.items.some(i => i.kind === 'walkthrough' && !i.done)) {
        return {
          act: { type: 'walkthrough_next' } as Act,
          on: `walkthrough ${on}`,
        };
      }
      if (card?.kind === 'choice_card' && REAL_CARDS[card.purpose] !== null) {
        const choice =
          REAL_CARDS[card.purpose] ??
          (card.choices.includes('dismissed') ? 'dismissed' : card.choices[0]!);
        return {
          act: { type: 'card_choice', purpose: card.purpose, choice } as Act,
          on: `card ${card.purpose}`,
        };
      }
      const own = on !== 'none' ? queues[on] : undefined;
      if (own && own.length > 0) {
        return { act: own.shift()!, on };
      }
      const right = nextRightAction(state, loaded) as Act | null;
      return right ? { act: right, on } : null;
    },
  };
}

/** Plays the real session with the current rules; returns one row per student action. */
export function playRealSession1b(): {
  rows: SessionRow[];
  events: readonly Event[];
  content: LessonContent;
} {
  const loaded = loadEx2();
  const content = buildContent(loaded, '1b');
  const log = new EventLog(
    {
      sessionId: 'real-1b',
      studentId: 'anon',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const rules = createRulesPlanner(content.menu);
  const start = startLesson(content);
  log.append(start.events);
  let state = start.state;
  const player = realSessionPlayer(loaded);
  const rows: SessionRow[] = [];
  let t = 1000;
  for (let guard = 0; guard < 120 && !state.finished; guard += 1) {
    const step = player.next(state);
    const act = step?.act ?? null;
    const on = step?.on ?? 'none';
    if (!act) {
      break;
    }
    const before = log.all().length;
    const itemsBefore = state.items.length;
    t += 5000;
    state = stepSync(
      content,
      state,
      { ...act, at: t } as LessonAction,
      log,
      rules,
    );
    const added = log.all().slice(before);
    rows.push({
      action: describe(act),
      on,
      decisions: added.map(planOf).filter((x): x is string => x !== null),
      feed: state.items.slice(itemsBefore).map(feedLabel),
    });
  }
  return { rows, events: log.all(), content };
}
