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
 *   hints are left (and nothing revealed it): a number, a choice's correct
 *   label, or a task component's answer (favorable outcome ids, their count,
 *   the probability, law cells).
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
import { numbersIn } from './numbers';
import { answerTokensFor, shownValues, valueKey } from './shown';

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
  blocks: number;
} {
  const texts: string[] = [];
  const latex: string[] = [];
  const addRich = (r: Rich) => {
    texts.push(...richTexts(r));
    if (r.math) {
      latex.push(r.math);
    }
  };
  switch (a.kind) {
    case 'show_component':
      addRich(a.instruction);
      return { texts, latex, blocks: 1 };
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
      return { texts, latex, blocks: a.blocks.length };
    case 'ask_clarify':
      a.options.forEach(addRich);
      return { texts, latex, blocks: 1 };
    default:
      return { texts, latex, blocks: 0 };
  }
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
  const early =
    s.step.hintsUsed < s.step.hintCount && !s.step.revealed
      ? answerTokensFor(g.content, s.step.key)
      : null;

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
    if (
      (a.kind === 'explain' || a.kind === 'example') &&
      s.step.scope === 'unknown'
    ) {
      reasons.add('no_student_action');
    }
    const { texts, latex, blocks } = shown(a);
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
    for (const t of texts) {
      for (const f of numbersIn(t)) {
        if (early?.values.has(key(f))) {
          reasons.add('final_answer_early');
        } else if (!allowed.has(key(f))) {
          reasons.add('number_not_allowed');
        }
      }
      const norm = t.replace(/\s+/g, ' ').trim().toLowerCase();
      if (
        early?.texts.some(x => norm.includes(x)) ||
        early?.ids.some(id => mentionsId(t, id))
      ) {
        reasons.add('final_answer_early');
      }
    }
  }
  return { ok: reasons.size === 0, reasons: [...reasons].sort() };
}
