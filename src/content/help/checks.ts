/**
 * The rules a help file must follow (schema.ts), as functions that return
 * what is wrong (an empty list: fine). One place for them: the tests
 * (help.test.ts) and the per-exercise check (`npm run check:exercise`) run
 * the same rules, so a rule never passes in one and fails in the other.
 * Each issue names the question and the step (`t1/mt1.c_path`) so it can be
 * fixed where it is, without redoing the rest (docs/NEW_EXERCISE.md).
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { bannedIn } from '../../ai/prompt/lexicon';
import { credit } from '../../ai/session/state';
import { resolveSpec } from '../../components/registry';
import {
  act,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from '../../hybrid/conductor/conductor';
import { isTouring } from '../../hybrid/tour/tour';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { evalChain } from '../../method/lineChain';
import { latexToPlain } from '../../tutor/verify';
import { sameRat } from '../../engine/rationalFormat';
import type { Fraction } from '../../engine/rational';
import { stepKey, type LoadedExercise, type ResolvedAnswer } from '../loader';
import type { Rich } from '../schema';
import type { HelpFile, Ladder } from './schema';

/** What the checks read: the exercise as loaded, its JSON, its help file. */
export interface HelpInput {
  loaded: LoadedExercise;
  raw: unknown;
  help: HelpFile;
}

/** The kinds of step that need the three levels. */
const HELPED = new Set(['lines', 'cards']);

export function questionsOf(raw: unknown): string[] {
  const parts = (raw as { parts?: { id: string }[] } | undefined)?.parts;
  return (parts ?? []).map(p => p.id);
}

const ctxOf = (input: HelpInput, questionId: string): QuestionCtx =>
  questionCtx(input.loaded, input.raw as never, questionId);

/** The steps of a question that need a ladder, in his route's order. */
export function helpedFrames(ctx: QuestionCtx): string[] {
  return startQuestion(ctx).route.filter(id =>
    HELPED.has(ctx.frames.get(id)?.frame.type ?? ''),
  );
}

const richTexts = (r: Rich): string[] => [
  ...(r.ar ?? []).map(run => ('ar' in run ? run.ar : run.fr)),
  ...(r.fr !== undefined ? [r.fr] : []),
];

function ladderTexts(l: Ladder): string[] {
  const rich: Rich[] = [
    ...l.idea.text,
    ...(l.idea.legend ?? []).map(x => x.text),
    ...l.example.story,
    ...(l.example.legend ?? []).map(x => x.text),
    ...l.example.lines.flatMap(x => (x.say ? [x.say] : [])),
    l.example.rule,
    l.example.bridge,
    ...l.method.text,
  ];
  return rich.flatMap(richTexts);
}

/**
 * The numeric sides of a LaTeX line, side by side (a side with letters,
 * p(A \cap F), is skipped; its numbers are still checked on the others).
 * A line with \neq says two things differ: it is not an equality.
 */
export function numericSides(latex: string): Fraction[] | null {
  if (/\\neq|≠/.test(latex)) {
    return null;
  }
  return latex.split('=').flatMap(side => {
    const plain = latexToPlain(side);
    if (plain === null) {
      return [];
    }
    const r = evalChain(plain.replace(/×/g, '*').replace(/÷/g, '/'));
    return r.kind === 'bare' || r.kind === 'unfinished' ? [r.value] : [];
  });
}

/**
 * Words the owner refused that the shared lexicon does not list yet (its
 * lint also reads older content that uses some of them): refused here as
 * whole words, in the help only.
 */
export const MORE_BANNED = [
  'بس',
  'لكن',
  'هل',
  'مزيان',
  'دوك',
  'هاذا',
  'الاتنين',
  'علمًا',
  'علما',
];
/** Arabic letters and their marks (a shadda: «بسّط» is not «بس»). */
const AR_LETTER = 'ء-ي\\u064B-\\u0652';
export const moreBannedIn = (text: string): string[] =>
  MORE_BANNED.filter(w =>
    new RegExp(`(^|[^${AR_LETTER}])(?:و|ف)?${w}(?![${AR_LETTER}])`).test(text),
  );

const fillLine = (template: string, answer: readonly string[]): string => {
  let i = 0;
  return template.replace(/\{\}/g, () => answer[i++] ?? '');
};

/** The question with the trip passed and every step before `frameId` his. */
function stateAt(ctx: QuestionCtx, frameId: string) {
  let s = startQuestion(ctx);
  if (isTouring(ctx, s)) {
    s = act(ctx, s, { kind: 'continue' }).state;
  }
  const at = s.route.indexOf(frameId);
  for (const id of s.route.slice(0, at)) {
    const f = ctx.frames.get(id)?.frame;
    if (f?.type !== 'lines') {
      continue;
    }
    const answer = ctx.loaded.answers.get(stepKey.main(ctx.questionId, id)) as
      | ResolvedAnswer
      | undefined;
    if (answer?.kind !== 'method' || answer.frame !== 'lines') {
      continue;
    }
    for (const n of answer.graph.nodes) {
      if (n.planCard === f.key) {
        credit(s.session, 'main', n.id);
      }
    }
  }
  s.at = at;
  return s;
}

const ladders = (input: HelpInput) =>
  Object.entries(input.help.ladders).flatMap(([q, byFrame]) =>
    Object.entries(byFrame).map(([id, l]) => ({ q, id, l })),
  );

/** Every line and card step has its ladder; a line step's has a line to fill, a card step's none. */
export function missingLadders(input: HelpInput): string[] {
  const out: string[] = [];
  for (const q of questionsOf(input.raw)) {
    const ctx = ctxOf(input, q);
    for (const id of helpedFrames(ctx)) {
      const l = input.help.ladders[q]?.[id];
      if (!l) {
        out.push(`${q}/${id}: no ladder yet`);
        continue;
      }
      const lines = ctx.frames.get(id)?.frame.type === 'lines';
      if (lines !== (l.method.fill !== undefined)) {
        out.push(
          lines
            ? `${q}/${id}: a line step needs method.fill`
            : `${q}/${id}: a card step has no method.fill`,
        );
      }
    }
  }
  return out;
}

/** No ladder for a step the exercise does not have (a renamed step, a typo). */
export function extraLadders(input: HelpInput): string[] {
  const questions = questionsOf(input.raw);
  return ladders(input)
    .filter(({ q, id }) =>
      questions.includes(q)
        ? !helpedFrames(ctxOf(input, q)).includes(id)
        : true,
    )
    .map(({ q, id }) => `${q}/${id}: no such step`);
}

/** The help gives, never asks («؟» "?"), in allowed words. */
export function textIssues(input: HelpInput): string[] {
  const out: string[] = [];
  const texts = [
    ...ladders(input).flatMap(({ q, id, l }) =>
      ladderTexts(l).map(t => ({ where: `${q}/${id}`, t })),
    ),
    ...input.help.glossary.flatMap(e =>
      [...e.meaning, ...(e.use ?? [])]
        .flatMap(richTexts)
        .map(t => ({ where: `glossary ${e.id}`, t })),
    ),
  ];
  for (const { where, t } of texts) {
    if (/[?؟]/.test(t)) {
      out.push(`${where}: asks a question: ${t}`);
    }
    for (const b of bannedIn(t)) {
      out.push(`${where}: banned «${b.phrase}» (say «${b.use}»): ${t}`);
    }
    for (const w of moreBannedIn(t)) {
      out.push(`${where}: banned «${w}»: ${t}`);
    }
  }
  return out;
}

/** Every numeric line of a small example is true. */
export function exampleSumIssues(input: HelpInput): string[] {
  const out: string[] = [];
  for (const { q, id, l } of ladders(input)) {
    for (const line of l.example.lines) {
      const sides = numericSides(line.math);
      if (sides && sides.some(v => !sameRat(v, sides[0]!))) {
        out.push(`${q}/${id}: false line: ${line.math}`);
      }
    }
  }
  return out;
}

/** No small example gives a value of the similar questions after the steps. */
export function similarLeaks(input: HelpInput): string[] {
  const out: string[] = [];
  // Small numbers and a half come up everywhere: they give nothing away.
  const trivial = (v: Fraction) =>
    (v[1] === 1 && Math.abs(v[0]) <= 10) || sameRat(v, [1, 2]);
  const questions = questionsOf(input.raw);
  for (const q of Object.keys(input.help.ladders)) {
    if (!questions.includes(q)) {
      continue;
    }
    const ctx = ctxOf(input, q);
    const similar = startQuestion(ctx).route.flatMap(id => {
      const answer = ctx.loaded.answers.get(stepKey.main(q, id)) as
        | ResolvedAnswer
        | undefined;
      return answer?.kind === 'method' && answer.frame === 'similar'
        ? answer.graph.nodes.map(n => n.value)
        : [];
    });
    for (const [id, l] of Object.entries(input.help.ladders[q] ?? {})) {
      for (const line of l.example.lines) {
        for (const v of numericSides(line.math) ?? []) {
          if (!trivial(v) && similar.some(x => sameRat(x, v))) {
            out.push(
              `${q}/${id}: gives a similar question's value: ${line.math}`,
            );
          }
        }
      }
    }
  }
  return out;
}

/** Each line to fill, filled with its answer, earns credit on its step. */
export function fillIssues(input: HelpInput): string[] {
  const out: string[] = [];
  const questions = questionsOf(input.raw);
  for (const { q, id, l } of ladders(input)) {
    const fill = l.method.fill;
    if (!fill || !questions.includes(q)) {
      continue;
    }
    const ctx = ctxOf(input, q);
    if (!ctx.frames.has(id)) {
      continue;
    }
    const slots = fill.template.match(/\{\}/g)?.length ?? 0;
    if (slots !== fill.answer.length) {
      out.push(`${q}/${id}: ${slots} slots, ${fill.answer.length} answers`);
      continue;
    }
    // Every value but the result is on a chip (the result may be typed).
    const offChip = fill.answer
      .slice(0, -1)
      .filter(v => !fill.chips.includes(v));
    if (offChip.length > 0) {
      out.push(`${q}/${id}: not on a chip: ${offChip.join(', ')}`);
    }
    const s = stateAt(ctx, id);
    const before = (s.session.credited.main ?? []).length;
    const a: StudentAct = {
      kind: 'line',
      raw: fillLine(fill.template, fill.answer),
    };
    const r = act(ctx, s, a);
    const after = (r.state.session.credited.main ?? []).length;
    // A step written in several lines (a letter, x or n): a right step on the way counts.
    const verdict = r.state.session.lines.at(-1)?.match?.verdict;
    // A line the board cannot read is refused, whatever the recorder says.
    if (
      r.out.reason === 'unreadable' ||
      (!r.out.advanced &&
        after <= before &&
        verdict !== 'support' &&
        verdict !== 'credit')
    ) {
      out.push(
        `${q}/${id}: the filled line ${a.raw} is not accepted (${r.out.reason})`,
      );
    }
  }
  return out;
}

const mathOf = (r: Rich | undefined): string[] =>
  r?.math !== undefined ? [r.math] : [];

/** Every formula of a ladder (its three levels). */
function ladderMath(l: Ladder): string[] {
  return [
    ...l.idea.text.flatMap(mathOf),
    ...(l.idea.legend ?? []).map(x => x.math),
    ...l.example.story.flatMap(mathOf),
    ...(l.example.legend ?? []).map(x => x.math),
    ...mathOf(l.example.rule),
    ...mathOf(l.example.bridge),
    ...l.example.lines.flatMap(x => [x.math, ...mathOf(x.say)]),
    ...l.method.text.flatMap(mathOf),
    ...(l.method.formula !== undefined ? [l.method.formula] : []),
    ...(l.method.fill?.lead !== undefined ? [l.method.fill.lead] : []),
  ];
}

/** Every formula of the help is one the math renderer draws. */
export function renderIssues(input: HelpInput): string[] {
  const all = [
    ...ladders(input).flatMap(({ q, id, l }) =>
      ladderMath(l).map(m => ({ where: `${q}/${id}`, m })),
    ),
    ...input.help.glossary.flatMap(e =>
      [...e.meaning, ...(e.use ?? [])]
        .flatMap(mathOf)
        .map(m => ({ where: `glossary ${e.id}`, m })),
    ),
  ];
  return all.flatMap(({ where, m }) => {
    try {
      parseLatexSubset(m);
      return [];
    } catch {
      return [`${where}: the renderer cannot draw ${m}`];
    }
  });
}

/**
 * A card step's levels never copy its right card's words (the card's
 * formula may show: it names what he reasons on, the words are the claim).
 */
export function giveawayIssues(input: HelpInput): string[] {
  const out: string[] = [];
  const squash = (s: string) => s.replace(/[\s.,:،]/g, '');
  const questions = questionsOf(input.raw);
  for (const { q, id, l } of ladders(input)) {
    if (!questions.includes(q)) {
      continue;
    }
    const f = ctxOf(input, q).frames.get(id)?.frame;
    if (f?.type !== 'cards') {
      continue;
    }
    const right = f.cards.find(c => c.truth === 'true');
    const card = right ? squash(richTexts(right.text).join('')) : '';
    if (card !== '' && ladderTexts(l).some(t => squash(t).includes(card))) {
      out.push(`${q}/${id}: a level copies the right card`);
    }
  }
  return out;
}

/** Every example figure is a picture the component registry draws. */
export function figureIssues(input: HelpInput): string[] {
  return ladders(input).flatMap(({ q, id, l }) => {
    const fig = l.example.figure;
    const r = fig ? resolveSpec(fig) : null;
    return r && !r.ok
      ? [`${q}/${id}: figure refused: ${r.detail.slice(0, 160)}`]
      : [];
  });
}

/** A glossary of at least three entries, ids unique. */
export function glossaryIssues(input: HelpInput): string[] {
  const ids = input.help.glossary.map(e => e.id);
  const out: string[] = [];
  if (ids.length < 3) {
    out.push(`glossary: ${ids.length} entries, at least 3 needed`);
  }
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length > 0) {
    out.push(`glossary: repeated ids ${[...new Set(dup)].join(', ')}`);
  }
  return out;
}

/** Every rule, in the order an author meets them (coverage first). */
export const HELP_CHECKS: readonly {
  id: string;
  title: string;
  run: (input: HelpInput) => string[];
}[] = [
  {
    id: 'ladders',
    title: 'every line and card step has its 3 levels',
    run: missingLadders,
  },
  {
    id: 'extra',
    title: 'no ladder for a step that does not exist',
    run: extraLadders,
  },
  {
    id: 'texts',
    title: 'the help gives, never asks, in allowed words',
    run: textIssues,
  },
  {
    id: 'render',
    title: 'every formula is drawn by the math renderer',
    run: renderIssues,
  },
  {
    id: 'giveaway',
    title: "no level copies a card step's right card",
    run: giveawayIssues,
  },
  {
    id: 'sums',
    title: "the small examples' numeric lines are true",
    run: exampleSumIssues,
  },
  {
    id: 'similar',
    title: "no example gives a similar question's value",
    run: similarLeaks,
  },
  {
    id: 'fills',
    title: 'each line to fill earns credit on its step',
    run: fillIssues,
  },
  {
    id: 'figures',
    title: 'every example figure is drawable',
    run: figureIssues,
  },
  {
    id: 'glossary',
    title: 'a glossary of 3+ entries, unique ids',
    run: glossaryIssues,
  },
];
