/**
 * Content loader: validates exercise JSON, then makes every shown value come
 * from the engine (CLAUDE.md hard rule 1).
 * - `\val{id}` in math / latex / writeup strings -> the engine value of `values[id]`.
 * - Numeric options get their label from `value`; the correct option is found by engine value.
 * - Parity answers: the correct option is the one stating the engine's parity of the function.
 * - Typed answers resolve to an exact fraction.
 * - Every formula must parse with the native math renderer (no raw-LaTeX fallback in lessons).
 * Never throws on bad content: returns the list of problems.
 */
import { componentKind, resolveSpec } from '../components/registry';
import type { ComponentSpec } from '../components/contract';
import { matchesFn, parity } from '../engine/analysis';
import { runEngineCall, runSetCall, type CallContext } from '../engine/calls';
import { parseExpression } from '../engine/expression';
import type { LinesSpec } from '../lesson/lines/check';
import {
  fractionToLatex,
  fractionToPlain,
  parseNumeric,
} from '../engine/format';
import { equals, type Fraction } from '../engine/rational';
import { runProcedure, type ProcedureId } from '../engine/procedures';
import {
  enumerateOutcomes,
  satisfies,
  type EventSpec,
} from '../engine/probability';
import { parseLatexSubset } from '../lesson/math/latexSubset';
import {
  ExerciseSchema,
  MisconceptionLibrarySchema,
  type AnswerSpec,
  type EngineFnRef,
  type Block,
  type Exercise,
  type KeypadKind,
  type Misconception,
  type Rich,
  type Step,
} from './schema';

export type ResolvedAnswer =
  | { kind: 'option'; optionId: string }
  | {
      kind: 'number';
      value: Fraction;
      /** Known wrong procedures with their engine values, in table order (C2). */
      procedures?: ResolvedProcedure[];
    }
  /** Line-by-line writing: the engine-checked spec the reducer checks lines with. */
  | { kind: 'lines'; spec: LinesSpec };

export interface ResolvedProcedure {
  id: ProcedureId;
  misconceptionId: string;
  values: Fraction[];
}

export type AskedStep = Extract<Step, { kind: 'choice' | 'typed' | 'lines' }>;
export type LinesStep = Extract<Step, { kind: 'lines' }>;
const isAsked = (s: Step): s is AskedStep =>
  s.kind === 'choice' || s.kind === 'typed' || s.kind === 'lines';
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
        if (isAsked(s)) {
          out.push({ key: stepKey.main(q.id, s.id), step: s });
        }
      }
    }
  }
  for (const d of ex.deepDives) {
    if (d.mini && isAsked(d.mini)) {
      out.push({
        key: stepKey.mini(d.id),
        step: d.mini,
        ctx: deepDiveContext(ex, d),
      });
    }
  }
  for (const v of ex.variants) {
    if (isAsked(v.step)) {
      out.push({
        key: stepKey.variant(v.id),
        step: v.step,
        ctx: variantContext(ex, v),
      });
    }
  }
  return out;
}

/**
 * A lines step: every written expression is checked against the engine
 * (start, goal, what a wrong line meant); known wrong lines must really be
 * wrong. Returns the spec the reducer checks lines with.
 */
function resolveLines(
  step: LinesStep,
  errors: string[],
  where: string,
): ResolvedAnswer | null {
  const vars = step.variables;
  const before = errors.length;
  const parses = (src: string, what: string) => {
    const r = parseExpression(src, { variables: vars });
    if (!r.ok) {
      errors.push(`${where}: ${what} does not parse (${r.error.code})`);
    }
    return r.ok;
  };
  const engine = (src: string, ref: EngineFnRef, what: string) => {
    const m = matchesFn(src, ref, vars[0]);
    if (!m.ok) {
      errors.push(
        `${where}: ${what} is not ${ref.fn} (${ref.transform}) by the engine${
          m.at !== undefined ? ` (differs at x = ${m.at})` : ''
        }`,
      );
    }
  };
  if (parses(step.goal, 'goal')) {
    engine(step.goal, step.goalIs, 'goal');
  }
  if (step.start !== undefined) {
    if (!step.startIs) {
      errors.push(`${where}: start needs startIs (engine reference)`);
    } else if (parses(step.start, 'start')) {
      engine(step.start, step.startIs, 'start');
    }
  }
  for (const w of step.knownWrong) {
    if (parses(w.expr, `known wrong ${w.expr}`)) {
      const ok = matchesFn(w.expr, step.goalIs, vars[0]);
      if (ok.ok) {
        errors.push(`${where}: known wrong ${w.expr} equals the goal`);
      }
    }
    if (w.meant !== undefined && parses(w.meant, `meant ${w.meant}`)) {
      engine(w.meant, step.goalIs, `meant ${w.meant}`);
    }
  }
  if (errors.length > before) {
    return null;
  }
  return { kind: 'lines', spec: linesSpecOf(step) };
}

/** What a lines step is checked with (loader, reducer and card share it). */
export function linesSpecOf(step: LinesStep): LinesSpec {
  return {
    variables: step.variables,
    ...(step.start !== undefined && { start: step.start }),
    goal: step.goal,
    knownWrong: step.knownWrong.map(w => ({
      expr: w.expr,
      misconceptionId: w.misconceptionId,
      ...(w.meant !== undefined && { meant: w.meant }),
    })),
  };
}

function resolveAnswer(
  step: AskedStep,
  answer: AnswerSpec | undefined,
  ctx: CallContext,
  errors: string[],
  where: string,
): ResolvedAnswer | null {
  if (step.kind === 'lines' || answer === undefined) {
    return step.kind === 'lines' ? resolveLines(step, errors, where) : null;
  }
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
  if (step.kind === 'choice' && answer.type === 'parity') {
    let computed: ReturnType<typeof parity>;
    try {
      computed = parity(answer.fn);
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`);
      return null;
    }
    const matches = step.options.filter(o => o.parity === computed);
    if (matches.length !== 1) {
      errors.push(
        `${where}: ${matches.length} options state the engine parity ${computed} of ${answer.fn}`,
      );
      return null;
    }
    return { kind: 'option', optionId: matches[0]!.id };
  }
  if (step.kind === 'choice' && answer.type === 'complement') {
    // C1: the option whose event holds exactly the draws outside `of`.
    if (!ctx.experiment) {
      errors.push(`${where}: a complement answer needs an urn`);
      return null;
    }
    const all = enumerateOutcomes(
      ctx.experiment.urn,
      ctx.experiment.draw,
      ctx.experiment.k,
    );
    const ids = (event: EventSpec) =>
      all
        .filter(o => satisfies(event, o))
        .map(o => o.id)
        .join(',');
    const target = all
      .filter(o => !satisfies(answer.of, o))
      .map(o => o.id)
      .join(',');
    const matches = step.options.filter(
      o => o.event !== undefined && ids(o.event) === target,
    );
    if (matches.length !== 1) {
      errors.push(
        `${where}: ${matches.length} options are the complement of the event`,
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

/** The numeric value of a resolved answer (a typed value, or the chosen option's value). */
function numericAnswer(
  step: AskedStep,
  a: ResolvedAnswer | undefined,
): Fraction | undefined {
  if (a?.kind === 'number') {
    return a.value;
  }
  if (a?.kind === 'option' && step.kind === 'choice') {
    const raw = step.options.find(o => o.id === a.optionId)?.value;
    const v = raw === undefined ? null : parseNumeric(raw);
    return v?.ok ? v.value : undefined;
  }
  return undefined;
}

/**
 * C2: each typed step's procedure table, computed by the engine. "Earlier
 * results" are the numeric answers before the step in its part; for a
 * variant, those of the steps it is for, and their own answers.
 */
function resolveProcedures(
  ex: Exercise,
  ctx: CallContext,
  answers: Map<string, ResolvedAnswer>,
  errors: string[],
) {
  const earlier = new Map<string, Fraction[]>();
  const own = new Map<string, Fraction>();
  for (const q of ex.parts) {
    const seen: Fraction[] = [];
    for (const s of q.groups.flatMap(g => g.steps)) {
      if (!isAsked(s)) {
        continue;
      }
      const key = stepKey.main(q.id, s.id);
      earlier.set(key, [...seen]);
      const v = numericAnswer(s, answers.get(key));
      if (v) {
        own.set(key, v);
        seen.push(v);
      }
    }
  }
  for (const v of ex.variants) {
    earlier.set(
      stepKey.variant(v.id),
      v.forSteps.flatMap(f => [
        ...(earlier.get(f) ?? []),
        ...(own.has(f) ? [own.get(f)!] : []),
      ]),
    );
  }
  for (const { key, step, ctx: stepCtx } of askedSteps(ex)) {
    const a = answers.get(key);
    if (
      step.kind !== 'typed' ||
      !step.procedures ||
      a?.kind !== 'number' ||
      step.answer.type !== 'fraction'
    ) {
      continue;
    }
    const resolved: ResolvedProcedure[] = [];
    for (const row of step.procedures) {
      const r = runProcedure(
        row.id,
        step.answer.compute,
        stepCtx ?? ctx,
        earlier.get(key) ?? [],
      );
      if (!r.ok) {
        errors.push(`${key}: procedure ${r.error}`);
        continue;
      }
      if (r.value.some(v => equals(v, a.value))) {
        errors.push(
          `${key}: procedure ${row.id} gives the answer ${fractionToPlain(
            a.value,
          )}`,
        );
        continue;
      }
      resolved.push({
        id: row.id,
        misconceptionId: row.misconceptionId,
        values: r.value,
      });
    }
    answers.set(key, { ...a, procedures: resolved });
  }
}

/**
 * D2: a fresh variant (`afterReveal`) is a transfer on its own urn whose
 * answer cannot be guessed from a step it is for: not that step's answer,
 * not one of its known wrong values (authored or procedure values).
 */
function checkFreshVariants(
  ex: Exercise,
  answers: ReadonlyMap<string, ResolvedAnswer>,
  errors: string[],
) {
  const asked = new Map(askedSteps(ex).map(a => [a.key, a.step]));
  for (const v of ex.variants.filter(x => x.afterReveal)) {
    const key = stepKey.variant(v.id);
    if (v.kind !== 'transfer') {
      errors.push(`${key}: a fresh variant must be a transfer`);
    }
    if (v.experiment === undefined) {
      errors.push(`${key}: a fresh variant needs its own urn`);
    }
    const a = answers.get(key);
    if (a?.kind === 'option' && v.step.kind === 'choice') {
      checkFreshChoice(
        key,
        v.step,
        a.optionId,
        v.forSteps,
        asked,
        answers,
        errors,
      );
    }
    const value = freshValue(v.step, a);
    if (!value) {
      continue;
    }
    const plain = fractionToPlain(value);
    for (const parentKey of v.forSteps) {
      const p = answers.get(parentKey);
      const pv = asked.get(parentKey)
        ? freshValue(asked.get(parentKey)!, p)
        : undefined;
      if (pv && equals(pv, value)) {
        errors.push(
          `${key}: the answer ${plain} equals the answer of ${parentKey}`,
        );
      }
      const step = asked.get(parentKey);
      const wrong = [
        ...(step?.kind === 'typed' ? step.wrongAnswers ?? [] : []).flatMap(
          w => {
            const x = parseNumeric(w.value);
            return x.ok ? [x.value] : [];
          },
        ),
        ...(step?.kind === 'choice' ? step.options : [])
          .filter(o => p?.kind !== 'option' || o.id !== p.optionId)
          .flatMap(o => {
            const x = o.value === undefined ? null : parseNumeric(o.value);
            return x?.ok ? [x.value] : [];
          }),
        ...(p?.kind === 'number' ? p.procedures ?? [] : []).flatMap(
          x => x.values,
        ),
      ];
      if (wrong.some(w => equals(w, value))) {
        errors.push(
          `${key}: the answer ${plain} equals a known wrong value of ${parentKey}`,
        );
      }
    }
  }
}

/** A step's numeric answer: a typed value, or the chosen option's value. */
function freshValue(
  step: AskedStep | Step,
  a: ResolvedAnswer | undefined,
): Fraction | undefined {
  if (a?.kind === 'number') {
    return a.value;
  }
  if (a?.kind === 'option' && step.kind === 'choice') {
    const raw = step.options.find(o => o.id === a.optionId)?.value;
    const x = raw === undefined ? null : parseNumeric(raw);
    return x?.ok ? x.value : undefined;
  }
  return undefined;
}

/** C1: a fresh choice's correct option must not repeat its parent's (same words). */
function checkFreshChoice(
  key: string,
  step: Extract<Step, { kind: 'choice' }>,
  optionId: string,
  forSteps: readonly string[],
  asked: ReadonlyMap<string, AskedStep>,
  answers: ReadonlyMap<string, ResolvedAnswer>,
  errors: string[],
) {
  const words = (o: { label?: unknown } | undefined) =>
    o?.label === undefined ? undefined : JSON.stringify(o.label);
  const mine = words(step.options.find(o => o.id === optionId));
  for (const parentKey of forSteps) {
    const parent = asked.get(parentKey);
    const pa = answers.get(parentKey);
    if (parent?.kind !== 'choice' || pa?.kind !== 'option') {
      continue;
    }
    const theirs = words(parent.options.find(o => o.id === pa.optionId));
    if (mine !== undefined && mine === theirs) {
      errors.push(
        `${key}: the correct option repeats the answer of ${parentKey}`,
      );
    }
  }
}

const sortedSet = (xs: readonly number[]) =>
  [...new Set(xs)].sort((a, b) => a - b);

/** `{-2 ; -1 ; 0 ; 2}` */
const setLatex = (xs: readonly number[]) =>
  `\\{${sortedSet(xs).join(' ; ')}\\}`;

/**
 * E3: a LawChart in content that gives its `law` must name it (`law.of`), so
 * the engine recomputes every row; a container's inner specs are checked too.
 */
function checkLawCharts(spec: ComponentSpec, where: string, errors: string[]) {
  const props = (spec.props ?? {}) as Record<string, unknown>;
  if (spec.component === 'LawChart') {
    const law = props.law as { of?: unknown } | undefined;
    if (law !== undefined && law.of === undefined) {
      errors.push(
        `${where}: a LawChart law in content needs law.of (checked by the engine)`,
      );
    }
  }
  for (const v of Object.values(props)) {
    if (
      v !== null &&
      typeof v === 'object' &&
      typeof (v as { component?: unknown }).component === 'string'
    ) {
      checkLawCharts(v as ComponentSpec, where, errors);
    }
  }
}

/** Every component spec must render: registered name, props valid for this exercise. */
function checkComponents(
  ex: Exercise,
  ctx: CallContext,
  misconceptionIds: ReadonlySet<string>,
  errors: string[],
) {
  const check = (spec: ComponentSpec, where: string) => {
    checkLawCharts(spec, where, errors);
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
      checkLawCharts(spec, at, errors);
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
    checkLawCharts(spec, at, errors);
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
      'answer' in step ? step.answer : undefined,
      stepCtx ?? ctx,
      errors,
      key,
    );
    if (resolved) {
      answers.set(key, resolved);
    }
    const refs = [
      ...(step.kind === 'choice'
        ? step.options
        : step.kind === 'lines'
        ? step.knownWrong
        : [...(step.wrongAnswers ?? []), ...(step.procedures ?? [])]),
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
    if ('link' in step && step.link) {
      if (!values.has(step.link.resultRef)) {
        errors.push(`${key}: link uses unknown value ${step.link.resultRef}`);
      }
      if (step.link.text.math !== undefined) {
        errors.push(
          `${key}: link text has math (the value comes from the engine)`,
        );
      }
    }
    if ('check' in step && step.check && !values.has(step.check.known)) {
      errors.push(
        `${key}: numeric check uses unknown value ${step.check.known}`,
      );
    }
    if ((step.hints ?? []).length === 0) {
      // Rule 6: the answer can only be revealed at the end of a ladder.
      errors.push(`${key}: asked steps need at least one hint`);
    }
  }

  resolveProcedures(exercise, ctx, answers, errors);
  checkFreshVariants(exercise, answers, errors);
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
