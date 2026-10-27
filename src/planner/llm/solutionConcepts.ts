/**
 * The current step's solution in every form an AI block must not state while
 * hints are left (D16, CLAUDE.md rule 6): the answer tokens (values, task
 * ids, the correct option's label), the correct option's own French words
 * (those no wrong option and nothing shown before the options uses), the
 * step's authored `solutionPhrases` (French and Arabic), and numbers written
 * in words ("ثلاثة", "trois", "3 sur 10"). Words and phrases the statement,
 * the question goal, the step's prompt or a hint already used show are no
 * giveaway. An AI block may still ask and point at what to look at.
 * Also: the option-list rule (a leak that names a wrong option too), near
 * misses for the simulation report, and the phrase coverage dev report.
 */
import type { Rich } from '../../content/schema';
import { parseNumeric } from '../../engine/format';
import { choose, frac } from '../../engine/rational';
import type { LessonContent } from '../../lesson/session/lesson';
import { numbersIn } from './numbers';
import { answerTokensFor, latexToLine, taskAnswer, valueKey } from './shown';

export interface SolutionConcepts {
  /** Values ("n/d") of the answer. */
  values: Set<string>;
  /** Task answer outcome ids. */
  ids: string[];
  /** Single words (French) that name the answer (compared without -e / -s). */
  words: string[];
  /** Phrases as token lists (French or Arabic). */
  phrases: string[][];
  /** Words of the wrong options (the option-list rule). */
  otherOptionWords: string[];
}

/** Text as comparable tokens: lower case, no accents or Arabic diacritics, \text{} unwrapped. */
export function matchTokens(text: string): string[] {
  return text
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\\(?:text|mathrm|textrm|mbox)\s*\{([^{}]*)\}/g, ' $1 ')
    .replace(/\\[A-Za-z]+/g, ' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(t => t.length > 0);
}

/** French plural / feminine endings do not make another word ("aucun" = "aucune"). */
const stem = (t: string) =>
  /^[a-z]{4,}$/.test(t) ? t.replace(/s$/, '').replace(/e$/, '') : t;

const FR_STOP = new Set(
  'le la les des de du un une et ou est sont que qui ne pas dans sur avec pour par au aux en il elle on se ce cette son sa ses tout tous toute'.split(
    ' ',
  ),
);

/**
 * Numbers in words (normalized forms). One ("un", "une", "واحد", "وحدة") is
 * left out: it is mostly an article, not a value.
 */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  vingt: 20,
  صفر: 0,
  زوز: 2,
  اثنين: 2,
  اثنان: 2,
  ثلاثه: 3,
  ثلاث: 3,
  تلاثه: 3,
  اربعه: 4,
  اربع: 4,
  ربعه: 4,
  خمسه: 5,
  خمس: 5,
  سته: 6,
  سبعه: 7,
  سبع: 7,
  ثمانيه: 8,
  ثمنيه: 8,
  تسعه: 9,
  عشره: 10,
  عشر: 10,
};
/** "3 sur 10", "ثلاثة على عشرة", "3 من 10". */
const FRACTION_SEP = new Set(['sur', 'علي', 'من']);

function numberOf(t: string): number | null {
  if (/^\d+$/.test(t)) {
    return Number(t);
  }
  return NUMBER_WORDS[t] ?? null;
}

function richStrings(r: Rich | undefined): string[] {
  if (!r) {
    return [];
  }
  return [
    ...(r.ar ?? []).map(run => ('ar' in run ? run.ar : run.fr)),
    r.fr ?? '',
    r.math ?? '',
  ].filter(s => s !== '');
}

const containsSeq = (hay: readonly string[], needle: readonly string[]) =>
  needle.length > 0 &&
  hay.some((_, i) => needle.every((t, j) => hay[i + j] === t));

export function solutionConcepts(
  content: LessonContent,
  key: string | null,
  o: { hintsUsed?: number } = {},
): SolutionConcepts {
  const base = answerTokensFor(content, key);
  const out: SolutionConcepts = {
    values: base.values,
    ids: base.ids,
    words: [],
    phrases: base.texts.map(t => matchTokens(t).map(stem)),
    otherOptionWords: [],
  };
  const answer = key === null ? undefined : content.loaded.answers.get(key);
  const step = key === null ? undefined : content.steps.get(key);
  if (!step) {
    return out;
  }
  const prompt = 'prompt' in step ? (step.prompt as Rich | undefined) : undefined;
  const hints = ('hints' in step ? (step.hints as Rich[] | undefined) : undefined) ?? [];
  // Shown before the options: the statement, the question goal, the prompt;
  // and the hints already used.
  const before = [
    ...richStrings(content.loaded.exercise.statement as Rich | undefined),
    ...richStrings(content.question.goal as Rich | undefined),
    ...richStrings(prompt),
    ...hints.slice(0, o.hintsUsed ?? 0).flatMap(richStrings),
  ].map(t => matchTokens(t).map(stem));
  const shownWords = new Set(before.flat());
  const shown = (p: string[]) => before.some(seq => containsSeq(seq, p));

  if (step.kind === 'choice' && answer?.kind === 'option') {
    const right = step.options.find(o2 => o2.id === answer.optionId);
    const rightLabel = right && 'label' in right ? right.label : undefined;
    const rightWords = new Set(
      richStrings(rightLabel).flatMap(t => matchTokens(t).map(stem)),
    );
    const wrongTokens = step.options
      .filter(o2 => o2.id !== answer.optionId)
      .flatMap(o2 => ('label' in o2 ? richStrings(o2.label) : []))
      .flatMap(t => matchTokens(t));
    const wrongWords = new Set(wrongTokens.map(stem));
    for (const t of wrongTokens) {
      const st = stem(t);
      if (
        /^[a-z]{4,}$/.test(t) &&
        !FR_STOP.has(t) &&
        !rightWords.has(st) &&
        !shownWords.has(st) &&
        !out.otherOptionWords.includes(st)
      ) {
        out.otherOptionWords.push(st);
      }
    }
    const own = rightLabel?.fr;
    for (const t of own ? matchTokens(own) : []) {
      const st = stem(t);
      if (
        /^[a-z]{4,}$/.test(t) &&
        !FR_STOP.has(t) &&
        !wrongWords.has(st) &&
        !shownWords.has(st) &&
        !out.words.some(w => stem(w) === st)
      ) {
        out.words.push(t);
      }
    }
  }
  for (const p of authoredPhrases(step)) {
    const tokens = matchTokens(p).map(stem);
    if (tokens.length > 0) {
      out.phrases.push(tokens);
    }
  }
  out.phrases = out.phrases.filter(p => p.length > 0 && !shown(p));
  return out;
}

function authoredPhrases(step: unknown): string[] {
  const a = (step as { solutionPhrases?: { fr?: string[]; ar?: string[] } })
    .solutionPhrases;
  return [...(a?.fr ?? []), ...(a?.ar ?? [])];
}

/** Does this text state the solution (a word, a phrase, a number in words)? */
export function leaksSolution(c: SolutionConcepts, text: string): boolean {
  const tokens = matchTokens(text);
  const stems = tokens.map(stem);
  if (c.words.some(w => stems.includes(stem(w)))) {
    return true;
  }
  if (c.phrases.some(p => containsSeq(stems, p))) {
    return true;
  }
  if (c.values.size === 0) {
    return false;
  }
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    const n = numberOf(t);
    if (n === null) {
      continue;
    }
    const sep = tokens[i + 1];
    const d = tokens[i + 2] !== undefined ? numberOf(tokens[i + 2]!) : null;
    if (sep !== undefined && FRACTION_SEP.has(sep) && d !== null && d !== 0) {
      if (c.values.has(valueKey(frac(n, d)))) {
        return true;
      }
    }
    // Digits are the numeric check's job (numbersIn); here only words.
    if (!/^\d+$/.test(t) && c.values.has(valueKey(frac(n)))) {
      return true;
    }
  }
  return false;
}

/** A leak that also names a wrong option ("aucune, exactement une, ou les deux ?"). */
export function listsOptions(c: SolutionConcepts, text: string): boolean {
  if (!leaksSolution(c, text)) {
    return false;
  }
  const stems = matchTokens(text).map(stem);
  return c.otherOptionWords.some(w => stems.includes(w));
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = row[j]!;
      row[j] = Math.min(
        row[j]! + 1,
        row[j - 1]! + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = cur;
    }
  }
  return row[b.length]!;
}

/** A phrase token that carries meaning (not a short or common word). */
const significant = (t: string) => t.length >= 3 && !FR_STOP.has(t);

/**
 * Simulation report only (nothing is rejected for these): a text that passed
 * but comes close to the answer: a misspelled answer word, half of an answer
 * phrase, the numerator or denominator of the answer, or its complement 1 − p.
 */
export function nearMisses(c: SolutionConcepts, text: string): string[] {
  if (leaksSolution(c, text)) {
    return [];
  }
  const out: string[] = [];
  const tokens = matchTokens(text);
  const stems = new Set(tokens.map(stem));
  for (const t of tokens) {
    if (t.length < 5 || !/^[a-z]+$/.test(t)) {
      continue;
    }
    for (const w of c.words) {
      if (stem(t) !== stem(w) && editDistance(t, w) <= 2) {
        out.push(`word:${t}~${w}`);
      }
    }
  }
  for (const p of c.phrases) {
    // Short phrases ("dix tirages") would fire on one common word: only
    // phrases of three meaningful words or more, two of them present.
    const sig = p.filter(significant);
    if (sig.length < 3) {
      continue;
    }
    const hit = sig.filter(t => stems.has(t)).length;
    if (hit >= Math.max(2, Math.ceil(sig.length / 2)) && hit < sig.length) {
      out.push(`phrase:${p.join(' ')}`);
    }
  }
  const nums = numbersIn(text);
  for (const vk of c.values) {
    const [n = 0, d = 1] = vk.split('/').map(Number);
    const v = { n, d };
    for (const part of v.d === 1 ? [] : [v.n, v.d]) {
      if (nums.some(([num, den]) => den === 1 && num === part)) {
        out.push(`value-part:${part}`);
      }
    }
    if (v.d > 1 && v.n > 0 && v.n < v.d) {
      const comp = frac(v.d - v.n, v.d);
      if (nums.some(f => valueKey(f) === valueKey(comp))) {
        out.push(`complement:${comp[0]}/${comp[1]}`);
      }
    }
  }
  return [...new Set(out)];
}

export interface PhraseCoverageRow {
  key: string;
  scope: 'main' | 'variant' | 'mini';
  kind: string;
  /** Authored phrases. */
  fr: number;
  ar: number;
  /** Authored phrases that still count (not already shown before the options). */
  effective: number;
}

/** Steps of this question with a final answer, and their authored solution phrases. */
export function phraseCoverage(content: LessonContent): PhraseCoverageRow[] {
  const q = content.question;
  const mains = q.groups.flatMap(g => g.steps);
  const mainKeys = mains.map(st => `${q.id}/${st.id}`);
  const dives = new Set(
    mains.flatMap(st =>
      'deepDiveId' in st && st.deepDiveId ? [st.deepDiveId] : [],
    ),
  );
  const rows: PhraseCoverageRow[] = [];
  for (const [key, step] of content.steps) {
    const scope = key.startsWith('var:')
      ? 'variant'
      : key.startsWith('dd:')
      ? 'mini'
      : 'main';
    if (scope === 'main' && !mainKeys.includes(key)) {
      continue;
    }
    if (
      scope === 'variant' &&
      !content.variants
        .get(key.slice(4))
        ?.forSteps.some(k => mainKeys.includes(k))
    ) {
      continue;
    }
    if (scope === 'mini' && !dives.has(key.slice(3))) {
      continue;
    }
    const hasAnswer =
      content.loaded.answers.has(key) || taskAnswer(content, key) !== null;
    if (!hasAnswer) {
      continue;
    }
    const a = (step as { solutionPhrases?: { fr?: string[]; ar?: string[] } })
      .solutionPhrases;
    const authored = authoredPhrases(step).map(p => matchTokens(p).map(stem));
    const c = solutionConcepts(content, key);
    const effective = authored.filter(p =>
      c.phrases.some(x => x.join(' ') === p.join(' ')),
    ).length;
    rows.push({
      key,
      scope,
      kind: step.kind,
      fr: a?.fr?.length ?? 0,
      ar: a?.ar?.length ?? 0,
      effective,
    });
  }
  const order = { main: 0, variant: 1, mini: 2 };
  return rows.sort((x, y) => order[x.scope] - order[y.scope]);
}

export function formatPhraseCoverage(rows: readonly PhraseCoverageRow[]): string {
  const without = rows.filter(r => r.effective === 0);
  return [
    '| step | scope | kind | fr | ar | still count |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      r =>
        `| ${r.key} | ${r.scope} | ${r.kind} | ${r.fr} | ${r.ar} | ${r.effective} |`,
    ),
    '',
    `without phrases: ${without.length} of ${rows.length} (main ${
      without.filter(r => r.scope === 'main').length
    }, variants ${without.filter(r => r.scope === 'variant').length}, minis ${
      without.filter(r => r.scope === 'mini').length
    })`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Counting formulas (4c, 2026-10-22). Solid: a formula written with numbers is
// evaluated by the engine and compared with the step's answer. A list: the
// words and shapes that name a general formula (method_early) and the
// "k من n" phrasing; a formula written another way is not seen.

/** \binom{n}{k}, C_n^k, C(n, k) with the numbers, as engine values. */
const BINOM =
  /\\binom\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}|C_\{?(\d+)\}?\^\{?(\d+)\}?|C\(\s*(\d+)\s*[,;]\s*(\d+)\s*\)/g;
/** A general formula: letters in a binomial, n(n-1), or its name. */
const GENERAL =
  /\\binom\s*\{\s*[a-z]\s*\}|C_\{?[a-z]\}?\^|C\(\s*[a-z]\s*[,;]|[a-z]\s*\(\s*[a-z]\s*-\s*1\s*\)|combinaison|parmi|تأليف/i;

function countAnswer(content: LessonContent, key: string): number | null {
  const step = content.steps.get(key) as
    | { answer?: { compute?: { fn?: string } } }
    | undefined;
  const fn = step?.answer?.compute?.fn;
  if (fn !== 'count' && fn !== 'outcomeCount') {
    return null;
  }
  const a = content.loaded.answers.get(key);
  return a?.kind === 'number' && a.value[1] === 1 ? a.value[0] : null;
}

/** The first hint (1-based) that states the method, or the ladder's end. */
function methodHint(content: LessonContent, key: string): number {
  const step = content.steps.get(key);
  const hints =
    (step && 'hints' in step ? (step.hints as Rich[] | undefined) : []) ?? [];
  const i = hints.findIndex(h =>
    richStrings(h).some(t => /\\binom|combinaison|parmi|C_/.test(t)),
  );
  return i >= 0 ? i + 1 : hints.length;
}

/** Arithmetic (numbers only) as a value, or null. */
function evaluateFormula(text: string): number | null {
  const withBinoms = text.replace(
    BINOM,
    (_m, a, b, c, d, e, f) =>
      `(${choose(Number(a ?? c ?? e), Number(b ?? d ?? f))})`,
  );
  const line = latexToLine(withBinoms.replace(/×|÷/g, m => (m === '×' ? '*' : '/')));
  if (line === null || !/[*/()+-]/.test(line) || /[A-Za-z]/.test(line)) {
    return null;
  }
  const r = parseNumeric(line);
  return r.ok ? r.value[0] / r.value[1] : null;
}

/**
 * On a counting step: "formula_answer" when a formula with the exercise's
 * numbers evaluates to the answer (also "زوز من خمسة" = C(5, 2)), while
 * hints are left; "method_early" for a general formula before the hint that
 * states the method has been used; else null.
 */
export function formulaLeak(
  content: LessonContent,
  key: string | null,
  text: string,
  hintsUsed: number,
): 'formula_answer' | 'method_early' | null {
  const answer = key === null ? null : countAnswer(content, key);
  if (answer === null || key === null) {
    return null;
  }
  for (const m of text.matchAll(BINOM)) {
    const [n, k] = [m[1] ?? m[3] ?? m[5], m[2] ?? m[4] ?? m[6]].map(Number);
    if (choose(n!, k!) === answer) {
      return 'formula_answer';
    }
  }
  if (evaluateFormula(text) === answer) {
    return 'formula_answer';
  }
  const tokens = matchTokens(text);
  for (let i = 0; i + 2 < tokens.length; i += 1) {
    const k = numberOf(tokens[i]!);
    const n = numberOf(tokens[i + 2]!);
    if (
      k !== null &&
      n !== null &&
      (tokens[i + 1] === 'من' || tokens[i + 1] === 'parmi') &&
      n >= k &&
      choose(n, k) === answer
    ) {
      return 'formula_answer';
    }
  }
  if (GENERAL.test(text) && hintsUsed < methodHint(content, key)) {
    return 'method_early';
  }
  return null;
}
