/**
 * Context packs: the only input an LLM gets (docs/PLANNER.md "Input").
 * Built from verified content and the event-derived Situation; no names, no
 * session or student ids, no device data. The student's own words appear in
 * exactly one field (`dynamic.studentText`), cleaned and capped, and the
 * prompt tells the model to treat it as data.
 * The `static` part depends only on (exercise, content version, question), so
 * it is byte-identical across calls and the provider's prompt cache can reuse it.
 */
import { CATALOG_META } from '../../components/catalogMeta';
import type { ComponentName } from '../../components/contract';
import { componentMeta } from '../../components/registry';
import type { JsonObject } from '../../components/contract';
import type { Rich } from '../../content/schema';
import { stepKey } from '../../content/loader';
import { fractionToPlain, parseNumeric } from '../../engine/format';
import { add } from '../../engine/rational';
import type { LessonContent } from '../../lesson/session/lesson';
import type { Situation } from '../situation';
import { plannerComponents } from './plannerFormat';
import { revealingNotes } from './revealing';
import {
  answerTokensFor,
  mainStepOf,
  shownValues,
  taskAnswer,
  valueKey,
} from './shown';

export const PACK_VERSION = 2;
export const STUDENT_TEXT_MAX = 500;

export interface StaticPack {
  exercise: { id: string; contentVersion: string; statement: string };
  question: { id: string; goal: string };
  /** Results the exam gives for this question (résultats acquis). */
  verifiedSolution: {
    results: { id: string; statement: string }[];
  };
  /** Known misconceptions of this exercise (diagnosis ids; descriptions in English). */
  misconceptions: {
    id: string;
    skillId: string;
    category: string;
    description: string;
  }[];
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
    /** Why the AI is asked now (consult.ts ConsultReason). */
    aiTrigger?: string;
    /**
     * The engine's check of what the student just did: their typed value as
     * the engine reads it, the numeric check identity when the step has one,
     * or the line verdict (also in situation.step.line). Never the answer.
     */
    engineCheck?: {
      kind: 'typed' | 'line';
      studentValue?: string;
      identity?: string;
      line?: Situation['step']['line'];
    };
    /** Representations tried on this step that did not help. */
    representationsFailed: string[];
    verifiedSoFar: SolutionSoFar;
    constraints: string[];
    /**
     * Components the guard accepts at THIS step (2026-10-22): per-step, so in
     * the uncached part; the full catalog stays in the cached system prompt.
     */
    offeredComponents: { component: string; use: string }[];
    /** While hints are left: component settings that would show the answer (revealing.ts). */
    notWhileHintsLeft?: string[];
    studentText?: string;
  };
}

/** The catalog's "when to use", first sentence, at most 200 characters. */
function useOf(name: ComponentName): string {
  const w = CATALOG_META[name]?.whenToUse ?? '';
  const first = /^[^.]*\./.exec(w)?.[0] ?? w;
  return first.slice(0, 200);
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
    misconceptions: [...content.loaded.misconceptions.values()].map(m => ({
      id: m.id,
      skillId: m.skillId,
      category: m.category,
      description: m.description,
    })),
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

/** Detours on this step that did not help (a failed mini, abandoned, wrong). */
export function representationsFailed(s: Situation): string[] {
  const failed = s.detours.filter(
    d =>
      d.helped === false ||
      d.outcome === 'abandoned' ||
      d.outcome === 'wrong' ||
      d.outcome === 'revealed',
  );
  return [...new Set(failed.map(d => d.representation))];
}

/** The engine's reading of the student's last typed value or line (no answer). */
export function engineCheckFor(
  content: LessonContent,
  s: Situation,
): PlanContextPack['dynamic']['engineCheck'] {
  if (s.step.line && (s.trigger === 'wrong' || s.trigger === 'line_invalid')) {
    return { kind: 'line', line: s.step.line };
  }
  const value = s.step.last?.value;
  const step = content.steps.get(s.step.key);
  if (s.trigger !== 'wrong' || !value || step?.kind !== 'typed') {
    return undefined;
  }
  const parsed = parseNumeric(value);
  if (!parsed.ok) {
    return undefined;
  }
  // The identity only once the rules showed it (its numbers are then allowed).
  const shownCheck = s.decisions.some(x => x.kind === 'numeric_check');
  const check = shownCheck && 'check' in step ? step.check : undefined;
  const known = check ? content.loaded.values.get(check.known) : undefined;
  return {
    kind: 'typed',
    studentValue: fractionToPlain(parsed.value),
    ...(known && {
      identity: `${fractionToPlain(parsed.value)} + ${fractionToPlain(
        known,
      )} = ${fractionToPlain(add(parsed.value, known))}`,
    }),
  };
}

export function buildPlanPack(
  content: LessonContent,
  situation: Situation,
  o: { reason?: string } = {},
): PlanContextPack {
  const { request, ...rest } = situation;
  const text = request?.text ? cleanStudentText(request.text) : '';
  const engineCheck = engineCheckFor(content, situation);
  const hintsLeft =
    situation.step.hintsUsed < situation.step.hintCount &&
    !situation.step.revealed;
  const notes = revealingNotes(content, situation.step.key);
  return {
    v: PACK_VERSION,
    kind: 'plan',
    locale: 'ar-TN',
    static: buildStaticPack(content),
    dynamic: {
      situation: rest,
      ...(o.reason && { aiTrigger: o.reason }),
      ...(engineCheck && { engineCheck }),
      representationsFailed: representationsFailed(situation),
      verifiedSoFar: solutionSoFar(content, {
        stepKey: situation.step.key,
        hintsUsed: situation.step.hintsUsed,
        hintCount: situation.step.hintCount,
        revealed: situation.step.revealed,
        deepDivesShown: situation.question.deepDivesShown,
        variantsShown: situation.question.variantsShown,
      }),
      constraints: constraintsFor(situation),
      offeredComponents: plannerComponents(situation.step.skills).map(c => ({
        component: c,
        use: useOf(c),
      })),
      ...(hintsLeft &&
        notes.length > 0 && { notWhileHintsLeft: notes }),
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

/** The static part alone (a cache breakpoint ends it; D22). */
export function serializeStatic(
  pack: PlanContextPack | TutorContextPack,
): string {
  return JSON.stringify({
    v: pack.v,
    kind: pack.kind,
    locale: pack.locale,
    static: pack.static,
  });
}

/** The dynamic part alone (after the static part). */
export function serializeDynamic(
  pack: PlanContextPack | TutorContextPack,
): string {
  return JSON.stringify({ dynamic: pack.dynamic });
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
