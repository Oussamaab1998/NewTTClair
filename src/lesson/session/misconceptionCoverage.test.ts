/**
 * Round 1 "dead ends" (product owner, 2026-10-22): a diagnosed wrong answer
 * never ends with nothing new on screen. For EVERY misconception id of the
 * content, at every place it can be reached (an option, an authored wrong
 * value, a procedure value, a known wrong line, a component diagnosis), the
 * first wrong answer there must show a specific line AND a next step (a
 * hint, an offer or other card, a detour, a check, an explanation). Probe
 * cards are resolved both ways (the misconception confirmed, «موش توّا»).
 */
// Frozen copy of question 1 as it was in exsc2-0.3.0 (before the method-lesson slice, docs/METHOD_LESSON_PROGRESS.md). Its assertions are unchanged; the live content has its own tests (scEx2.method.test.ts).
import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import exSc2 from '../../content/fixtures/scEx2.v030.json';
import exSc2Misconceptions from '../../content/fixtures/scEx2Misconceptions.v030.json';
import ex4 from '../../content/exercises/bac2022c-ex4.json';
import ex4Misconceptions from '../../content/exercises/bac2022c-ex4.misconceptions.json';
import { nextRightAction } from '../../app/dev/answerAll';
import {
  loadExercise,
  stepKey,
  type LoadedExercise,
} from '../../content/loader';
import { fractionToPlain, parseNumeric } from '../../engine/format';
import { equals } from '../../engine/rational';
import { continueDecision } from '../../planner/planner';
import { createRulesPlanner } from '../../planner/rules';
import type { Action } from '../../planner/schema';
import { EventLog, fixedClock } from '../../telemetry/log';
import { buildContent, reduce, startLesson } from './lesson';
import { stepSync } from './orchestrate';
import type { FeedItem, LessonAction, LessonState } from './types';

type Act = Omit<LessonAction, 'at'>;

interface Site {
  exercise: string;
  part: string;
  /** Main step key to stand on (the site itself, or where its detour opens). */
  host: string;
  /** The site's step key. */
  key: string;
  misconceptionId: string;
  wrong: Act;
  label: string;
}

function load(raw: unknown, lib: unknown): LoadedExercise {
  const r = loadExercise(raw, lib);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
}

const EXERCISES = [
  { loaded: load(ex2, ex2Misconceptions) },
  { loaded: load(exSc2, exSc2Misconceptions) },
  { loaded: load(ex4, ex4Misconceptions) },
];

type AnyStep = Record<string, unknown> & { id: string; kind: string };

/** Every place a misconception can be reached, with the wrong action that reaches it. */
function sitesOf(loaded: LoadedExercise): Site[] {
  const ex = loaded.exercise;
  const out: Site[] = [];
  const firstAsked = new Map<string, string>();
  const mainOf = new Map<string, { part: string; key: string }>();
  for (const q of ex.parts) {
    for (const s of q.groups.flatMap(g => g.steps)) {
      if (s.kind !== 'text') {
        const key = stepKey.main(q.id, s.id);
        mainOf.set(key, { part: q.id, key });
        if (
          !firstAsked.has(q.id) &&
          ['choice', 'typed', 'lines'].includes(s.kind)
        ) {
          firstAsked.set(q.id, key);
        }
      }
    }
  }
  const firstPart = ex.parts.find(p => firstAsked.has(p.id))!.id;
  const add = (
    step: AnyStep,
    key: string,
    host: { part: string; key: string },
  ) => {
    const answer = loaded.answers.get(key);
    const push = (misconceptionId: string, wrong: Act, label: string) =>
      out.push({
        exercise: ex.id,
        part: host.part,
        host: host.key,
        key,
        misconceptionId,
        wrong,
        label: `${key} ${label}`,
      });
    for (const o of (step.options as AnyStep[] | undefined) ?? []) {
      if (o.misconceptionId) {
        push(
          o.misconceptionId as string,
          { type: 'answer', value: { optionId: o.id } } as Act,
          `option ${o.id}`,
        );
      }
    }
    const authored = (
      (step.wrongAnswers as { value: string; misconceptionId?: string }[]) ?? []
    ).filter(w => w.misconceptionId);
    for (const w of authored) {
      push(
        w.misconceptionId!,
        { type: 'answer', value: { raw: w.value } } as Act,
        `typed ${w.value}`,
      );
    }
    if (answer?.kind === 'number') {
      for (const p of answer.procedures ?? []) {
        for (const v of p.values) {
          // An authored value wins (covered above).
          const shadowed = authored.some(w => {
            const a = parseNumeric(w.value);
            return a.ok && equals(a.value, v);
          });
          if (!shadowed) {
            push(
              p.misconceptionId,
              {
                type: 'answer',
                value: { raw: fractionToPlain(v) },
              } as Act,
              `typed ${fractionToPlain(v)} (${p.id})`,
            );
          }
        }
      }
    }
    for (const w of (step.knownWrong as AnyStep[] | undefined) ?? []) {
      push(
        w.misconceptionId as string,
        { type: 'answer', value: { line: w.expr } } as Act,
        `line ${w.expr as string}`,
      );
    }
    for (const g of (step.diagnoses as AnyStep[] | undefined) ?? []) {
      push(
        g.misconceptionId as string,
        {
          type: 'component_result',
          correct: false,
          details: {},
          misconceptionHints: [g.misconceptionId],
        } as Act,
        `diagnosis`,
      );
    }
  };
  for (const [key, host] of mainOf) {
    const [part, id] = key.split('/');
    const step = ex.parts
      .find(p => p.id === part)!
      .groups.flatMap(g => g.steps)
      .find(s => s.id === id)!;
    add(step as unknown as AnyStep, key, host);
  }
  for (const v of ex.variants) {
    const host =
      mainOf.get(v.forSteps[0] ?? '') ??
      ({ part: firstPart, key: firstAsked.get(firstPart)! } as const);
    add(v.step as unknown as AnyStep, stepKey.variant(v.id), host);
  }
  for (const d of ex.deepDives) {
    if (!d.mini) {
      continue;
    }
    const owner = [...mainOf.keys()].find(k => {
      const [part, id] = k.split('/');
      const s = ex.parts
        .find(p => p.id === part)!
        .groups.flatMap(g => g.steps)
        .find(x => x.id === id) as { deepDiveId?: string } | undefined;
      return s?.deepDiveId === d.id;
    });
    const host = owner
      ? mainOf.get(owner)!
      : { part: firstPart, key: firstAsked.get(firstPart)! };
    add(d.mini as unknown as AnyStep, stepKey.mini(d.id), host);
  }
  return out;
}

const frameKey = (s: LessonState) => {
  const ref = s.stack[s.stack.length - 1]?.ref;
  return !ref
    ? null
    : ref.scope === 'main'
    ? stepKey.main(ref.questionId, ref.stepId)
    : ref.scope === 'mini'
    ? stepKey.mini(ref.deepDiveId)
    : stepKey.variant(ref.variantId);
};

/** Plays up to the site, makes the wrong answer, resolves a probe with `probe`; returns the new items. */
function play(
  loaded: LoadedExercise,
  site: Site,
  probe: 'confirm' | 'dismissed' | { choice: string },
): {
  items: FeedItem[];
  reached: boolean;
  /** The probe card's choices, when one was shown. */
  probeChoices?: string[];
  /** The planner's next action after the wrong answer (and the probe). */
  next?: unknown;
} {
  const content = buildContent(loaded, site.part);
  const log = new EventLog(
    {
      sessionId: 'cov',
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
  let t = 1000;
  const act = (a: Act) => {
    t += 5000;
    state = stepSync(
      content,
      state,
      { ...a, at: t } as LessonAction,
      log,
      rules,
    );
  };
  for (let i = 0; i < 80 && frameKey(state) !== site.host; i += 1) {
    const a = nextRightAction(state, loaded);
    if (!a) {
      break;
    }
    act(a as Act);
  }
  if (frameKey(state) !== site.host) {
    return { items: [], reached: false };
  }
  if (site.key !== site.host) {
    // Open the site's detour as a planner decision would.
    t += 5000;
    const r1 = reduce(content, state, { type: 'not_sure', at: t });
    log.append(r1.events);
    const next: Action = site.key.startsWith('dd:')
      ? { kind: 'deep_dive', deepDiveId: site.key.slice(3) }
      : { kind: 'variant', variantId: site.key.slice(4) };
    const r2 = reduce(content, r1.state, {
      type: 'apply_plan',
      decision: { ...continueDecision('test.open'), next },
      at: t,
    });
    log.append(r2.events);
    state = r2.state;
    if (frameKey(state) !== site.key) {
      return { items: [], reached: false };
    }
  }
  const before = state.items.map(i => i.key);
  act(site.wrong);
  const open = state.items.find(
    i =>
      i.kind === 'choice_card' && i.purpose === 'probe' && i.status === 'open',
  );
  if (open?.kind === 'choice_card') {
    const choice =
      typeof probe === 'object'
        ? probe.choice
        : probe === 'confirm' && open.choices.includes(site.misconceptionId)
        ? site.misconceptionId
        : 'dismissed';
    act({ type: 'card_choice', purpose: 'probe', choice } as Act);
  }
  const plan = [...log.all()].reverse().find(e => e.t === 'plan');
  return {
    items: state.items.filter(i => !before.includes(i.key)),
    reached: true,
    ...(open?.kind === 'choice_card' && { probeChoices: open.choices }),
    ...(plan?.t === 'plan' && {
      next: { next: plan.decision.next, followUp: plan.decision.followUp },
    }),
  };
}

const isLine = (i: FeedItem) =>
  i.kind === 'feedback' &&
  i.rich !== undefined &&
  i.trust !== 'engine_computed' &&
  i.tone !== 'success';
const isNext = (i: FeedItem) =>
  i.kind === 'hint' ||
  (i.kind === 'choice_card' && i.purpose !== 'probe') ||
  i.kind === 'variant_start' ||
  i.kind === 'deep_dive_start' ||
  i.kind === 'tutor' ||
  (i.kind === 'feedback' && i.trust === 'engine_computed');

const ALL = EXERCISES.flatMap(e =>
  sitesOf(e.loaded).map(site => ({ loaded: e.loaded, site })),
);

describe('every misconception: its first wrong answer shows a line and a next step', () => {
  it('finds a place for every misconception that content references', () => {
    const reached = new Set(ALL.map(x => x.site.misconceptionId));
    const unreferenced = EXERCISES.flatMap(e =>
      [...e.loaded.misconceptionIds].filter(id => !reached.has(id)),
    ).sort();
    // Library entries no option, value, line or diagnosis points to yet
    // (Ex 4 parts not built; the line checker's own codes).
    expect(unreferenced).toEqual([
      'cancel_leaves_zero',
      'exp_neg_limit_wrong',
      'extremum_without_sign_change',
      'interpretation_misplaced',
      'missing_parentheses_fraction',
      'prime_notation_unknown',
      'sign_arrow_mismatch',
      'value_at_0_vs_limit',
    ]);
  });

  for (const probe of ['confirm', 'dismissed'] as const) {
    it.each(ALL.map(x => [x.site.label, x.site.misconceptionId, x] as const))(
      `%s (%s), probe ${probe}`,
      (_label, _id, { loaded, site }) => {
        const r = play(loaded, site, probe);
        expect(r.reached).toBe(true);
        const shown = r.items.map(
          i => `${i.kind}${'purpose' in i ? `:${i.purpose}` : ''}`,
        );
        expect({ line: r.items.some(isLine), shown }).toMatchObject({
          line: true,
        });
        expect({ next: r.items.some(isNext), shown }).toMatchObject({
          next: true,
        });
      },
    );
  }
});

describe('a probe card only when its answers lead to different next actions (2026-10-22)', () => {
  const probed = ALL.flatMap(x => {
    const r = play(x.loaded, x.site, 'dismissed');
    return r.probeChoices ? [{ ...x, choices: r.probeChoices }] : [];
  });

  it('some places still ask (4 on the transfer of 1b/s5)', () => {
    expect(probed.map(x => x.site.label)).toContain(
      'var:tr-1b-s5-noneg typed 4 (balls_in_event)',
    );
  });

  it.each(probed.map(x => [x.site.label, x] as const))(
    '%s: every answer leads somewhere different',
    (_label, { loaded, site, choices }) => {
      const answers = choices.filter(c => c !== 'dismissed');
      const nexts = answers.map(choice =>
        JSON.stringify(play(loaded, site, { choice }).next),
      );
      expect(new Set(nexts).size).toBe(answers.length);
    },
  );
});
