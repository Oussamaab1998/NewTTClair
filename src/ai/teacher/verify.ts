/**
 * Every teacher answer is checked here before the student sees it; a refused
 * answer goes back to the model once with the reasons (src/ai/teacher/teacher.ts).
 * Reuses the lesson's checks (src/ai/verify/message.ts) and adds the
 * teacher's own:
 * 1. ar blocks: Tunisian words only (the lesson's list and the teacher's),
 *    French words isolated (isolateLlmRuns), and no letter, digit, symbol or
 *    formula inside an Arabic sentence (a formula is its own math block).
 * 2. math blocks: parse with the app's renderer, no Arabic, no words
 *    (wordsInMath), no "?" (a blank to fill is a question), every "=" true.
 * 3. The open question of the lesson: no value he has not found yet (in any
 *    block), and on a tree no calculation that is the road to one.
 * 4. It never ends with a question: a question at the end is cut off (the
 *    screen gives «فهمت ✓» / «مازال ما فهمتش»); an answer that is only a
 *    question is refused. A question mark elsewhere is kept (a rhetorical
 *    «علاش\u061F» before its answer).
 * The model never decides what is right: the numbers it shows are checked
 * with the engine, and its examples' numbers are its own.
 */
import type { Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { isolateLlmRuns, type ArRuns } from '../../lesson/rich/runs';
import { numbersIn } from '../../planner/llm/numbers';
import { latexToPlain } from '../../tutor/verify';
import { mathSegments } from '../checks/freeText';
import { plain } from '../checks/lines';
import { bannedIn } from '../prompt/lexicon';
import {
  falseEquality,
  forbiddenValues,
  fractionNumbers,
  leakedRoad,
  lineOperators,
  wordsInMath,
  type VerifyContext,
} from '../verify/message';
import { teacherBannedIn } from './prompt';
import type { TeacherBlockIn } from './tool';
import type { TeacherBlock } from './types';

export type TeacherVerdict =
  | { ok: true; blocks: TeacherBlock[] }
  | { ok: false; reasons: string[] };

const ARABIC = /[\u0600-\u06FF]/;
const QUESTION = /[?\u061F]/;
/** A sentence ending with a question mark, at the end of a text. */
const LAST_QUESTION = /[^.!\u061F?\n]*[?\u061F]\s*$/;
const DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/;
/** Whole French words: letters (accents, apostrophes, hyphens), two letters at least. */
const FRENCH_WORDS =
  /^(?:[A-Za-zÀ-ÿ]{2,}(?:['\u2019-][A-Za-zÀ-ÿ]+)*)(?:\s+[A-Za-zÀ-ÿ]{2,}(?:['\u2019-][A-Za-zÀ-ÿ]+)*)*$/;
/** All characters of Arabic text, longest answer (a phone screen and a half). */
export const TEACHER_AR_MAX = 1_400;

/** A run left to right inside an Arabic sentence that is not French words (A, p(A), x²). */
const notWords = (run: string): boolean =>
  !FRENCH_WORDS.test(run.trim()) ||
  // AB, ABC, QCM: points and labels, not words.
  run
    .trim()
    .split(/\s+/)
    .some(w => w.length <= 3 && w === w.toUpperCase());

/**
 * An answer whose last text ends with a question: that question cut off
 * (the sentence, or the whole block when it is only the question). Math
 * blocks after it go too (they belong to the question). Returns the blocks
 * unchanged when nothing ends with a question.
 */
export function cutTrailingQuestion(
  blocks: readonly TeacherBlockIn[],
): TeacherBlockIn[] {
  const out = [...blocks];
  for (;;) {
    let i = out.length - 1;
    while (i >= 0 && out[i]!.type === 'math') {
      i -= 1;
    }
    const b = out[i];
    if (!b || b.type === 'math' || !QUESTION.test(b.text.trim().slice(-1))) {
      return out;
    }
    const rest = b.text.replace(LAST_QUESTION, '').trim();
    out.splice(i);
    if (rest !== '' && /[^\s.,:;!\u060C]/.test(rest)) {
      out.push({ ...b, text: rest });
    }
  }
}

/** Numbers of a formula: a fraction is one value on a tree, its parts elsewhere. */
function formulaNumbers(latex: string, tree: boolean): Fraction[] {
  if (tree) {
    return fractionNumbers(latex);
  }
  return numbersIn(latexToPlain(latex.replace(/\\neq|\\ne\b/g, '#')) ?? latex);
}

export function verifyTeacher(
  input: readonly TeacherBlockIn[],
  c: VerifyContext | null,
): TeacherVerdict {
  const reasons: string[] = [];
  const blocks = cutTrailingQuestion(input);
  if (blocks.length === 0 || blocks.every(b => b.type === 'math')) {
    return {
      ok: false,
      reasons: [
        'the answer is only a question or a formula: explain in darija sentences, and never end with a question',
      ],
    };
  }
  const tree = c?.pack.domain === 'tree';
  const forbidden = c ? forbiddenValues(c, Number.POSITIVE_INFINITY) : [];
  const leak = (where: string, values: Fraction[]) => {
    for (const v of values) {
      const f = forbidden.find(x => sameRat(x.value, v));
      if (f) {
        reasons.push(
          `${where}: ${plain(v)} is the value of "${
            f.node
          }" in his exercise, which he has not found yet. Use numbers of your own and leave the step to him.`,
        );
      }
    }
  };
  const road = (where: string, calculation: string) => {
    const node = c
      ? leakedRoad(c, calculation, Number.POSITIVE_INFINITY)
      : null;
    if (node) {
      reasons.push(
        `${where}: "${calculation}" is the calculation of "${node}" in his exercise, which he has not done yet. Explain the method with numbers of your own.`,
      );
    }
  };
  const out: TeacherBlock[] = [];
  let arChars = 0;

  blocks.forEach((b, i) => {
    const where = `block ${i + 1}`;
    switch (b.type) {
      case 'ar': {
        arChars += b.text.length;
        for (const x of bannedIn(b.text)) {
          reasons.push(
            `${where}: «${x.phrase}» is not Tunisian; say «${x.use}»`,
          );
        }
        for (const x of teacherBannedIn(b.text)) {
          reasons.push(`${where}: never «${x.word}» (${x.use})`);
        }
        if (DIGIT.test(b.text)) {
          reasons.push(
            `${where}: a digit inside an Arabic sentence; put the number or the formula in its own math block`,
          );
          break;
        }
        const runs: ArRuns | null = isolateLlmRuns([{ ar: b.text }]);
        if (!runs) {
          reasons.push(
            `${where}: LaTeX, a bidi control or a formula inside an Arabic sentence; put the formula in its own math block`,
          );
          break;
        }
        const symbols = runs.filter(r => 'fr' in r && notWords(r.fr));
        if (symbols.length > 0) {
          reasons.push(
            `${where}: ${symbols
              .map(r => `"${'fr' in r ? r.fr : ''}"`)
              .join(
                ', ',
              )} inside an Arabic sentence; say it in words, or put the symbol in its own math block`,
          );
          break;
        }
        out.push({ type: 'ar', runs });
        break;
      }
      case 'fr': {
        if (ARABIC.test(b.text)) {
          reasons.push(`${where}: Arabic inside a French block`);
          break;
        }
        leak(where, tree ? fractionNumbers(b.text) : numbersIn(b.text));
        for (const seg of mathSegments(b.text)) {
          road(where, seg);
          if (falseEquality(seg.replace(/×/g, '*'))) {
            reasons.push(`${where}: "${seg}" is false`);
          }
        }
        out.push({ type: 'fr', text: b.text });
        break;
      }
      case 'math': {
        if (ARABIC.test(b.latex)) {
          reasons.push(`${where}: Arabic inside a math block`);
          break;
        }
        const words = wordsInMath(b.latex);
        if (words.length > 0) {
          reasons.push(
            `${where}: words in a math block (${words
              .map(w => `"${w}"`)
              .join(
                ', ',
              )}); a math block holds the formula only, its words go in an ar or fr block`,
          );
          break;
        }
        if (QUESTION.test(b.latex)) {
          reasons.push(
            `${where}: a question mark in a formula; give the whole example, never a blank for him to fill`,
          );
          break;
        }
        try {
          parseLatexSubset(b.latex);
        } catch {
          reasons.push(
            `${where}: the formula does not parse; use plain LaTeX (\\frac, \\times, \\cap, \\overline, ^, _) and write a conditional with a slash, p(F/A), never \\mid`,
          );
          break;
        }
        const formula = tree ? lineOperators(b.latex) : b.latex;
        if (falseEquality(formula)) {
          reasons.push(
            `${where}: "${b.latex}" is false; every "=" must be true`,
          );
        }
        leak(where, formulaNumbers(b.latex, tree));
        // Each side of the formula on its own: a label (p(A) = ...) is not a calculation.
        for (const side of formula.split('=')) {
          const p = latexToPlain(side);
          if (p !== null && p !== '') {
            road(where, p);
          }
        }
        out.push({ type: 'math', latex: b.latex });
        break;
      }
    }
  });

  if (arChars > TEACHER_AR_MAX) {
    reasons.push(
      'the answer is too long for a phone: keep the meaning, one example and the idea, in shorter sentences',
    );
  }
  return reasons.length > 0
    ? { ok: false, reasons }
    : { ok: true, blocks: out };
}
