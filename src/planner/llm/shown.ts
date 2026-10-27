/**
 * What the student has been shown so far, and what the current step's answer
 * is, as values and tokens (output guard and tutor checks, CLAUDE.md rules 1, 6).
 *
 * Shown (allowed numbers): the statement, the question goal, the urn, every
 * step up to the current one (text, prompts, options; earlier steps' hints;
 * the current step's hints already used), detours opened on the way, the
 * answers of steps before the current one (they are solved or revealed: the
 * path is linear), and the numeric check when it was shown. Later steps,
 * later hints, the write-up and engine values nobody displayed are NOT shown.
 *
 * Answer tokens (must not appear early): a number answer; a choice answer's
 * correct label; a task component's answer computed by the engine (EventPicker:
 * favorable outcome ids, their count, the probability; LawBuilder: every cell).
 */
import { resolveSpec } from '../../components/registry';
import { stepKey as keyOf, type LoadedExercise } from '../../content/loader';
import type { Experiment } from '../../engine/calls';
import {
  enumerateOutcomes,
  law,
  matchingOutcomes,
  type EventSpec,
  type ValueFn,
} from '../../engine/probability';
import {
  checkEquivalence,
  parseExpression,
  sameForm,
} from '../../engine/expression';
import { frac, type Fraction } from '../../engine/rational';
import type { LessonContent } from '../../lesson/session/lesson';
import { numbersIn } from './numbers';

export const valueKey = ([n, d]: Fraction) => `${n}/${d}`;

export interface ShownAt {
  /** Current step key (main "q/s", mini "dd:x", variant "var:v"), or null. */
  stepKey: string | null;
  hintsUsed: number;
  /** Deep dives and variants opened in this question. */
  deepDivesShown?: readonly string[];
  variantsShown?: readonly string[];
  numericCheckShown?: boolean;
}

/** Strings under a content node, skipping ids, trust and answer specs. */
function strings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    node.forEach(n => strings(n, out));
  } else if (node !== null && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (
        k !== 'id' &&
        k !== 'blockId' &&
        k !== 'trust' &&
        k !== 'answer' &&
        k !== 'wrongAnswers' &&
        k !== 'check'
      ) {
        strings(v, out);
      }
    }
  }
  return out;
}

/** The main step a key belongs to (a mini's or variant's parent), or null. */
export function mainStepOf(
  content: LessonContent,
  key: string | null,
): string | null {
  if (key === null) {
    return null;
  }
  const q = content.question;
  const mains = q.groups.flatMap(g =>
    g.steps.map(s => ({ s, key: keyOf.main(q.id, s.id) })),
  );
  if (mains.some(m => m.key === key)) {
    return key;
  }
  if (key.startsWith('dd:')) {
    const dd = key.slice(3);
    return (
      mains.find(m => 'deepDiveId' in m.s && m.s.deepDiveId === dd)?.key ?? null
    );
  }
  if (key.startsWith('var:')) {
    const v = content.variants.get(key.slice(4));
    return v?.forSteps.find(k => mains.some(m => m.key === k)) ?? null;
  }
  return null;
}

function experimentFor(
  content: LessonContent,
  key: string,
): Experiment | undefined {
  if (key.startsWith('var:')) {
    return (
      content.variants.get(key.slice(4))?.experiment ??
      content.loaded.exercise.experiment
    );
  }
  return content.loaded.exercise.experiment;
}

/** A task component's answer: outcome ids, values (count, probability, cells). */
export function taskAnswer(
  content: LessonContent,
  key: string,
): { ids: string[]; values: Fraction[] } | null {
  const step = content.steps.get(key);
  if (!step || step.kind !== 'component') {
    return null;
  }
  const r = resolveSpec(step.component, experimentFor(content, key));
  if (!r.ok) {
    return null;
  }
  const p = r.props as {
    balls: Parameters<typeof enumerateOutcomes>[0];
    draw: Parameters<typeof enumerateOutcomes>[1];
    k: number;
    valueFn?: ValueFn;
    event?: EventSpec;
  };
  const outcomes = enumerateOutcomes(p.balls, p.draw, p.k);
  if (r.name === 'EventPicker' && p.event) {
    const hit = matchingOutcomes(
      p.event,
      outcomes,
      p.valueFn ? { valueFn: p.valueFn } : {},
    );
    return {
      ids: hit.map(o => o.id),
      values: [frac(hit.length), frac(hit.length, outcomes.length)],
    };
  }
  if (r.name === 'LawBuilder' && p.valueFn) {
    return { ids: [], values: law(p.valueFn, outcomes).map(row => row.p) };
  }
  return null;
}

/** A copy without `hints` (hints count as shown only once used). */
function withoutHints(node: unknown): unknown {
  if (node === null || typeof node !== 'object') {
    return node;
  }
  const copy = { ...(node as Record<string, unknown>) };
  delete copy.hints;
  return copy;
}

function answerValues(
  loaded: LoadedExercise,
  content: LessonContent,
  key: string,
): Fraction[] {
  const a = loaded.answers.get(key);
  if (a?.kind === 'number') {
    return [a.value];
  }
  return taskAnswer(content, key)?.values ?? [];
}

/** Values (as "n/d") the student has been shown at this point. */
export function shownValues(content: LessonContent, at: ShownAt): Set<string> {
  const { loaded, question: q } = content;
  const texts: string[] = [];
  strings(loaded.exercise.statement, texts);
  strings(q.goal, texts);
  const set = new Set<string>();
  for (const b of loaded.exercise.experiment?.urn ?? []) {
    set.add(valueKey(frac(b.value)));
  }
  const parent = mainStepOf(content, at.stepKey);
  const mains = q.groups.flatMap(g => g.steps);
  const upTo =
    parent === null
      ? -1
      : mains.findIndex(m => keyOf.main(q.id, m.id) === parent);
  mains.slice(0, Math.max(0, upTo)).forEach(s => {
    // Steps before the current one: solved or revealed (the path is linear).
    strings(s, texts);
    for (const v of answerValues(loaded, content, keyOf.main(q.id, s.id))) {
      set.add(valueKey(v));
    }
  });
  const current = upTo >= 0 ? mains[upTo] : undefined;
  if (current) {
    // Current step: its text, used hints only, never its answer.
    strings(withoutHints(current), texts);
    const hints = (current as { hints?: unknown[] }).hints ?? [];
    strings(
      hints.slice(0, parent === at.stepKey ? at.hintsUsed : hints.length),
      texts,
    );
  }
  for (const id of at.deepDivesShown ?? []) {
    const dd = loaded.exercise.deepDives.find(d => d.id === id);
    if (dd) {
      strings({ ...dd, mini: undefined }, texts);
      strings(withoutHints(dd.mini), texts);
    }
  }
  for (const id of at.variantsShown ?? []) {
    const v = content.variants.get(id);
    if (v) {
      strings(v.intro, texts);
      strings(withoutHints(v.step), texts);
      for (const b of v.experiment?.urn ?? []) {
        set.add(valueKey(frac(b.value)));
      }
    }
  }
  if (at.numericCheckShown && at.stepKey) {
    const step = content.steps.get(at.stepKey);
    const known =
      step && 'check' in step && step.check
        ? loaded.values.get(step.check.known)
        : undefined;
    if (known) {
      set.add(valueKey(known));
    }
  }
  for (const t of texts) {
    for (const f of numbersIn(t)) {
      set.add(valueKey(f));
    }
  }
  return set;
}

/** The current step's answer in every form that must not appear early. */
export function answerTokensFor(
  content: LessonContent,
  key: string | null,
): { values: Set<string>; texts: string[]; ids: string[] } {
  const values = new Set<string>();
  const texts: string[] = [];
  const ids: string[] = [];
  if (key === null) {
    return { values, texts, ids };
  }
  // Numbers always on screen (urn, statement, goal) are not giveaways on their own.
  const always = shownValues(content, { stepKey: null, hintsUsed: 0 });
  const answer = content.loaded.answers.get(key);
  if (answer?.kind === 'number') {
    values.add(valueKey(answer.value));
  } else if (answer?.kind === 'option') {
    const step = content.steps.get(key);
    const opt =
      step?.kind === 'choice'
        ? step.options.find(o => o.id === answer.optionId)
        : undefined;
    for (const t of strings(opt?.label)) {
      const norm = t.replace(/\s+/g, ' ').trim().toLowerCase();
      if (norm.length >= 4) {
        texts.push(norm);
      }
      for (const f of numbersIn(t)) {
        if (!always.has(valueKey(f))) {
          values.add(valueKey(f));
        }
      }
    }
  }
  const task = taskAnswer(content, key);
  if (task) {
    for (const v of task.values) {
      if (!always.has(valueKey(v))) {
        values.add(valueKey(v));
      }
    }
    ids.push(...task.ids);
  }
  return { values, texts, ids };
}

// ---------------------------------------------------------------------------
// Lines steps (D22): a correct transformed line is the answer.

/** LaTeX (or a typed-like line) -> the safe parser's syntax; null if it has other commands. */
export function latexToLine(latex: string): string | null {
  let s = latex
    .replace(/−/g, '-')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;!: ]/g, '')
    .replace(/\\mathrm\{e\}/g, 'e')
    .replace(/\\times|\\cdot/g, '*');
  // Innermost first: exponent groups and fractions without braces inside.
  for (let i = 0; i < 16 && /[{}]/.test(s); i += 1) {
    const before = s;
    s = s
      .replace(/\^\s*\{([^{}]*)\}/g, (_m, a: string) => `^(${a})`)
      .replace(
        /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
        (_m, a: string, b: string) => `((${a})/(${b}))`,
      )
      .replace(/\{([^{}]*)\}/g, (_m, a: string) => `(${a})`);
    if (s === before) {
      break;
    }
  }
  return /[\\{}]/.test(s) ? null : s.trim();
}

/**
 * Does this text write a correct transformed line of the current lines step
 * (the final line or an intermediate one): an expression in the step's
 * variables, equivalent to the goal by the engine, but not in the start's
 * written form? The start (on the card) and general rules in other letters
 * (e^a e^b = e^{a+b}) are allowed.
 */
export function lineAnswerIn(
  content: LessonContent,
  key: string | null,
  text: string,
): boolean {
  const answer = key === null ? undefined : content.loaded.answers.get(key);
  if (answer?.kind !== 'lines') {
    return false;
  }
  const spec = answer.spec;
  const vars = { variables: spec.variables };
  const goal = parseExpression(spec.goal, vars);
  const start =
    spec.start !== undefined ? parseExpression(spec.start, vars) : null;
  if (!goal.ok) {
    return false;
  }
  const plain = latexToLine(text);
  if (plain === null) {
    return false;
  }
  for (const side of plain.split('=')) {
    const p = parseExpression(side.trim(), vars);
    if (!p.ok || p.variables.length === 0) {
      continue;
    }
    if (start?.ok && sameForm(p.ast, start.ast)) {
      continue;
    }
    const eq = checkEquivalence(p.ast, goal.ast, {
      variables: [...spec.variables],
    });
    if (eq.verdict === 'equivalent') {
      return true;
    }
  }
  return false;
}

/** Numerator and denominator of a quotient (the goal's parts), or []. */
function partsOf(ast: unknown): unknown[] {
  const n = ast as { type?: string; op?: string; left?: unknown; right?: unknown };
  return n.type === 'binary' && n.op === '/' ? [n.left, n.right] : [];
}

/**
 * Does this text write a part of the current lines step's target: an
 * expression equivalent to the goal's numerator or denominator, but not to
 * the start's (2026-10-22: «الإسم الصحيح كان 1 + e^(2x)»)? Only quotient
 * goals have parts.
 */
export function linePartIn(
  content: LessonContent,
  key: string | null,
  text: string,
): boolean {
  const answer = key === null ? undefined : content.loaded.answers.get(key);
  if (answer?.kind !== 'lines') {
    return false;
  }
  const spec = answer.spec;
  const vars = { variables: spec.variables };
  const goal = parseExpression(spec.goal, vars);
  const start =
    spec.start !== undefined ? parseExpression(spec.start, vars) : null;
  if (!goal.ok) {
    return false;
  }
  const goalParts = partsOf(goal.ast);
  const startParts = start?.ok ? partsOf(start.ast) : [];
  if (goalParts.length === 0) {
    return false;
  }
  const plain = latexToLine(text);
  if (plain === null) {
    return false;
  }
  const same = (a: unknown, b: unknown) =>
    checkEquivalence(a as never, b as never, {
      variables: [...spec.variables],
    }).verdict === 'equivalent';
  for (const side of plain.split('=')) {
    const p = parseExpression(side.trim(), vars);
    if (!p.ok || p.variables.length === 0) {
      continue;
    }
    for (let i = 0; i < goalParts.length; i += 1) {
      const startPart = startParts[i];
      if (
        same(p.ast, goalParts[i]) &&
        !(startPart !== undefined && same(p.ast, startPart))
      ) {
        return true;
      }
    }
  }
  return false;
}
