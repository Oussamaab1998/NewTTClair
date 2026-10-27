/**
 * Output guard for LLM planner decisions (docs/PLANNER.md "Safeguards",
 * CLAUDE.md rules 1, 6, 7). Runs after schema + content validation; any
 * reason rejects the whole decision (-> rules). Reasons are our own short
 * codes, logged in `llm_call.reasons` and counted by the replay.
 *
 * - numbers: every number in text / math must be one the student has already
 *   been shown (shown.ts: the statement, steps up to the current one, used
 *   hints, opened detours, answers of steps already done) or the student's
 *   own value; later steps' answers are not allowed. Fractions are compared as
 *   values (3/10 = 0,3).
 * - no final answer early: the current step's answer must not appear while
 *   hints are left (and nothing revealed it): a number (also in words), a
 *   choice's correct label or its own words, the step's authored solution
 *   phrases in French or Arabic (solutionConcepts.ts, D16), a task
 *   component's answer (favorable outcome ids, their count, the
 *   probability, law cells), or for a lines step a correct transformed line
 *   (equivalent to the goal, not the start's form; D22).
 * - lines: the student's line and the engine's values at the checked point
 *   are allowed numbers.
 * - hint: only the next level.
 * - one idea: at most 3 blocks, each text at most 240 characters.
 * - math must parse with the app's renderer.
 * - components: only those offered for the step's skills.
 * - the student must act: explanations need an active card to come back to.
 */
import type { ComponentName } from '../../components/contract';
import type { Rich } from '../../content/schema';
import type { LessonContent } from '../../lesson/session/lesson';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import type { Action, Decision } from '../schema';
import type { Situation } from '../situation';
import type { Fraction } from '../../engine/rational';
import { numbersIn } from './numbers';
import { lineAnswerIn, linePartIn, shownValues, valueKey } from './shown';
import { LLM_PROPS_EXCLUDED } from './plannerFormat';
import { revealsAnswer } from './revealing';
import {
  formulaLeak,
  leaksSolution,
  listsOptions,
  matchTokens,
  solutionConcepts,
} from './solutionConcepts';

export const GUARD_LIMITS = { blocks: 3, textChars: 240 };

export interface GuardContext {
  content: LessonContent;
  situation: Situation;
  /** Components the request offered (filtered schema). */
  offered: readonly ComponentName[];
}

export interface GuardResult {
  ok: boolean;
  reasons: string[];
}

const key = valueKey;

export { numbersIn } from './numbers';

function richTexts(r: Rich | undefined): string[] {
  if (!r) {
    return [];
  }
  const out: string[] = [];
  if (r.ar) {
    out.push(r.ar.map(run => ('ar' in run ? run.ar : run.fr)).join(''));
  }
  if (r.fr) {
    out.push(r.fr);
  }
  if (r.math) {
    out.push(r.math);
  }
  return out;
}

/** All texts and formulas an action would show, and which of them are LaTeX. */
function shown(a: Action): {
  texts: string[];
  latex: string[];
  /** Each French run / French text on its own (a formula can hide in one). */
  pieces: string[];
  blocks: number;
} {
  const texts: string[] = [];
  const latex: string[] = [];
  const pieces: string[] = [];
  const addRich = (r: Rich) => {
    texts.push(...richTexts(r));
    if (r.math) {
      latex.push(r.math);
    }
    for (const run of r.ar ?? []) {
      if ('fr' in run) {
        pieces.push(run.fr);
      }
    }
    if (r.fr) {
      pieces.push(r.fr);
    }
  };
  switch (a.kind) {
    case 'show_component':
      addRich(a.instruction);
      return { texts, latex, pieces, blocks: 1 };
    case 'explain':
    case 'example':
      for (const b of a.blocks) {
        if (b.type === 'tutor_text') {
          addRich(b.text);
        } else if (b.type === 'math') {
          texts.push(b.latex);
          latex.push(b.latex);
        } else if (b.type === 'recap') {
          b.items.forEach(addRich);
        }
      }
      return { texts, latex, pieces, blocks: a.blocks.length };
    case 'ask_clarify':
      a.options.forEach(addRich);
      return { texts, latex, pieces, blocks: 1 };
    default:
      return { texts, latex, pieces, blocks: 0 };
  }
}

/** Every text and formula a decision would show (simulation report: near misses). */
export function decisionTexts(d: Decision): string[] {
  return [d.next, ...(d.followUp ? [d.followUp] : [])].flatMap(a => {
    const x = shown(a);
    return [...x.texts, ...x.pieces];
  });
}

/** Props the model may not set (plannerFormat LLM_PROPS_EXCLUDED), also inside containers. */
function excludedPropsIn(spec: {
  component: string;
  props?: Record<string, unknown>;
}): boolean {
  const banned = LLM_PROPS_EXCLUDED[spec.component as ComponentName] ?? [];
  const props = spec.props ?? {};
  if (banned.some(k => k in props)) {
    return true;
  }
  return Object.values(props).some(
    v =>
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof (v as { component?: unknown }).component === 'string' &&
      excludedPropsIn(v as { component: string }),
  );
}

/**
 * Praise or "close" about a wrong value (live run: «25 قريبة برشا» for 10):
 * a praise / closeness word and one of the student's wrong values in the
 * same text. Naming the value without judging it stays allowed.
 */
const PRAISE = [['برافو'], ['ممتاز'], ['مزيان'], ['bravo'], ['excellent']];
/** "Close" / "almost": about a wrong answer, never true (the engine says right or wrong). */
const CLOSE = [
  ['قريبه'],
  ['قريب'],
  ['قربت'],
  ['تقريبا'],
  ['موش', 'بعيد'],
  ['مش', 'بعيد'],
  ['proche'],
  ['presque'],
  ['pas', 'loin'],
];
const has = (tokens: string[], list: string[][]) =>
  list.some(p => tokens.some((_, i) => p.every((w, j) => tokens[i + j] === w)));

/**
 * Praise next to one of the student's wrong values, or any "close" /
 * "almost" while the student's last answer is wrong (2026-10-22: «إنت قريب»).
 * Praise of an earlier, verified step stays allowed.
 */
export function praisesWrongValue(
  text: string,
  wrong: readonly Fraction[],
  lastWrong = false,
): boolean {
  const tokens = matchTokens(text);
  if (lastWrong && has(tokens, CLOSE)) {
    return true;
  }
  if (wrong.length === 0 || !has(tokens, [...PRAISE, ...CLOSE])) {
    return false;
  }
  const keys = new Set(wrong.map(f => key(f)));
  return numbersIn(text).some(f => keys.has(key(f)));
}

/** English words the model put in French runs (simulations 1-2). A list. */
const ENGLISH = new Set([
  'order',
  'slider',
  'pairs',
  'event',
  'events',
  'simultaneous',
  'draw',
  'draws',
  'ball',
  'balls',
  'outcome',
  'outcomes',
]);
export function englishIn(text: string): boolean {
  return matchTokens(text).some(t => ENGLISH.has(t));
}

/** «الكورة» (a ball) said of a curve: only in an exercise with no urn. */
export function ballWordIn(text: string): boolean {
  return matchTokens(text).some(t => t === 'كوره' || t === 'الكوره');
}

/** Every string inside a component's props, Rich texts joined (ids and enum fields left out). */
const NOT_TEXT = new Set([
  'component',
  'fn',
  'compareFn',
  'valueFn',
  'id',
  'mode',
  'colorBy',
  'layout',
  'direction',
  'type',
  'templateId',
  'symbol',
  'selected',
  'highlight',
  'event',
  'template',
  'compare',
]);
function propsStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    node.forEach(n => propsStrings(n, out));
  } else if (node !== null && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (Array.isArray(o.ar)) {
      out.push(
        (o.ar as ({ ar: string } | { fr: string })[])
          .map(r => ('ar' in r ? r.ar : r.fr))
          .join(''),
      );
    }
    for (const [k, v] of Object.entries(o)) {
      if (!NOT_TEXT.has(k) && k !== 'ar') {
        propsStrings(v, out);
      }
    }
  }
  return out;
}

/** NumericTwin expressions with its letter written as x (also inside containers). */
function twinExpressions(spec: {
  component: string;
  props?: Record<string, unknown>;
}): string[] {
  const p = spec.props ?? {};
  const out: string[] = [];
  if (spec.component === 'NumericTwin' && typeof p.symbol === 'string') {
    const letter = new RegExp(`(?<![A-Za-z])${p.symbol}(?![A-Za-z])`, 'g');
    for (const k of ['template', 'compare']) {
      const v = p[k];
      if (typeof v === 'string') {
        out.push(p.symbol === 'x' ? v : v.replace(letter, 'x'));
      }
    }
  }
  for (const v of Object.values(p)) {
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof (v as { component?: unknown }).component === 'string'
    ) {
      out.push(...twinExpressions(v as { component: string }));
    }
  }
  return out;
}

/** An outcome id ("b-c") as a token of its own in a text. */
function mentionsId(text: string, id: string): boolean {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_-])${esc}([^A-Za-z0-9_-]|$)`).test(text);
}

export function guardDecision(d: Decision, g: GuardContext): GuardResult {
  const reasons = new Set<string>();
  const { situation: s } = g;
  const allowed = shownValues(g.content, {
    stepKey: s.step.key,
    hintsUsed: s.step.hintsUsed,
    deepDivesShown: s.question.deepDivesShown,
    variantsShown: s.question.variantsShown,
    numericCheckShown: s.decisions.some(x => x.kind === 'numeric_check'),
  });
  for (const w of s.step.wrongValues) {
    for (const f of w.value ? numbersIn(w.value) : []) {
      allowed.add(key(f));
    }
  }
  for (const f of s.step.last?.value ? numbersIn(s.step.last.value) : []) {
    allowed.add(key(f));
  }
  // Lines: the student's own line and the engine's values at the checked
  // point (shown on the card), also rounded as a tutor would write them.
  const line = s.step.line;
  for (const f of line?.raw ? numbersIn(line.raw) : []) {
    allowed.add(key(f));
  }
  if (line?.at) {
    for (const v of [line.at.x, line.at.student, line.at.expected]) {
      for (const digits of [0, 1, 2, 3, 4]) {
        for (const f of numbersIn(v.toFixed(digits))) {
          allowed.add(key(f));
        }
      }
    }
  }
  const hintsLeft = s.step.hintsUsed < s.step.hintCount && !s.step.revealed;
  // The student's wrong values (praise or "close" about them is rejected).
  const wrong = s.step.wrongValues.flatMap(w =>
    w.value ? numbersIn(w.value) : [],
  );
  const early = hintsLeft
    ? solutionConcepts(g.content, s.step.key, { hintsUsed: s.step.hintsUsed })
    : null;
  // The student's last answer was wrong: no "close" or "almost" about it.
  const lastWrong =
    s.trigger === 'line_invalid' ||
    (s.step.last !== undefined && !s.step.last.correct) ||
    s.step.line?.verdict === 'wrong';

  for (const a of [d.next, ...(d.followUp ? [d.followUp] : [])]) {
    if (a.kind === 'hint') {
      const expected = s.step.hintsUsed + 1;
      if (a.level !== expected || a.level > s.step.hintCount) {
        reasons.add('hint_level');
      }
    }
    if (
      a.kind === 'show_component' &&
      !g.offered.includes(a.component.component as ComponentName)
    ) {
      reasons.add('component_not_offered');
    }
    // An unreadable line: say what is wrong (explain) or the next hint, nothing else.
    if (
      s.trigger === 'line_invalid' &&
      a.kind !== 'explain' &&
      a.kind !== 'hint'
    ) {
      reasons.add('action_not_allowed');
    }
    if (a.kind === 'show_component') {
      if (excludedPropsIn(a.component)) {
        reasons.add('props_not_allowed');
      }
      // Every string inside the props (options, labels, insight, captions,
      // NumericTwin expressions) gets the same answer checks as the text.
      if (hintsLeft && early) {
        for (const t of propsStrings(a.component)) {
          const nums = numbersIn(t);
          if (
            nums.some(f => early.values.has(key(f))) ||
            leaksSolution(early, t) ||
            lineAnswerIn(g.content, s.step.key, t) ||
            linePartIn(g.content, s.step.key, t)
          ) {
            reasons.add('props_leak');
          }
        }
        for (const x of twinExpressions(a.component)) {
          if (
            lineAnswerIn(g.content, s.step.key, x) ||
            linePartIn(g.content, s.step.key, x)
          ) {
            reasons.add('props_leak');
          }
        }
      }
      if (
        hintsLeft &&
        revealsAnswer(g.content, s.step.key, a.component) !== null
      ) {
        reasons.add('component_reveals_answer');
      }
    }
    if (
      (a.kind === 'explain' || a.kind === 'example') &&
      s.step.scope === 'unknown'
    ) {
      reasons.add('no_student_action');
    }
    const { texts, latex, pieces, blocks } = shown(a);
    if (blocks > GUARD_LIMITS.blocks) {
      reasons.add('too_many_blocks');
    }
    if (a.kind === 'explain' || a.kind === 'example') {
      for (const b of a.blocks) {
        if (
          b.type === 'tutor_text' &&
          richTexts(b.text).join(' ').length > GUARD_LIMITS.textChars
        ) {
          reasons.add('text_too_long');
        }
      }
    }
    for (const l of latex) {
      try {
        parseLatexSubset(l);
      } catch {
        reasons.add('latex_unparseable');
      }
    }
    if (
      hintsLeft &&
      [...texts, ...pieces].some(t => lineAnswerIn(g.content, s.step.key, t))
    ) {
      reasons.add('final_answer_early');
    }
    if (
      hintsLeft &&
      [...texts, ...pieces].some(t => linePartIn(g.content, s.step.key, t))
    ) {
      reasons.add('target_part');
    }
    for (const t of [...texts, ...pieces]) {
      const f = formulaLeak(g.content, s.step.key, t, s.step.hintsUsed);
      if (f === 'method_early' || (f === 'formula_answer' && hintsLeft)) {
        reasons.add(f);
      }
    }
    if (pieces.some(englishIn)) {
      reasons.add('english_word');
    }
    if (!g.content.loaded.exercise.experiment && texts.some(ballWordIn)) {
      reasons.add('wrong_word');
    }
    for (const t of texts) {
      for (const f of numbersIn(t)) {
        if (early?.values.has(key(f))) {
          reasons.add('final_answer_early');
        } else if (!allowed.has(key(f))) {
          reasons.add('number_not_allowed');
        }
      }
      if (praisesWrongValue(t, wrong, lastWrong)) {
        reasons.add('praise_wrong_value');
      }
      if (early && listsOptions(early, t)) {
        // The answer named among the options still gives it away (D16).
        reasons.add('option_list');
      } else if (
        early &&
        (leaksSolution(early, t) || early.ids.some(id => mentionsId(t, id)))
      ) {
        reasons.add('final_answer_early');
      }
    }
  }
  return { ok: reasons.size === 0, reasons: [...reasons].sort() };
}
