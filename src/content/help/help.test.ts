/**
 * The help files (schema.ts), for every exercise the board leads:
 * - the file parses and every step where he writes a line or picks a card
 *   has its three levels; a line step's third level has a line to fill, a
 *   card step's has none (the cards are his answer);
 * - no text asks (no «؟» or "?"), no banned darija word;
 * - the small example's numeric lines are true (the engine computes them);
 * - the line to fill, filled with its answer, earns credit on its step once
 *   the earlier steps are his (the conductor judges it like a typed line);
 * - a glossary with unique ids.
 * Run one exercise: npx jest src/content/help -t bac2022c-ex4
 */
import type { StudentAct } from '../../ai/checks/autoCheck';
import { bannedIn } from '../../ai/prompt/lexicon';
import { credit } from '../../ai/session/state';
import { CATALOG } from '../../app/exercises';
import { resolveSpec } from '../../components/registry';
import {
  act,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from '../../hybrid/conductor/conductor';
import { isTouring } from '../../hybrid/tour/tour';
import { evalChain } from '../../method/lineChain';
import { latexToPlain } from '../../tutor/verify';
import { sameRat } from '../../engine/rationalFormat';
import type { Fraction } from '../../engine/rational';
import { stepKey, type ResolvedAnswer } from '../loader';
import type { Rich } from '../schema';
import { glossaryMatches, HELP_SOURCES, helpFor } from './help';
import { HelpFileSchema, type Ladder } from './schema';

const EXERCISES = Object.keys(HELP_SOURCES);
const HELPED = new Set(['lines', 'cards']);

function ctxOf(exerciseId: string, questionId: string): QuestionCtx {
  const entry = CATALOG.find(e => e.id === exerciseId);
  if (!entry?.result.ok) {
    throw new Error(`${exerciseId} does not load`);
  }
  return questionCtx(entry.result.loaded, entry.raw as never, questionId);
}

function questionsOf(exerciseId: string): string[] {
  const entry = CATALOG.find(e => e.id === exerciseId);
  const raw = entry?.raw as { parts?: { id: string }[] } | undefined;
  return (raw?.parts ?? []).map(p => p.id);
}

/** The steps of a question that need a ladder, in his route's order. */
function helpedFrames(ctx: QuestionCtx): string[] {
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
function numericSides(latex: string): Fraction[] | null {
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
const MORE_BANNED = [
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
const moreBannedIn = (text: string): string[] =>
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

test('every exercise the board leads has a help file that parses', () => {
  for (const id of EXERCISES) {
    const r = HelpFileSchema.safeParse(HELP_SOURCES[id]);
    expect(r.success ? r.data.exerciseId : r.error.message.slice(0, 400)).toBe(
      id,
    );
  }
});

describe.each(EXERCISES)('%s', exerciseId => {
  const help = () => helpFor(exerciseId)!;

  test(`${exerciseId}: every line and card step has its ladder`, () => {
    const missing: string[] = [];
    const wrongFill: string[] = [];
    for (const q of questionsOf(exerciseId)) {
      const ctx = ctxOf(exerciseId, q);
      for (const id of helpedFrames(ctx)) {
        const l = help().ladders[q]?.[id];
        if (!l) {
          missing.push(`${q}/${id}`);
          continue;
        }
        const lines = ctx.frames.get(id)?.frame.type === 'lines';
        if (lines !== (l.method.fill !== undefined)) {
          wrongFill.push(`${q}/${id}`);
        }
      }
    }
    expect({ missing, wrongFill }).toEqual({ missing: [], wrongFill: [] });
  });

  test(`${exerciseId}: no ladder for a step that does not exist`, () => {
    const extra: string[] = [];
    for (const [q, byFrame] of Object.entries(help().ladders)) {
      const known = questionsOf(exerciseId).includes(q)
        ? new Set(helpedFrames(ctxOf(exerciseId, q)))
        : new Set<string>();
      extra.push(
        ...Object.keys(byFrame)
          .filter(id => !known.has(id))
          .map(id => `${q}/${id}`),
      );
    }
    expect(extra).toEqual([]);
  });

  test(`${exerciseId}: the help gives, never asks, in allowed words`, () => {
    const bad: string[] = [];
    const texts = [
      ...Object.values(help().ladders).flatMap(byFrame =>
        Object.values(byFrame).flatMap(ladderTexts),
      ),
      ...help().glossary.flatMap(e =>
        [...e.meaning, ...(e.use ?? [])].flatMap(richTexts),
      ),
    ];
    for (const t of texts) {
      if (/[?؟]/.test(t)) {
        bad.push(`asks: ${t}`);
      }
      for (const b of bannedIn(t)) {
        bad.push(`banned «${b.phrase}»: ${t}`);
      }
      for (const w of moreBannedIn(t)) {
        bad.push(`banned «${w}»: ${t}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test(`${exerciseId}: the small examples' numeric lines are true`, () => {
    const wrong: string[] = [];
    for (const [q, byFrame] of Object.entries(help().ladders)) {
      for (const [id, l] of Object.entries(byFrame)) {
        for (const line of l.example.lines) {
          const sides = numericSides(line.math);
          if (sides && sides.some(v => !sameRat(v, sides[0]!))) {
            wrong.push(`${q}/${id}: ${line.math}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  test(`${exerciseId}: each line to fill earns credit on its step`, () => {
    const failed: string[] = [];
    for (const [q, byFrame] of Object.entries(help().ladders)) {
      if (!questionsOf(exerciseId).includes(q)) {
        continue;
      }
      const ctx = ctxOf(exerciseId, q);
      for (const [id, l] of Object.entries(byFrame)) {
        const fill = l.method.fill;
        if (!fill || !ctx.frames.has(id)) {
          continue;
        }
        const slots = fill.template.match(/\{\}/g)?.length ?? 0;
        if (slots !== fill.answer.length) {
          failed.push(
            `${q}/${id}: ${slots} slots, ${fill.answer.length} answers`,
          );
          continue;
        }
        // Every value but the result is on a chip (the result may be typed).
        const offChip = fill.answer
          .slice(0, -1)
          .filter(v => !fill.chips.includes(v));
        if (offChip.length > 0) {
          failed.push(`${q}/${id}: not on a chip: ${offChip.join(', ')}`);
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
          failed.push(`${q}/${id}: ${a.raw} → ${r.out.reason}`);
        }
      }
    }
    expect(failed).toEqual([]);
  });

  test(`${exerciseId}: every example figure is a picture the registry draws`, () => {
    const refused: string[] = [];
    for (const [q, byFrame] of Object.entries(help().ladders)) {
      for (const [id, l] of Object.entries(byFrame)) {
        const fig = l.example.figure;
        const r = fig ? resolveSpec(fig) : null;
        if (r && !r.ok) {
          refused.push(`${q}/${id}: ${r.detail.slice(0, 160)}`);
        }
      }
    }
    expect(refused).toEqual([]);
  });

  test(`${exerciseId}: a glossary with unique ids`, () => {
    const ids = help().glossary.map(e => e.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('glossaryMatches', () => {
  const id = 'bac2022c-ex4';
  const idsOf = (pressed: string) =>
    glossaryMatches(id, pressed).map(e => e.id);

  test('a French word inside another word is not a match ("paire" in "impaire")', () => {
    const inImpaire = idsOf('Montrer que h est impaire.');
    const paire = helpFor(id)!.glossary.find(e =>
      e.match.some(m => m.trim() === 'paire'),
    );
    expect(paire).toBeDefined();
    expect(inImpaire).not.toContain(paire!.id);
  });

  test('a whole sentence names the entries it holds; an empty press names none', () => {
    expect(idsOf('Montrer que f est paire.').length).toBeGreaterThan(0);
    expect(idsOf('   ')).toEqual([]);
  });
});
