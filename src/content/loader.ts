/**
 * Content loader: validates exercise JSON, then makes every shown value come
 * from the engine (CLAUDE.md hard rule 1).
 * - `\val{id}` in math / latex / writeup strings -> the engine value of `values[id]`.
 * - Numeric options get their label from `value`; the correct option is found by engine value.
 * - Typed answers resolve to an exact fraction.
 * - Every formula must parse with the native math renderer (no raw-LaTeX fallback in lessons).
 * Never throws on bad content: returns the list of problems.
 */
import { componentKind, resolveSpec } from '../components/registry';
import type { ComponentSpec } from '../components/contract';
import { runEngineCall, runSetCall, type CallContext } from '../engine/calls';
import {
  fractionToLatex,
  fractionToPlain,
  parseNumeric,
} from '../engine/format';
import { equals, type Fraction } from '../engine/rational';
import { parseLatexSubset } from '../lesson/math/latexSubset';
import {
  ExerciseSchema,
  MisconceptionLibrarySchema,
  type AnswerSpec,
  type Block,
  type Exercise,
  type KeypadKind,
  type Misconception,
  type Rich,
  type Step,
} from './schema';

export type ResolvedAnswer =
  | { kind: 'option'; optionId: string }
  | { kind: 'number'; value: Fraction };

export type AskedStep = Extract<Step, { kind: 'choice' | 'typed' }>;
/** A component step whose registry kind is "task": it blocks the path like a question. */
export type TaskStep = Extract<Step, { kind: 'component' }>;

export const isTaskStep = (s: Step): boolean =>
  s.kind === 'component' && componentKind(s.component) === 'task';

const INTEGER_CALLS = new Set(['outcomeCount', 'count', 'choose']);
const SIGNED_CALLS = new Set(['product']);

/** Keys of a typed step: explicit, else from the answer's engine call (never from the value). */
export function keypadFor(step: Extract<Step, { kind: 'typed' }>): KeypadKind {
  if (step.keypad) {
    return step.keypad;
  }
  const fn = 'compute' in step.answer ? step.answer.compute.fn : '';
  return INTEGER_CALLS.has(fn)
    ? 'integer'
    : SIGNED_CALLS.has(fn)
    ? 'signed'
    : 'probability';
}

/** Can this raw value be typed with these keys? */
export function typeableOn(raw: string, keypad: KeypadKind): boolean {
  const allowed =
    keypad === 'integer'
      ? /^[0-9]+$/
      : keypad === 'signed'
      ? /^-?[0-9]+$/
      : /^[0-9/,]+$/;
  return allowed.test(raw);
}

export interface LoadedExercise {
  exercise: Exercise;
  /** Keyed by `stepKey`. */
  answers: ReadonlyMap<string, ResolvedAnswer>;
  misconceptionIds: ReadonlySet<string>;
  misconceptions: ReadonlyMap<string, Misconception>;
  /** Engine values of `exercise.values` (numeric checks). */
  values: ReadonlyMap<string, Fraction>;
}

export type LoadResult =
  | { ok: true; loaded: LoadedExercise }
  | { ok: false; errors: string[] };

/** Main-path steps: `1b/s3`; deep-dive mini questions: `dd:compl`; variants: `var:compl-bar`. */
export const stepKey = {
  main: (questionId: string, stepId: string) => `${questionId}/${stepId}`,
  mini: (deepDiveId: string) => `dd:${deepDiveId}`,
  variant: (variantId: string) => `var:${variantId}`,
};

const VAL = /\\val\{([A-Za-z0-9_.-]+)\}/g;

type Json = unknown;

function mapStrings(
  node: Json,
  fn: (s: string, key: string | undefined) => string,
  key?: string,
): Json {
  if (typeof node === 'string') {
    return fn(node, key);
  }
  if (Array.isArray(node)) {
    return node.map(child => mapStrings(child, fn, key));
  }
  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, mapStrings(v, fn, k)]),
    );
  }
  return node;
}

function forEachString(
  node: Json,
  fn: (s: string, key: string | undefined) => void,
): void {
  mapStrings(node, (s, k) => {
    fn(s, k);
    return s;
  });
}

const MATH_KEYS = new Set(['math', 'latex']);

/** The engine context of a deep dive: its own experiment, else the exercise's. */
export function deepDiveContext(
  ex: Exercise,
  dive: Exercise['deepDives'][number],
): CallContext {
  const experiment = dive.experiment ?? ex.experiment;
  return experiment ? { experiment } : {};
}

/** "text", or "text+<Component>" when the deep dive has its interactive component. */
export function deepDiveRepresentation(
  dive: Exercise['deepDives'][number],
): string {
  const block = dive.blocks.find(b => b.type === 'component');
  const name =
    block?.type === 'component'
      ? block.spec.component
      : dive.mini?.kind === 'component'
      ? dive.mini.component.component
      : undefined;
  return name === undefined ? 'text' : `text+${name}`;
}

/** Before a deep dive's component: 1 to this many text / math blocks (untuned guess). */
export const DEEP_DIVE_TEXT_BLOCKS_MAX = 2;
/** ... with at most this many characters of text in total (untuned guess). */
export const DEEP_DIVE_TEXT_CHARS_MAX = 240;

/** The engine context of a variant: its own experiment, else the exercise's. */
export function variantContext(
  ex: Exercise,
  variant: Exercise['variants'][number],
): CallContext {
  const experiment = variant.experiment ?? ex.experiment;
  return experiment ? { experiment } : {};
}

function askedSteps(
  ex: Exercise,
): { key: string; step: AskedStep; ctx?: CallContext }[] {
  const out: { key: string; step: AskedStep; ctx?: CallContext }[] = [];
  for (const q of ex.parts) {
    for (const g of q.groups) {
      for (const s of g.steps) {
        if (s.kind === 'choice' || s.kind === 'typed') {
          out.push({ key: stepKey.main(q.id, s.id), step: s });
        }
      }
    }
  }
  for (const d of ex.deepDives) {
    if (d.mini && (d.mini.kind === 'choice' || d.mini.kind === 'typed')) {
      out.push({
        key: stepKey.mini(d.id),
        step: d.mini,
        ctx: deepDiveContext(ex, d),
      });
    }
  }
  for (const v of ex.variants) {
    if (v.step.kind === 'choice' || v.step.kind === 'typed') {
      out.push({
        key: stepKey.variant(v.id),
        step: v.step,
        ctx: variantContext(ex, v),
      });
    }
  }
  return out;
}

function resolveAnswer(
  step: AskedStep,
  answer: AnswerSpec,
  ctx: CallContext,
  errors: string[],
  where: string,
): ResolvedAnswer | null {
  if (step.kind === 'choice' && answer.type === 'set') {
    const computed = runSetCall(answer.compute, ctx);
    if (!computed.ok) {
      errors.push(`${where}: ${computed.error}`);
      return null;
    }
    const key = computed.value.join(',');
    const matches = step.options.filter(
      o => o.set !== undefined && sortedSet(o.set).join(',') === key,
    );
    if (matches.length !== 1) {
      errors.push(
        `${where}: ${matches.length} options equal the engine set {${key}}`,
      );
      return null;
    }
    return { kind: 'option', optionId: matches[0]!.id };
  }
  if (step.kind === 'choice' && answer.type === 'option') {
    if (!step.options.some(o => o.id === answer.id)) {
      errors.push(`${where}: answer ${answer.id} is not an option`);
      return null;
    }
    return { kind: 'option', optionId: answer.id };
  }
  if (answer.type !== 'fraction') {
    errors.push(`${where}: answer type ${answer.type} is not supported yet`);
    return null;
  }
  const computed = runEngineCall(answer.compute, ctx);
  if (!computed.ok) {
    errors.push(`${where}: ${computed.error}`);
    return null;
  }
  if (step.kind === 'typed') {
    for (const w of step.wrongAnswers ?? []) {
      const v = parseNumeric(w.value);
      if (v.ok && equals(v.value, computed.value)) {
        errors.push(`${where}: wrong answer ${w.value} equals the answer`);
      }
    }
    return { kind: 'number', value: computed.value };
  }
  const matches = step.options.filter(o => {
    const v = o.value === undefined ? null : parseNumeric(o.value);
    return v?.ok === true && equals(v.value, computed.value);
  });
  if (matches.length !== 1) {
    errors.push(
      `${where}: ${
        matches.length
      } options equal the engine value ${fractionToPlain(computed.value)}`,
    );
    return null;
  }
  return { kind: 'option', optionId: matches[0]!.id };
}

const sortedSet = (xs: readonly number[]) =>
  [...new Set(xs)].sort((a, b) => a - b);

/** `{-2 ; -1 ; 0 ; 2}` */
const setLatex = (xs: readonly number[]) =>
  `\\{${sortedSet(xs).join(' ; ')}\\}`;

/** Every component spec must render: registered name, props valid for this exercise. */
function checkComponents(
  ex: Exercise,
  ctx: CallContext,
  misconceptionIds: ReadonlySet<string>,
  errors: string[],
) {
  const check = (spec: ComponentSpec, where: string) => {
    const r = resolveSpec(spec, ctx.experiment);
    if (!r.ok) {
      errors.push(`${where}: ${spec.component} ${r.reason} (${r.detail})`);
    }
    return r.ok ? componentKind(spec) : undefined;
  };
  for (const q of ex.parts) {
    const steps = q.groups.flatMap(g => g.steps);
    for (const s of steps) {
      if (s.kind === 'typed') {
        const keypad = keypadFor(s);
        for (const w of s.wrongAnswers ?? []) {
          if (!typeableOn(w.value, keypad)) {
            errors.push(
              `${stepKey.main(q.id, s.id)}: wrong answer ${
                w.value
              } cannot be typed on the ${keypad} keypad`,
            );
          }
        }
      }
    }
    for (const s of steps) {
      if (s.kind !== 'component') {
        continue;
      }
      const where = stepKey.main(q.id, s.id);
      if (s.fillsLaw !== undefined) {
        checkFillsLaw(s, steps, where, errors);
      }
      if (check(s.component, where) !== 'task') {
        if (s.optional || s.hints || s.fillsLaw !== undefined) {
          errors.push(
            `${where}: optional/hints/fillsLaw need a task component`,
          );
        }
        continue;
      }
      if ((s.hints ?? []).length === 0) {
        errors.push(`${where}: task components need at least one hint`);
      }
      for (const d of s.diagnoses ?? []) {
        if (!misconceptionIds.has(d.misconceptionId)) {
          errors.push(`${where}: unknown misconception ${d.misconceptionId}`);
        }
      }
    }
  }
  for (const d of ex.deepDives) {
    checkDeepDive(ex, d, misconceptionIds, errors);
  }
  for (const v of ex.variants) {
    const where = stepKey.variant(v.id);
    const vctx = variantContext(ex, v);
    const checkIn = (spec: ComponentSpec, at: string) => {
      const r = resolveSpec(spec, vctx.experiment);
      if (!r.ok) {
        errors.push(`${at}: ${spec.component} ${r.reason} (${r.detail})`);
      }
      return r.ok ? componentKind(spec) : undefined;
    };
    for (const b of v.intro) {
      if (b.type === 'component' && checkIn(b.spec, where) === 'task') {
        errors.push(`${where}: task components are not supported in intros`);
      }
    }
    const s = v.step;
    if (s.kind === 'component') {
      if (checkIn(s.component, where) !== 'task') {
        errors.push(`${where}: a variant step must be a task component`);
      } else if ((s.hints ?? []).length === 0) {
        errors.push(`${where}: task components need at least one hint`);
      }
      if (s.fillsLaw !== undefined || s.optional) {
        errors.push(`${where}: variants cannot fill the law or be optional`);
      }
      for (const d of s.diagnoses ?? []) {
        if (!misconceptionIds.has(d.misconceptionId)) {
          errors.push(`${where}: unknown misconception ${d.misconceptionId}`);
        }
      }
    }
  }
}

const richChars = (r: Rich): number =>
  (r.ar ?? []).reduce(
    (n, run) => n + ('ar' in run ? run.ar.length : run.fr.length),
    0,
  ) + (r.fr?.length ?? 0);

/**
 * A deep dive: components valid with its urn; tasks only as the mini question
 * (with a hint ladder, so reveal can end it); at most one interactive
 * component, after 1-2 short text / math blocks.
 */
function checkDeepDive(
  ex: Exercise,
  d: Exercise['deepDives'][number],
  misconceptionIds: ReadonlySet<string>,
  errors: string[],
) {
  const where = `dd:${d.id}`;
  const ctx = deepDiveContext(ex, d);
  const check = (spec: ComponentSpec, at: string) => {
    const r = resolveSpec(spec, ctx.experiment);
    if (!r.ok) {
      errors.push(`${at}: ${spec.component} ${r.reason} (${r.detail})`);
    }
    return r.ok ? componentKind(spec) : undefined;
  };
  const inBlocks = (blocks: readonly Block[]) => {
    for (const b of blocks) {
      if (
        b.type === 'component' &&
        check(b.spec, `${where}/${b.blockId}`) === 'task'
      ) {
        errors.push(
          `${where}/${b.blockId}: a task in a deep dive must be its mini question`,
        );
      } else if (b.type === 'deep_dive') {
        inBlocks(b.blocks);
      }
    }
  };
  inBlocks(d.blocks);
  const mini = d.mini;
  if (mini?.kind === 'component') {
    if (check(mini.component, `${where}/mini`) !== 'task') {
      errors.push(`${where}: a component mini question must be a task`);
    }
    if ((mini.hints ?? []).length === 0) {
      errors.push(`${where}: task components need at least one hint`);
    }
    if (mini.fillsLaw !== undefined || mini.optional) {
      errors.push(
        `${where}: a mini question cannot fill the law or be optional`,
      );
    }
    for (const x of mini.diagnoses ?? []) {
      if (!misconceptionIds.has(x.misconceptionId)) {
        errors.push(`${where}: unknown misconception ${x.misconceptionId}`);
      }
    }
  }
  const componentAt = d.blocks.findIndex(b => b.type === 'component');
  const count =
    d.blocks.filter(b => b.type === 'component').length +
    (mini?.kind === 'component' ? 1 : 0);
  if (count > 1) {
    errors.push(`${where}: at most one interactive component per deep dive`);
  }
  if (count === 1) {
    const before = componentAt >= 0 ? d.blocks.slice(0, componentAt) : d.blocks;
    const textual = before.every(
      b => b.type === 'tutor_text' || b.type === 'math',
    );
    const chars = before.reduce(
      (n, b) => n + (b.type === 'tutor_text' ? richChars(b.text) : 0),
      0,
    );
    if (
      !textual ||
      before.length < 1 ||
      before.length > DEEP_DIVE_TEXT_BLOCKS_MAX ||
      chars > DEEP_DIVE_TEXT_CHARS_MAX
    ) {
      errors.push(
        `${where}: the component needs 1-${DEEP_DIVE_TEXT_BLOCKS_MAX} short text blocks before it (max ${DEEP_DIVE_TEXT_CHARS_MAX} characters)`,
      );
    }
  }
}

/** An EventPicker for `value_eq(v)` fills cell v of an earlier progressive LawBuilder with the same valueFn. */
function checkFillsLaw(
  s: TaskStep,
  steps: readonly Step[],
  where: string,
  errors: string[],
) {
  const target = steps.find(
    t => t.kind === 'component' && t.blockId === s.fillsLaw,
  );
  const props = s.component.props as Record<string, unknown>;
  const event = props.event as
    | { id?: string; args?: { valueFn?: unknown } }
    | undefined;
  const pickerFn = event?.args?.valueFn ?? props.valueFn;
  const ok =
    s.component.component === 'EventPicker' &&
    event?.id === 'value_eq' &&
    target?.kind === 'component' &&
    target.component.component === 'LawBuilder' &&
    target.component.props.mode === 'progressive' &&
    JSON.stringify(target.component.props.valueFn) ===
      JSON.stringify(pickerFn) &&
    steps.indexOf(target) < steps.indexOf(s);
  if (!ok) {
    errors.push(
      `${where}: fillsLaw needs a value_eq EventPicker and an earlier progressive LawBuilder with the same valueFn`,
    );
  }
}

export function loadExercise(
  rawExercise: unknown,
  rawMisconceptions: unknown = [],
): LoadResult {
  const errors: string[] = [];
  const lib = MisconceptionLibrarySchema.safeParse(rawMisconceptions);
  if (!lib.success) {
    return {
      ok: false,
      errors: lib.error.issues.map(
        i => `misconceptions ${i.path.join('.')}: ${i.message}`,
      ),
    };
  }
  const first = ExerciseSchema.safeParse(rawExercise);
  if (!first.success) {
    return {
      ok: false,
      errors: first.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    };
  }
  const ctx: CallContext = first.data.experiment
    ? { experiment: first.data.experiment }
    : {};

  // Named values are about the exercise experiment: a variant with its own urn computes its own.
  for (const v of [...first.data.variants, ...first.data.deepDives]) {
    if (v.experiment) {
      forEachString(v, str => {
        if (str.includes('\\val')) {
          errors.push(
            `${
              'kind' in v ? stepKey.variant(v.id) : stepKey.mini(v.id)
            }: \\val is not allowed with its own experiment`,
          );
        }
      });
    }
  }

  // 1. Named values.
  const values = new Map<string, Fraction>();
  for (const [id, call] of Object.entries(first.data.values ?? {})) {
    const r = runEngineCall(call, ctx);
    if (r.ok) {
      values.set(id, r.value);
    } else {
      errors.push(`values.${id}: ${r.error}`);
    }
  }

  // 2. Substitute \val{id}, then fill numeric option labels.
  const substituted = mapStrings(first.data, (s, key) => {
    if (!s.includes('\\val')) {
      return s;
    }
    return s.replace(VAL, (whole, id: string) => {
      const v = values.get(id);
      if (!v) {
        errors.push(`unknown value \\val{${id}}`);
        return whole;
      }
      return key !== undefined && MATH_KEYS.has(key)
        ? fractionToLatex(v)
        : fractionToPlain(v);
    });
  }) as Exercise;
  for (const { step } of askedSteps(substituted)) {
    if (step.kind !== 'choice') {
      continue;
    }
    for (const o of step.options) {
      if (o.label === undefined && o.value !== undefined) {
        const v = parseNumeric(o.value);
        if (v.ok) {
          o.label = { math: fractionToLatex(v.value) };
        }
      } else if (o.label === undefined && o.set !== undefined) {
        o.label = { math: setLatex(o.set) };
      }
    }
  }
  const second = ExerciseSchema.safeParse(substituted);
  if (!second.success) {
    errors.push(
      ...second.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    );
    return { ok: false, errors };
  }
  const exercise = second.data;

  // 3. Answers, misconception references.
  const misconceptionIds = new Set(lib.data.map(m => m.id));
  const answers = new Map<string, ResolvedAnswer>();
  for (const { key, step, ctx: stepCtx } of askedSteps(exercise)) {
    const resolved = resolveAnswer(
      step,
      step.answer,
      stepCtx ?? ctx,
      errors,
      key,
    );
    if (resolved) {
      answers.set(key, resolved);
    }
    const refs = [
      ...(step.kind === 'choice' ? step.options : step.wrongAnswers ?? []),
    ]
      .map(o => o.misconceptionId)
      .filter((id): id is string => id !== undefined);
    for (const id of refs) {
      if (!misconceptionIds.has(id)) {
        errors.push(`${key}: unknown misconception ${id}`);
      }
    }
    if (
      step.deepDiveId !== undefined &&
      !exercise.deepDives.some(d => d.id === step.deepDiveId)
    ) {
      errors.push(`${key}: unknown deep dive ${step.deepDiveId}`);
    }
    if (step.check && !values.has(step.check.known)) {
      errors.push(
        `${key}: numeric check uses unknown value ${step.check.known}`,
      );
    }
    if ((step.hints ?? []).length === 0) {
      // Rule 6: the answer can only be revealed at the end of a ladder.
      errors.push(`${key}: asked steps need at least one hint`);
    }
  }

  checkComponents(exercise, ctx, misconceptionIds, errors);

  // 4. Every formula renders natively, and nothing is left unresolved.
  forEachString(exercise, (s, key) => {
    if (s.includes('\\val')) {
      errors.push(`unresolved \\val in "${s}"`);
    }
    if (key !== undefined && MATH_KEYS.has(key)) {
      try {
        parseLatexSubset(s);
      } catch (e) {
        errors.push(`formula "${s}": ${(e as Error).message}`);
      }
    }
  });

  return errors.length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        loaded: {
          exercise,
          answers,
          misconceptionIds,
          misconceptions: new Map(lib.data.map(m => [m.id, m])),
          values,
        },
      };
}
