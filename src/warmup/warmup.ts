/**
 * The warm-up of an exercise (owner, 2026-11-17): a few small questions asked
 * once, before the whole exercise, on what its questions need. Each exercise
 * has its own (`warmup` in its JSON). Pure: the screen keeps the state.
 *
 * - The main questions are asked in order; a missed one (wrong, or «ما
 *   نعرفش») brings its easier question (`down`, an older skill) next, so a
 *   few questions find where it breaks. At most MAX_ASKED questions.
 * - A line is judged by the engine (the board's reader: numbers, C(n,k),
 *   n!), never by the language; an unreadable line is not an answer.
 * - Nothing is marked right or wrong on screen: the end says one general
 *   sentence, and the answers go to his profile and to the tutor.
 */
import type { Warmup, WarmupQuestion } from '../content/schema';
import { SKILLS } from '../content/skills';
import { ratToString, sameRat } from '../engine/rationalFormat';
import type { Fraction } from '../engine/rational';
import { evalChain } from '../method/lineChain';

export const MAX_ASKED = 5;

export type WarmupVerdict = 'right' | 'wrong' | 'dont_know' | 'skipped';

export interface WarmupAnswer {
  id: string;
  skill: string;
  verdict: WarmupVerdict;
  /** What he wrote or picked (his line, or the card id). */
  given?: string | undefined;
  /** What a known wrong answer says about him (English, for the tutor). */
  means?: string | undefined;
}

export interface WarmupState {
  /** Questions still to ask, the next first. */
  queue: string[];
  asked: WarmupAnswer[];
  done: boolean;
}

export type WarmupAct =
  | { kind: 'line'; raw: string }
  | { kind: 'pick'; cardId: string }
  | { kind: 'dont_know' }
  | { kind: 'skip' };

const byId = (w: Warmup) => new Map(w.questions.map(q => [q.id, q]));

/** The value of a calculation line (the board's reader), or null. */
export function lineValue(raw: string): Fraction | null {
  const c = evalChain(raw);
  return c.kind === 'unreadable' ? null : c.value;
}

export function startWarmup(w: Warmup): WarmupState {
  return { queue: [...w.start], asked: [], done: false };
}

export function currentQuestion(
  w: Warmup,
  s: WarmupState,
): WarmupQuestion | null {
  if (s.done) {
    return null;
  }
  const id = s.queue[0];
  return id === undefined ? null : byId(w).get(id) ?? null;
}

/**
 * One act on the warm-up. `readable: false` when a line could not be read
 * (nothing is counted: he writes it again).
 */
export function answerWarmup(
  w: Warmup,
  s: WarmupState,
  act: WarmupAct,
): { state: WarmupState; readable: boolean } {
  const q = currentQuestion(w, s);
  if (!q) {
    return { state: s, readable: true };
  }
  if (act.kind === 'skip') {
    const rest = s.queue.flatMap(id => {
      const x = byId(w).get(id);
      return x ? [{ id, skill: x.skill, verdict: 'skipped' as const }] : [];
    });
    return {
      state: { queue: [], asked: [...s.asked, ...rest], done: true },
      readable: true,
    };
  }
  let answer: WarmupAnswer;
  if (act.kind === 'dont_know') {
    answer = { id: q.id, skill: q.skill, verdict: 'dont_know' };
  } else if (act.kind === 'line' && q.input.kind === 'line') {
    const v = lineValue(act.raw);
    if (v === null) {
      return { state: s, readable: false };
    }
    const right = lineValue(q.input.answer)!;
    const known = q.input.wrong.find(x => {
      const wv = lineValue(x.expr);
      return wv !== null && sameRat(wv, v);
    });
    answer = {
      id: q.id,
      skill: q.skill,
      verdict: sameRat(v, right) ? 'right' : 'wrong',
      given: act.raw,
      ...(!sameRat(v, right) && known && { means: known.means }),
    };
  } else if (act.kind === 'pick' && q.input.kind === 'pick') {
    const card = q.input.cards.find(c => c.id === act.cardId);
    if (!card) {
      return { state: s, readable: false };
    }
    // A card: what it means says it all (its id means nothing to the tutor).
    answer = {
      id: q.id,
      skill: q.skill,
      verdict: card.truth === 'true' ? 'right' : 'wrong',
      ...(card.means !== undefined && { means: card.means }),
    };
  } else {
    return { state: s, readable: false };
  }
  const asked = [...s.asked, answer];
  const missed = answer.verdict !== 'right';
  const queue = [
    ...(missed && q.down !== undefined ? [q.down] : []),
    ...s.queue.slice(1),
  ];
  const done = queue.length === 0 || asked.length >= MAX_ASKED;
  return {
    state: { queue: done ? [] : queue, asked, done },
    readable: true,
  };
}

/** What the warm-up checks (the explanation screen's chips): the main questions' topics, once each. */
export function warmupTopics(w: Warmup): string[] {
  const m = byId(w);
  return [
    ...new Set(
      w.start.flatMap(id => {
        const q = m.get(id);
        return q ? [q.topic] : [];
      }),
    ),
  ];
}

/** Did he miss anything (the end's sentence)? */
export const hadGaps = (s: WarmupState): boolean =>
  s.asked.some(a => a.verdict === 'wrong' || a.verdict === 'dont_know');

/** His answers for the tutor: one line each, engine-checked. */
export function warmupLines(answers: readonly WarmupAnswer[]): string[] {
  const year = new Map(SKILLS.map.skills.map(x => [x.id, x.year]));
  return answers.map(a => {
    const y = year.get(a.skill);
    const what =
      a.verdict === 'right'
        ? 'right'
        : a.verdict === 'dont_know'
        ? '«ما نعرفش»'
        : a.verdict === 'skipped'
        ? 'skipped'
        : `wrong${a.given ? ` (wrote ${a.given})` : ''}${
            a.means ? `: ${a.means}` : ''
          }`;
    return `- ${a.skill}${y ? ` (${y})` : ''}: ${what}`;
  });
}

/** Content checks (the loader's): every answer read by the engine, links and skills that exist. */
export function warmupIssues(w: Warmup): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const q of w.questions) {
    if (ids.has(q.id)) {
      out.push(`warmup: duplicate question ${q.id}`);
    }
    ids.add(q.id);
    if (!SKILLS.has(q.skill)) {
      out.push(`warmup ${q.id}: unknown skill ${q.skill}`);
    }
    if (q.input.kind === 'line') {
      const right = lineValue(q.input.answer);
      if (right === null) {
        out.push(`warmup ${q.id}: the answer ${q.input.answer} does not read`);
      }
      for (const x of q.input.wrong) {
        const v = lineValue(x.expr);
        if (v === null) {
          out.push(`warmup ${q.id}: the wrong value ${x.expr} does not read`);
        } else if (right && sameRat(v, right)) {
          out.push(
            `warmup ${q.id}: the wrong value ${
              x.expr
            } equals the answer ${ratToString(right)}`,
          );
        }
      }
    } else if (q.input.cards.filter(c => c.truth === 'true').length !== 1) {
      out.push(`warmup ${q.id}: a pick needs exactly one right card`);
    }
  }
  for (const q of w.questions) {
    if (q.down !== undefined && !ids.has(q.down)) {
      out.push(`warmup ${q.id}: unknown easier question ${q.down}`);
    }
    if (q.down === q.id) {
      out.push(`warmup ${q.id}: its easier question is itself`);
    }
  }
  for (const id of w.start) {
    if (!ids.has(id)) {
      out.push(`warmup: unknown start question ${id}`);
    }
  }
  return out;
}
