/**
 * Context packs: the only input an LLM gets (docs/PLANNER.md "Input").
 * Built from verified content and the event-derived Situation; no names, no
 * session or student ids, no device data. The student's own words appear in
 * exactly one field (`dynamic.studentText`), cleaned and capped, and the
 * prompt tells the model to treat it as data.
 * The `static` part depends only on (exercise, content version, question), so
 * it is byte-identical across calls and the provider's prompt cache can reuse it.
 */
import { componentMeta } from '../../components/registry';
import type { JsonObject } from '../../components/contract';
import type { Rich } from '../../content/schema';
import { stepKey } from '../../content/loader';
import { fractionToPlain } from '../../engine/format';
import type { LessonContent } from '../../lesson/session/lesson';
import type { Situation } from '../situation';
import { plannerComponents } from './plannerFormat';
import {
  answerTokensFor,
  mainStepOf,
  shownValues,
  taskAnswer,
  valueKey,
} from './shown';

export const PACK_VERSION = 1;
export const STUDENT_TEXT_MAX = 500;

export interface StaticPack {
  exercise: { id: string; contentVersion: string; statement: string };
  question: { id: string; goal: string };
  /** Results the exam gives for this question (résultats acquis). */
  verifiedSolution: {
    results: { id: string; statement: string }[];
  };
  menu: {
    deepDives: { id: string; representation: string; forStep?: string }[];
    variants: {
      id: string;
      kind: string;
      skills: string[];
      forSteps: string[];
    }[];
    components: { component: string; teaches: string[] }[];
  };
}

export interface PlanContextPack {
  v: typeof PACK_VERSION;
  kind: 'plan';
  locale: 'ar-TN';
  static: StaticPack;
  dynamic: {
    situation: Omit<Situation, 'request'>;
    verifiedSoFar: SolutionSoFar;
    constraints: string[];
    studentText?: string;
  };
}

/**
 * Ground truth the model may see at this point (answer-leak fix A): answers of
 * the steps already done, the current step's answer only once revealed or the
 * hint ladder is used up, and only the engine values the student was shown.
 * Later steps are not sent at all.
 */
export interface SolutionSoFar {
  steps: { key: string; prompt: string; answer: string }[];
  values: Record<string, string>;
}

export interface TutorTurn {
  role: 'student' | 'tutor';
  text: string;
}

export interface TutorContextPack {
  v: typeof PACK_VERSION;
  kind: 'tutor';
  locale: 'ar-TN';
  static: StaticPack;
  dynamic: {
    stepKey: string | null;
    stepPrompt: string | null;
    hintsUsed: number;
    hintCount: number;
    skills: Record<string, { status: string; representationsTried: string[] }>;
    components?: JsonObject;
    history: TutorTurn[];
    verifiedSoFar: SolutionSoFar;
    studentText: string;
  };
}

/** Rich (or anything with ar / fr / math) -> plain text; math as $...$. */
export function richToText(rich: unknown): string {
  if (Array.isArray(rich)) {
    return rich.map(richToText).filter(Boolean).join(' ');
  }
  if (rich === null || typeof rich !== 'object') {
    return typeof rich === 'string' ? rich : '';
  }
  const r = rich as Partial<Rich> & { ar?: unknown };
  const parts: string[] = [];
  if (Array.isArray(r.ar)) {
    parts.push(
      r.ar
        .map((run: { ar?: string; fr?: string }) => run.ar ?? run.fr ?? '')
        .join(''),
    );
  }
  if (typeof r.fr === 'string') {
    parts.push(r.fr);
  }
  if (typeof r.math === 'string') {
    parts.push(`$${r.math}$`);
  }
  return parts.join(' ').trim();
}

/**
 * C0 controls, DEL, zero-width and bidi controls (written as escapes: the
 * source never holds literal invisible characters, __tests__/sourceHygiene).
 */
const CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Control characters and bidi controls removed, whitespace collapsed, capped. */
export function cleanStudentText(text: string): string {
  return text
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, STUDENT_TEXT_MAX);
}

const staticCache = new WeakMap<LessonContent, StaticPack>();

export function buildStaticPack(content: LessonContent): StaticPack {
  const cached = staticCache.get(content);
  if (cached) {
    return cached;
  }
  const { exercise } = content.loaded;
  const q = content.question;
  const menu = content.menu;
  const pack: StaticPack = {
    exercise: {
      id: exercise.id,
      contentVersion: exercise.contentVersion,
      statement: richToText(exercise.statement),
    },
    question: { id: q.id, goal: richToText(q.goal) },
    verifiedSolution: {
      results: menu.usedResults(q.id).map(r => ({
        id: r.id,
        statement: richToText(r.statement),
      })),
    },
    menu: {
      deepDives: exercise.deepDives.map(d => ({
        id: d.id,
        representation: menu.deepDiveRepresentation(d.id),
      })),
      variants: exercise.variants.map(v => ({
        id: v.id,
        kind: v.kind,
        skills: [...v.step.skills],
        forSteps: [...v.forSteps],
      })),
      components: plannerComponents().map(c => ({
        component: c,
        teaches: [...(componentMeta(c)?.teaches ?? [])],
      })),
    },
  };
  staticCache.set(content, pack);
  return pack;
}

/** One step's verified answer as text (choice label, number, or a task's engine answer). */
function answerText(content: LessonContent, key: string): string | null {
  const answer = content.loaded.answers.get(key);
  if (answer?.kind === 'number') {
    return fractionToPlain(answer.value);
  }
  if (answer?.kind === 'option') {
    const step = content.steps.get(key);
    const opt =
      step?.kind === 'choice'
        ? step.options.find(o => o.id === answer.optionId)
        : undefined;
    return `${answer.optionId}${
      opt?.label ? `: ${richToText(opt.label)}` : ''
    }`;
  }
  const task = taskAnswer(content, key);
  if (!task) {
    return null;
  }
  return task.ids.length > 0
    ? `outcomes ${task.ids.join(', ')}; ${task.values
        .map(fractionToPlain)
        .join('; ')}`
    : task.values.map(fractionToPlain).join('; ');
}

export function solutionSoFar(
  content: LessonContent,
  at: {
    stepKey: string | null;
    hintsUsed: number;
    hintCount: number;
    revealed: boolean;
    deepDivesShown?: readonly string[];
    variantsShown?: readonly string[];
  },
): SolutionSoFar {
  const q = content.question;
  const parent = mainStepOf(content, at.stepKey);
  const mains = q.groups.flatMap(g => g.steps);
  const upTo =
    parent === null
      ? -1
      : mains.findIndex(m => stepKey.main(q.id, m.id) === parent);
  const currentOpen =
    !at.revealed && (at.hintCount === 0 || at.hintsUsed < at.hintCount);
  const steps: SolutionSoFar['steps'] = [];
  const addStep = (key: string) => {
    const answer = answerText(content, key);
    const step = content.steps.get(key);
    if (answer !== null) {
      steps.push({
        key,
        prompt:
          step && 'prompt' in step && step.prompt
            ? richToText(step.prompt)
            : '',
        answer,
      });
    }
  };
  mains
    .slice(0, Math.max(0, upTo))
    .forEach(m => addStep(stepKey.main(q.id, m.id)));
  if (at.stepKey !== null && !currentOpen) {
    addStep(at.stepKey);
  }
  const shown = shownValues(content, {
    stepKey: at.stepKey,
    hintsUsed: at.hintsUsed,
    ...(at.deepDivesShown && { deepDivesShown: at.deepDivesShown }),
    ...(at.variantsShown && { variantsShown: at.variantsShown }),
  });
  const forbidden = currentOpen
    ? answerTokensFor(content, at.stepKey).values
    : new Set<string>();
  const values: Record<string, string> = {};
  for (const [id, v] of content.loaded.values) {
    const k = valueKey(v);
    if (shown.has(k) && !forbidden.has(k)) {
      values[id] = fractionToPlain(v);
    }
  }
  return { steps, values };
}

/** Hard rules restated per call (the code enforces them again after the answer). */
export function constraintsFor(s: Situation): string[] {
  const out = [
    `hint level must be ${Math.min(
      s.step.hintsUsed + 1,
      3,
    )} if you choose a hint`,
    'student must act after your message (tap, type or choose)',
    'one idea per message, formulas only in math blocks',
  ];
  if (s.step.hintsUsed < s.step.hintCount && !s.step.revealed) {
    out.push('never state the final answer of the current step');
  }
  if (s.representationsTried.length > 0) {
    out.push(
      `avoid representations already tried: ${s.representationsTried.join(
        ', ',
      )}`,
    );
  }
  return out;
}

export function buildPlanPack(
  content: LessonContent,
  situation: Situation,
): PlanContextPack {
  const { request, ...rest } = situation;
  const text = request?.text ? cleanStudentText(request.text) : '';
  return {
    v: PACK_VERSION,
    kind: 'plan',
    locale: 'ar-TN',
    static: buildStaticPack(content),
    dynamic: {
      situation: rest,
      verifiedSoFar: solutionSoFar(content, {
        stepKey: situation.step.key,
        hintsUsed: situation.step.hintsUsed,
        hintCount: situation.step.hintCount,
        revealed: situation.step.revealed,
        deepDivesShown: situation.question.deepDivesShown,
        variantsShown: situation.question.variantsShown,
      }),
      constraints: constraintsFor(situation),
      ...(text && { studentText: text }),
    },
  };
}

export function buildTutorPack(
  content: LessonContent,
  input: {
    stepKey: string | null;
    hintsUsed: number;
    hintCount: number;
    skills: TutorContextPack['dynamic']['skills'];
    components?: JsonObject;
    history: TutorTurn[];
    studentText: string;
  },
): TutorContextPack {
  const step = input.stepKey ? content.steps.get(input.stepKey) : undefined;
  return {
    v: PACK_VERSION,
    kind: 'tutor',
    locale: 'ar-TN',
    static: buildStaticPack(content),
    dynamic: {
      stepKey: input.stepKey,
      stepPrompt:
        step && 'prompt' in step && step.prompt
          ? richToText(step.prompt)
          : null,
      hintsUsed: input.hintsUsed,
      hintCount: input.hintCount,
      skills: input.skills,
      ...(input.components && { components: input.components }),
      verifiedSoFar: solutionSoFar(content, {
        stepKey: input.stepKey,
        hintsUsed: input.hintsUsed,
        hintCount: input.hintCount,
        revealed: false,
      }),
      history: input.history.slice(-6).map(t => ({
        role: t.role,
        text: cleanStudentText(t.text),
      })),
      studentText: cleanStudentText(input.studentText),
    },
  };
}

/** Serialized input: static part first (cacheable prefix), then dynamic. */
export function serializePack(
  pack: PlanContextPack | TutorContextPack,
): string {
  return JSON.stringify({
    v: pack.v,
    kind: pack.kind,
    locale: pack.locale,
    static: pack.static,
    dynamic: pack.dynamic,
  });
}
