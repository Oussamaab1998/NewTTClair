/**
 * Every ask_student call is checked here before the student sees anything.
 * A rejection goes back to the model as an is_error result with the reasons,
 * and it writes the message again. Checks, in order:
 * 1. Shape and right-to-left: Arabic text is split into isolated runs
 *    (isolateLlmRuns); LaTeX, a bidi control or a long formula inside Arabic
 *    text is refused; a run of one repeated character is refused.
 * 2. Math blocks parse with the app's renderer; no Arabic and no words
 *    inside (wordsInMath: «3 people in A∩F» is refused).
 * 3. Provenance: every number above 10 comes from the statement, his lines,
 *    or an engine result this session. A false "=" in a math block is refused.
 * 4. Leak: a value of the question's graph he has not earned yet is refused,
 *    unless he already tried that node 3 times.
 * 5. Notation: C(n,k) only after he computed the gating node himself.
 * 6. One question per message; no line id (L1) and no non-Tunisian word
 *    (src/ai/prompt/lexicon.ts) in what he reads; at most one run of ball
 *    labels or letter groups in an Arabic sentence (more are scrambled).
 * 7. Inputs: a component resolves in the registry and reveals no unearned
 *    value; a list case exists and is small; choice options pass 3 and 4.
 * On a tree question (the pack's domain) checks 3 and 4 read a fraction as
 * ONE value (`\frac{5}{12}`, `5/12`: never 5 and 12), allowed when that
 * value is given (the figure's fractions and his earlier results count),
 * his own, or an engine result; and a calculation written as the road to a
 * node he has not earned is refused whatever its value (several values of a
 * tree are equal: the value alone would let the how through).
 */
import type { Experiment } from '../../engine/calls';
import { REGISTRY, resolveSpec } from '../../components/registry';
import { revealedByRules } from '../../components/reveals';
import type { ComponentName } from '../../components/contract';
import { frac, type Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { factorBag, leaves, sameBag } from '../../method/factorForm';
import type { GraphNode } from '../../method/graph';
import { isLiteralValue, lineLatex } from '../../method/lineChain';
import { sumTerms } from '../../method/mutations';
import { isolateLlmRuns, type ArRuns } from '../../lesson/rich/runs';
import { numbersIn } from '../../planner/llm/numbers';
import { latexToPlain } from '../../tutor/verify';
import { mathSegments } from '../checks/freeText';
import { plain, readLine } from '../checks/lines';
import { bannedIn } from '../prompt/lexicon';
import type { QuestionPack } from '../packs/build';
import type { SessionRuntime } from '../session/state';
import { boxValues, caseExperiment } from '../session/state';
import type { AskStudent } from '../tools/schemas';

/** What the screen renders: blocks with their text made safe. */
export type RenderBlock =
  | { type: 'ar'; runs: ArRuns }
  | { type: 'fr'; text: string }
  | { type: 'math'; latex: string }
  | { type: 'student_line'; lineId: string; raw: string }
  | {
      type: 'compare';
      lines: [{ id: string; raw: string }, { id: string; raw: string }];
    };

/** A component the screen draws inside the tutor's message (props already validated). */
export interface ShownComponent {
  name: ComponentName;
  props: Record<string, unknown>;
  /** The urn it draws: a small case's, or the exercise's. */
  experiment: Experiment | null;
  caseId: string | null;
}

export type VerifyResult =
  | { ok: true; blocks: RenderBlock[]; component: ShownComponent | null }
  | { ok: false; reasons: string[] };

const ARABIC = /[؀-ۿ]/;
const REPEAT = /(.)\1{19,}/u;
const QUESTION = /[?؟]/g;
const NOTATION_LATEX =
  /\\binom|C_\s*\{|C_\s*\d|C\^|\\mathrm\{C\}|\bC\s*\(|A_\s*\{/;
const NOTATION_TEXT = /\bC\s*\(\s*\d/;
/** A calculation (numbers joined by operators or "=") inside a sentence. */
const CALC_SPAN = /\(?\d[\d.,]*\)?(?:\s*[=×÷+*/−-]\s*\(?\s*\d[\d.,]*\s*\)?)+/g;
const OPERATOR = /[×÷+*/−-]/g;
/** Next to a Latin stretch («B(n ; 1/2)», «P(A) = 4*15/120»): left whole for the runs. */
const LATIN_BEFORE = /[A-Za-z][()\s;,=]*$/;
const LATIN_AFTER = /^[()\s;,=]*[A-Za-z]/;
/**
 * A run of ball labels or letter groups (ab, R1, a b c d): one in a sentence
 * reads fine; two or more next to «و» and brackets are scrambled by the
 * phone's right-to-left layout (owner's screenshot, 2026-10-30).
 */
const LABEL_RUN = /^(?=.{2})[A-Za-z]{1,3}\d{0,2}( [A-Za-z]{1,3}\d{0,2})*$/;
/** A run without the brackets and punctuation around it («(ab» and «ba)» are labels too). */
const bareRun = (s: string): string =>
  s.replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9]+$/, '');
/** A line id of the session (L1, L12): his lines are shown with student_line blocks. */
const LINE_ID = /\bL\d+\b/;

/** Function and operator names written without a backslash (ln x, lim, card). */
const MATH_NAMES: ReadonlySet<string> = new Set([
  'ln',
  'log',
  'lim',
  'exp',
  'sin',
  'cos',
  'tan',
  'sinh',
  'cosh',
  'tanh',
  'arcsin',
  'arccos',
  'arctan',
  'card',
  'max',
  'min',
  'sup',
  'inf',
  'det',
  'mod',
  'pgcd',
  'ppcm',
  'arg',
]);
/** Short English and French words a formula never holds (a label like ab or AB stays allowed). */
const SHORT_WORDS: ReadonlySet<string> = new Set([
  'in',
  'of',
  'and',
  'the',
  'is',
  'are',
  'for',
  'to',
  'on',
  'or',
  'at',
  'by',
  'if',
  'not',
  'so',
  'as',
  'an',
  'be',
  'et',
  'ou',
  'de',
  'des',
  'du',
  'la',
  'le',
  'les',
  'un',
  'une',
  'est',
  'en',
  'sur',
  'par',
  'que',
  'qui',
  'si',
  'au',
  'aux',
]);
const VOWEL = /[aeiouyàâäéèêëîïôöùûü]/i;

/** One run of letters of a formula: a word (refused) or a symbol, label or function name. */
function isWord(run: string): boolean {
  // All capitals (AB, ABCD, RRN, QCM): points, labels or sequences of draws.
  if (run.length > 1 && run === run.toUpperCase()) {
    return false;
  }
  const lower = run.toLowerCase();
  // Lowercase or Capitalized only: mixed case is a product of symbols (xA, pB).
  if (run.slice(1) !== lower.slice(1)) {
    return false;
  }
  if (SHORT_WORDS.has(lower)) {
    return true;
  }
  if (run.length < 4 || MATH_NAMES.has(lower) || !VOWEL.test(run)) {
    return false;
  }
  // A function name and its variable written together (sinx, limx, lnxy).
  for (const name of MATH_NAMES) {
    if (lower.startsWith(name) && lower.length - name.length <= 2) {
      return false;
    }
  }
  // Letters of a small alphabet (abcd, bacd, face): the urn's ball labels.
  return !/^[a-h]+$/.test(lower);
}

/**
 * Words in a math block, English or French («3 people in A∩F», the AI on
 * 2026-11-18; \text{ et } too): a math block holds the formula only, its
 * words go in an ar or fr block. Single letters (A, p, x, e, C), labels
 * (ab, R1, AB, RRN) and function names (ln, lim, card) stay allowed.
 */
export function wordsInMath(latex: string): string[] {
  const bare = latex.replace(/\\[A-Za-z]+/g, ' ');
  return [...bare.matchAll(/[A-Za-zÀ-ÿ]+/g)]
    .map(m => m[0])
    .filter(w => w.length > 1 && isWord(w));
}

type TextPart =
  | { kind: 'text'; text: string }
  | { kind: 'math'; plain: string; latex: string };

const depth = (s: string): number =>
  (s.match(/\(/g) ?? []).length - (s.match(/\)/g) ?? []).length;

/**
 * Arabic text with its calculations cut out as math (empty text parts
 * dropped). Only a real calculation is cut: an "=" or two operators, balanced
 * brackets, not inside a Latin stretch. Anything else stays in the sentence.
 */
export function splitCalculations(text: string): TextPart[] {
  const out: TextPart[] = [];
  let at = 0;
  for (const m of text.matchAll(CALC_SPAN)) {
    let start = m.index;
    let end = m.index + m[0].length;
    // A bracket the calculation does not close (or open) stays in the sentence.
    while (text[start] === '(' && depth(text.slice(start, end)) > 0) {
      start++;
    }
    while (
      /[\s)]/.test(text[end - 1] ?? '') &&
      depth(text.slice(start, end)) < 0
    ) {
      end--;
    }
    const span = text.slice(start, end).trim();
    if (
      depth(span) !== 0 ||
      (!span.includes('=') && (span.match(OPERATOR) ?? []).length < 2) ||
      LATIN_BEFORE.test(text.slice(0, start)) ||
      LATIN_AFTER.test(text.slice(end))
    ) {
      continue;
    }
    const before = text.slice(at, start);
    if (before.trim() !== '') {
      out.push({ kind: 'text', text: before.trim() });
    }
    const calc = span.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    out.push({
      kind: 'math',
      plain: calc,
      latex: lineLatex(calc.replace(/,/g, '.')),
    });
    at = end;
  }
  const rest = text.slice(at);
  if (rest.trim() !== '' && /[^\s.،,:؟?!]/.test(rest)) {
    out.push({ kind: 'text', text: rest.trim() });
  } else if (rest.trim() !== '' && out.length > 0) {
    // Trailing punctuation joins the text before it.
    const last = out[out.length - 1]!;
    if (last.kind === 'text') {
      last.text += rest.trim();
    }
  }
  return out.length > 0 ? out : [{ kind: 'text', text }];
}

/** Words the student must not read: line ids and non-Tunisian forms. */
function checkWords(where: string, text: string, reasons: string[]): void {
  if (LINE_ID.test(text)) {
    reasons.push(
      `${where}: a line id (L1, L2...) is for you, not for him. Show his line with a student_line block, or say "your line".`,
    );
  }
  for (const b of bannedIn(text)) {
    reasons.push(`${where}: «${b.phrase}» is not Tunisian; say «${b.use}»`);
  }
}

/** Reveal is allowed after this many engine-checked attempts on a node. */
export const REVEAL_AFTER = 3;

const isSmall = (v: Fraction): boolean => v[1] === 1 && Math.abs(v[0]) <= 10;

/** Numbers of a math block (plain reading when possible, else the raw text). */
function mathNumbers(latex: string): Fraction[] {
  const p = latexToPlain(latex.replace(/\\neq|\\ne\b/g, '#'));
  return numbersIn(p ?? latex);
}

/**
 * Numbers of a text on a tree question: a fraction (`\frac{5}{12}`,
 * `\dfrac{5}{12}`, `5/12`) is ONE value, never its numerator and its
 * denominator, and a minus sign is an operator (`5/12 - 1/6` holds no
 * negative number).
 */
export function fractionNumbers(text: string): Fraction[] {
  const out: Fraction[] = [];
  const whole = (a: string, b: string): string => {
    if (Number(b) !== 0) {
      out.push(frac(Number(a), Number(b)));
    }
    return ' ';
  };
  const rest = text
    .replace(
      /\\[dt]?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/g,
      (_m, a: string, b: string) => whole(a, b),
    )
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_m, a: string, b: string) => whole(a, b))
    // "0{,}7" (LaTeX decimal comma) -> 0,7
    .replace(/\{,\}/g, ',');
  for (const m of rest.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const [int = '0', dec = ''] = m[0].replace(',', '.').split('.');
    const den = 10 ** dec.length;
    out.push(frac(Number(int) * den + Number(dec || 0), den));
  }
  return out;
}

/** A math block "a = b" whose sides the engine can evaluate and that disagree. */
export function falseEquality(latex: string): string | null {
  if (/\\neq|\\ne\b|≠|\\approx|≈/.test(latex)) {
    return null;
  }
  const p = latexToPlain(latex);
  if (p === null || !p.includes('=')) {
    return null;
  }
  const r = readLine(p);
  return r.chain.kind === 'chain' && !r.chain.equal ? latex : null;
}

interface Context {
  rt: SessionRuntime;
  pack: QuestionPack;
  experiment: Experiment | null;
}
/** What a message is checked against: the session, the question's pack, its urn. */
export type VerifyContext = Context;

/** What he has on the question's own graph: the nodes he earned, the numbers he wrote, his tries. */
function evidence(c: Context): {
  earned: Set<string>;
  written: Fraction[];
  attempts: (node: string) => number;
} {
  const s = c.rt.state;
  const earned = new Set<string>();
  const written: Fraction[] = [];
  for (const l of s.lines) {
    if (l.graph === 'main' && l.match && 'node' in l.match) {
      if (l.match.verdict === 'credit' || l.match.verdict === 'support') {
        earned.add(l.match.node);
      }
    }
    // His own numbers: every number he wrote in the line and each side's value.
    const chain = readLine(l.raw).chain;
    if (chain.kind !== 'unreadable') {
      for (const side of chain.kind === 'chain' ? chain.sides : [chain.side]) {
        written.push(side.value);
        for (const n of leaves(side.ast)) {
          if (Number.isInteger(Number(n))) {
            written.push(frac(Number(n)));
          }
        }
      }
    }
  }
  for (const n of s.credited.main ?? []) {
    earned.add(n);
  }
  const attempts = (node: string) =>
    s.lines.filter(
      l =>
        l.graph === 'main' &&
        (l.expected === node ||
          (l.match !== null && 'node' in l.match && l.match.node === node)),
    ).length;
  return { earned, written, attempts };
}

/**
 * The numbers he may see without earning them. An urn question: the pack's
 * given numbers. A tree question also takes the session's (the mover adds
 * his results of the earlier questions there: the tree keeps them).
 */
const givenSet = (c: Context): Set<string> =>
  new Set(
    c.pack.domain === 'tree'
      ? [...c.pack.given, ...c.rt.state.given]
      : c.pack.given,
  );

/**
 * Values of the question's own graph he has not earned (and may not see
 * yet). A node he tried `revealAfter` times is allowed again (the AI's
 * reveal); prepared replies that never reveal pass Infinity.
 */
export function forbiddenValues(
  c: Context,
  revealAfter = REVEAL_AFTER,
): { node: string; value: Fraction }[] {
  const main = c.rt.graphs.get('main');
  if (!main) {
    return [];
  }
  const { earned, written, attempts } = evidence(c);
  const given = givenSet(c);
  return main.graph.nodes
    .filter(n => !n.expr && !earned.has(n.id))
    .filter(n => !isSmall(n.value))
    .filter(n => !given.has(plain(n.value)))
    .filter(n => !written.some(w => sameRat(w, n.value)))
    .filter(n => attempts(n.id) < revealAfter)
    .map(n => ({ node: n.id, value: n.value }));
}

/**
 * A formula with its division and product signs as the engine reads a line
 * (`\div`, ÷ and the French `:` are a division). Tree questions only: a
 * quotient of two branches is the calculation that must not be shown.
 */
export const lineOperators = (latex: string): string =>
  latex
    .replace(/\\[,;!: ]/g, '')
    .replace(/\\div(?![A-Za-z])|÷|:/g, '/')
    .replace(/×/g, '*')
    .replace(/\u2212/g, '-');

/** How a side is written: its factors, and its terms when it is a sum. */
interface Road {
  bag: ReturnType<typeof factorBag>;
  terms: string[] | null;
}

/** The sides of a calculation that hold work (a side that is only a value says nothing of the road). */
function roadsIn(text: string): Road[] {
  const chain = readLine(text).chain;
  if (chain.kind === 'unreadable') {
    return [];
  }
  return (chain.kind === 'chain' ? chain.sides : [chain.side])
    .filter(side => !isLiteralValue(side.ast))
    .map(side => ({ bag: factorBag(side.ast), terms: sumTerms(side.ast) }));
}

const sameRoad = (x: Road, y: Road): boolean =>
  sameBag(x.bag, y.bag) ||
  (x.terms !== null &&
    y.terms !== null &&
    x.terms.length === y.terms.length &&
    x.terms.every((t, i) => t === y.terms![i]));

/**
 * Tree question: the nodes whose calculation must not be shown yet (a step
 * of the question he has not earned, tried fewer than `revealAfter` times),
 * each with the accepted roads to it. The value test above is not enough on
 * a tree: the figure's 1/4 is also the result of two steps, so a message
 * could write the whole calculation of a step with "allowed" numbers only.
 */
function hiddenRoads(
  c: Context,
  revealAfter = REVEAL_AFTER,
): { node: GraphNode; roads: Road[] }[] {
  const main = c.rt.graphs.get('main');
  if (!main || c.pack.domain !== 'tree') {
    return [];
  }
  const { earned, attempts } = evidence(c);
  return main.graph.nodes
    .filter(n => !n.expr && n.role !== 'support' && !earned.has(n.id))
    .filter(n => attempts(n.id) < revealAfter)
    .map(node => ({ node, roads: node.forms.flatMap(roadsIn) }));
}

/**
 * Tree question: the step whose calculation `calculation` writes ("2/3*1/4"
 * is the road to p(A ∩ F)), when he has not earned that step yet; null
 * otherwise. `revealAfter`: Infinity for an answer that never reveals.
 */
export function leakedRoad(
  c: Context,
  calculation: string,
  revealAfter = REVEAL_AFTER,
): string | null {
  const hidden = hiddenRoads(c, revealAfter);
  const roads = hidden.length > 0 ? roadsIn(calculation) : [];
  return (
    hidden.find(h => h.roads.some(r => roads.some(x => sameRoad(r, x))))?.node
      .id ?? null
  );
}

function notationOpen(c: Context): boolean {
  const gate = c.pack.notes?.notationAfter;
  if (!gate) {
    return true;
  }
  return Object.values(c.rt.state.credited).some(nodes => nodes.includes(gate));
}

function checkNumbers(
  where: string,
  values: Fraction[],
  allowed: (v: Fraction) => boolean,
  forbidden: { node: string; value: Fraction }[],
  reasons: string[],
): void {
  for (const v of values) {
    const leak = forbidden.find(f => sameRat(f.value, v));
    if (leak) {
      reasons.push(
        `${where}: ${plain(v)} is the value of "${
          leak.node
        }", which he has not found yet. Let him find it.`,
      );
    } else if (!isSmall(v) && !allowed(v)) {
      reasons.push(
        `${where}: ${plain(
          v,
        )} is not from the statement, his lines or an engine result. Compute it with a tool first, or leave it out.`,
      );
    }
  }
}

export function verifyAsk(ask: AskStudent, c: Context): VerifyResult {
  const reasons: string[] = [];
  const s = c.rt.state;
  const tree = c.pack.domain === 'tree';
  const known = new Set([...s.known, ...givenSet(c)]);
  const allowed = (v: Fraction) => known.has(plain(v));
  const forbidden = forbiddenValues(c);
  const notation = notationOpen(c);
  const blocks: RenderBlock[] = [];
  let questions = 0;
  let arChars = 0;
  // A tree question reads a fraction as one value, in a sentence and in a formula.
  const textNumbers = tree ? fractionNumbers : numbersIn;
  const formulaNumbers = tree ? fractionNumbers : mathNumbers;
  // Tree question: a calculation that is the road to a step he has not earned.
  const hidden = hiddenRoads(c);
  const checkRoad = (where: string, calculation: string): void => {
    const roads = hidden.length > 0 ? roadsIn(calculation) : [];
    const leak = hidden.find(h =>
      h.roads.some(r => roads.some(x => sameRoad(r, x))),
    );
    if (leak) {
      reasons.push(
        `${where}: "${calculation}" is the calculation of "${leak.node.id}", which he has not found yet: that is the how. Ask him which branches or paths he needs, never write the calculation.`,
      );
    }
  };

  ask.message.forEach((b, i) => {
    const where = `block ${i + 1}`;
    switch (b.type) {
      case 'ar': {
        arChars += b.text.length;
        let labelRuns = 0;
        if (REPEAT.test(b.text)) {
          reasons.push(`${where}: a character repeated many times`);
          break;
        }
        if (!notation && NOTATION_TEXT.test(b.text)) {
          reasons.push(
            `${where}: the C(n,k) notation comes only after he computed the count himself`,
          );
        }
        questions += (b.text.match(QUESTION) ?? []).length;
        checkWords(where, b.text, reasons);
        checkNumbers(where, textNumbers(b.text), allowed, forbidden, reasons);
        // A calculation written inside the sentence ("20+36+4 = 60") becomes
        // its own left-to-right math block; the Arabic around it stays.
        for (const part of splitCalculations(b.text)) {
          if (part.kind === 'math') {
            checkRoad(where, part.plain);
            const wrong = falseEquality(part.plain);
            if (wrong) {
              reasons.push(
                `${where}: "${part.plain}" is false. Check it with evaluate.`,
              );
            }
            blocks.push({ type: 'math', latex: part.latex });
            continue;
          }
          const runs = isolateLlmRuns([{ ar: part.text }]);
          if (!runs) {
            reasons.push(
              `${where}: LaTeX, a bidi control or a long formula inside Arabic text. Put the formula in its own math block.`,
            );
            break;
          }
          labelRuns += runs.filter(
            r => 'fr' in r && LABEL_RUN.test(bareRun(r.fr)),
          ).length;
          blocks.push({ type: 'ar', runs });
        }
        if (labelRuns >= 2) {
          reasons.push(
            `${where}: ball labels or letter examples (ab, ba, R1 N2) inside an Arabic sentence come out scrambled on the phone. Put them in their own math block (e.g. ab = ba), not between Arabic words.`,
          );
        }
        break;
      }
      case 'fr': {
        questions += (b.text.match(QUESTION) ?? []).length;
        checkWords(where, b.text, reasons);
        checkNumbers(where, textNumbers(b.text), allowed, forbidden, reasons);
        if (hidden.length > 0) {
          mathSegments(b.text).forEach(seg => checkRoad(where, seg));
        }
        blocks.push({ type: 'fr', text: b.text });
        break;
      }
      case 'math': {
        if (ARABIC.test(b.latex)) {
          reasons.push(`${where}: Arabic text inside a math block`);
          break;
        }
        const words = wordsInMath(b.latex);
        if (words.length > 0) {
          reasons.push(
            `${where}: words in a math block (${words
              .map(w => `"${w}"`)
              .join(
                ', ',
              )}): a math block holds the formula only; put the words in an ar or fr block`,
          );
          break;
        }
        try {
          parseLatexSubset(b.latex);
        } catch {
          reasons.push(
            tree
              ? `${where}: the formula does not parse; use plain LaTeX (\\frac, \\times, \\overline, \\cap) and write a conditional with a slash, p(F/\\overline{A}), never \\mid`
              : `${where}: the formula does not parse; use plain LaTeX (\\frac, \\times, ^, _, \\binom)`,
          );
          break;
        }
        if (!notation && NOTATION_LATEX.test(b.latex)) {
          reasons.push(
            `${where}: the C(n,k) notation comes only after he computed the count himself`,
          );
        }
        // A tree formula divides with \div or ":" as often as with a bar.
        const formula = tree ? lineOperators(b.latex) : b.latex;
        const wrong = falseEquality(formula);
        if (wrong) {
          reasons.push(
            `${where}: "${b.latex}" is false. Check it with evaluate, or show his own line with a student_line block.`,
          );
        }
        checkNumbers(
          where,
          formulaNumbers(b.latex),
          allowed,
          forbidden,
          reasons,
        );
        if (hidden.length > 0) {
          // Each side of the formula on its own: a label (p(A) = ...) is not a calculation.
          for (const side of formula.split('=')) {
            const p = latexToPlain(side);
            if (p !== null && p !== '') {
              checkRoad(where, p);
            }
          }
        }
        blocks.push({ type: 'math', latex: b.latex });
        break;
      }
      case 'student_line': {
        const l = s.lines.find(x => x.id === b.line_id);
        if (!l) {
          reasons.push(`${where}: no line ${b.line_id}`);
          break;
        }
        blocks.push({ type: 'student_line', lineId: l.id, raw: l.raw });
        break;
      }
      case 'compare': {
        const [a, d] = b.line_ids.map(id => s.lines.find(x => x.id === id));
        if (!a || !d) {
          reasons.push(`${where}: unknown line id`);
          break;
        }
        blocks.push({
          type: 'compare',
          lines: [
            { id: a.id, raw: a.raw },
            { id: d.id, raw: d.raw },
          ],
        });
        break;
      }
    }
  });

  if (questions > 1) {
    reasons.push(
      `${questions} questions in one message: ask one thing; the next comes after his answer`,
    );
  }
  if (arChars > 700) {
    reasons.push('the message is too long for a phone: keep it short');
  }

  const input = ask.input;
  if (input.kind === 'choice') {
    input.options.forEach((o, i) => {
      checkWords(`option ${i + 1}`, o.text, reasons);
      checkNumbers(
        `option ${i + 1}`,
        textNumbers(o.text),
        allowed,
        forbidden,
        reasons,
      );
    });
  }
  if (input.kind === 'line' && input.expect?.kind === 'node') {
    const g = input.expect.graph;
    if (!c.rt.graphs.has(g) && s.cases[g] === undefined) {
      reasons.push(`expect: unknown graph ${g}`);
    }
  }
  if (input.kind === 'list') {
    const spec = s.cases[input.case_id];
    const groups =
      spec?.kind === 'box'
        ? boxValues(spec.n, input.size).groups
        : spec?.kind === 'urn'
        ? boxValues(spec.reds + spec.blacks, input.size).groups
        : undefined;
    if (!groups) {
      reasons.push(`list: unknown case ${input.case_id} (make_case first)`);
    } else if (groups[0] > 30) {
      reasons.push(
        `list: ${plain(
          groups,
        )} groups is too many to list by hand; use a smaller case`,
      );
    }
  }
  let component: ShownComponent | null = null;
  if (input.kind === 'component') {
    let props: unknown;
    try {
      props = JSON.parse(input.props_json);
    } catch {
      reasons.push('component: props_json is not JSON');
    }
    const spec = input.case_id === null ? null : s.cases[input.case_id];
    if (input.case_id !== null && !spec) {
      reasons.push(
        `component: unknown case ${input.case_id} (make_case first)`,
      );
    }
    // A tree case has no urn to draw: the component then has no experiment.
    const experiment = spec
      ? spec.kind === 'tree'
        ? null
        : caseExperiment(spec)
      : c.experiment;
    if (props !== undefined && (input.case_id === null || spec)) {
      const r = resolveSpec(
        { component: input.name as ComponentName, props: props as never },
        experiment ?? undefined,
      );
      if (!r.ok) {
        reasons.push(
          `component: ${r.reason} (${r.detail.slice(
            0,
            300,
          )}). Check the props against the catalogue.`,
        );
      } else {
        // Values of a small case are his to find there, but the question's
        // own unearned values must not appear in the picture.
        const rule = revealedByRules(
          REGISTRY[r.name]?.reveals,
          r.props as Record<string, unknown>,
          experiment ?? undefined,
          v => forbidden.some(f => sameRat(f.value, v)),
        );
        if (rule) {
          reasons.push(
            `component: ${r.name} with these props would show a value of this question he has not found yet; use a small case (make_case + case_id) or other props`,
          );
        } else {
          component = {
            name: r.name,
            props: r.props as Record<string, unknown>,
            experiment,
            caseId: input.case_id,
          };
        }
      }
    }
  }

  return reasons.length > 0
    ? { ok: false, reasons }
    : { ok: true, blocks, component };
}
