/**
 * What the student sees after an act on a method frame, decided from the
 * engine's verdict alone: notes, feedback, the recap. Pure: the lesson
 * reducer (src/lesson/session/lesson.ts) logs the events and moves the cards,
 * and the hybrid conductor (plan v2) uses the same decisions as its instant
 * replies. Moved out of the reducer with no change of behaviour (plan v2 A1).
 */
import type { ResolvedAnswer } from '../content/loader';
import type { Misconception, MethodFrameStep, Rich } from '../content/schema';
import type { AnswerValue } from '../lesson/session/types';
import { evaluatorOf } from './cards';
import { multiplyBackCheck } from './checks';
import {
  checkPlan,
  checkRead,
  evaluateLine,
  reviewLine,
  type LineOutcome,
  type PlanVerdict,
} from './frame';
import type { Graph } from './graph';
import { evalChain } from './lineChain';
import { reasonOrder } from './narration';
import type { MutationTable } from './mutations';
import type { MethodNote } from './note';
import { checkList, listedByFirstBall } from './repair';

export type ReplyTone = 'success' | 'warning' | 'info';

/** One item of the reply, in the order the student sees them. */
export type ReplyPart =
  | {
      kind: 'student';
      content: { kind: 'typed'; raw: string } | { kind: 'rich'; rich: Rich };
    }
  | { kind: 'note'; tone: ReplyTone; note: MethodNote }
  | { kind: 'feedback'; tone: ReplyTone; rich: Rich }
  | {
      kind: 'message';
      tone: ReplyTone;
      message: 'wrong' | 'correct' | 'invalidInput';
    };

type Frame<T extends MethodFrameStep['frame']['type']> = Extract<
  MethodFrameStep['frame'],
  { type: T }
>;
type Misconceptions = ReadonlyMap<string, Misconception>;
type RepairAnswer = Extract<ResolvedAnswer, { frame: 'repair' }>;

const typed = (raw: string): ReplyPart => ({
  kind: 'student',
  content: { kind: 'typed', raw },
});
const note = (tone: ReplyTone, n: MethodNote): ReplyPart => ({
  kind: 'note',
  tone,
  note: n,
});
const message = (
  tone: ReplyTone,
  m: 'wrong' | 'correct' | 'invalidInput',
): ReplyPart => ({ kind: 'message', tone, message: m });

/** A known slip's message: the confirmed wording when the engine is sure. */
function slipText(
  misconceptions: Misconceptions,
  id: string | undefined,
  strength: 'confirmed' | 'asked',
): Rich | undefined {
  const lib = id !== undefined ? misconceptions.get(id) : undefined;
  return strength === 'confirmed'
    ? lib?.feedbackConfirmed ?? lib?.feedback
    : lib?.feedback;
}

// ---------------------------------------------------------------------------
// A line of a lines frame.

export type LineVerdict =
  | {
      kind: 'unreadable';
      reason: Extract<LineOutcome, { kind: 'unreadable' }>['reason'];
    }
  /** Shown a note, not graded: the step stays open. */
  | {
      kind: 'ungraded';
      outcome: 'unfinished' | 'mismatch' | 'support' | 'repeat' | 'other_step';
      node?: string;
    }
  | { kind: 'credit'; node: string; unsimplified: boolean; completes: boolean }
  | {
      kind: 'wrong';
      misconceptionId?: string;
      inferredBy?: 'mutation' | 'procedure';
      /** A slip explained now for the first time on this step (each is explained once). */
      explained?: string;
    };

export interface LineReply {
  verdict: LineVerdict;
  parts: ReplyPart[];
}

export function replyForLine(
  o: LineOutcome,
  c: {
    raw: string;
    misconceptions: Misconceptions;
    /** Slips already explained on this step. */
    shown: readonly string[];
    /** The result the statement gives, when this card's line is the question's result. */
    target: Rich | null;
    /** The recap after the card's main line: what was found, what comes next. */
    recap: () => MethodNote;
  },
): LineReply {
  if (o.kind === 'unreadable') {
    return {
      verdict: { kind: 'unreadable', reason: o.reason },
      parts: [message('info', 'invalidInput')],
    };
  }
  const parts: ReplyPart[] = [typed(c.raw)];
  if (o.kind === 'unfinished') {
    parts.push(note('info', { kind: 'neutral', code: 'unfinished' }));
    return { verdict: { kind: 'ungraded', outcome: 'unfinished' }, parts };
  }
  if (o.kind === 'mismatch') {
    // A division that does not hold: he checks it himself (multiply back), with his own numbers.
    const chain = evalChain(c.raw);
    const back = chain.kind === 'chain' ? multiplyBackCheck(chain) : null;
    parts.push(
      note('info', {
        kind: 'neutral',
        code: 'mismatch',
        line: o.shown,
        ...(back && { check: back.expr }),
      }),
    );
    return { verdict: { kind: 'ungraded', outcome: 'mismatch' }, parts };
  }
  if (o.kind === 'support') {
    parts.push(
      note('info', {
        kind: 'credit',
        nodeId: o.node.id,
        support: true,
        derivation: o.derivation,
        unsimplified: false,
      }),
    );
    return {
      verdict: { kind: 'ungraded', outcome: 'support', node: o.node.id },
      parts,
    };
  }
  if (o.kind === 'repeat' || o.kind === 'other_step') {
    parts.push(note('info', { kind: 'neutral', code: o.kind }));
    return {
      verdict: { kind: 'ungraded', outcome: o.kind, node: o.node.id },
      parts,
    };
  }
  if (o.kind === 'credit') {
    // Unsimplified: right, but not the result yet (simplify until nothing is common).
    parts.push(
      note('success', {
        kind: 'credit',
        nodeId: o.node.id,
        support: false,
        derivation: o.derivation,
        unsimplified: o.unsimplified,
      }),
    );
    const completes = !o.unsimplified && o.completes;
    if (completes) {
      parts.push(note('info', c.recap()));
    }
    return {
      verdict: {
        kind: 'credit',
        node: o.node.id,
        unsimplified: o.unsimplified,
        completes,
      },
      parts,
    };
  }
  // A wrong line: a known slip, a known wrong value, or a value nobody expects.
  let misconceptionId: string | undefined;
  let strength: 'confirmed' | 'asked' = 'asked';
  let inferredBy: 'mutation' | 'procedure' | undefined;
  if (o.kind === 'mutation') {
    misconceptionId = o.misconceptionId;
    strength = o.strength;
    inferredBy = 'mutation';
  } else if (o.kind === 'value_only') {
    misconceptionId = o.misconceptionId;
    inferredBy = 'procedure';
  }
  const text = slipText(c.misconceptions, misconceptionId, strength);
  const fresh =
    misconceptionId !== undefined && !c.shown.includes(misconceptionId);
  let explained: string | undefined;
  if (fresh && text) {
    explained = misconceptionId;
    parts.push({ kind: 'feedback', tone: 'warning', rich: text });
  } else if (misconceptionId === undefined) {
    parts.push(
      note('warning', {
        kind: 'neutral',
        code: o.kind === 'ambiguous' ? 'ambiguous' : 'generic',
      }),
    );
  }
  // The statement gives the target: his result and the target, side by side.
  if (c.target) {
    parts.push(note('info', { kind: 'target', line: c.raw, target: c.target }));
  }
  return {
    verdict: {
      kind: 'wrong',
      ...(misconceptionId !== undefined && { misconceptionId }),
      ...(inferredBy && { inferredBy }),
      ...(explained !== undefined && { explained }),
    },
    parts,
  };
}

// ---------------------------------------------------------------------------
// The plan frame and the read frame.

export function replyForPlan(
  cards: Frame<'plan'>['cards'],
  order: readonly string[],
): { verdict: PlanVerdict; parts: ReplyPart[] } {
  const verdict = checkPlan(cards, order);
  if (verdict.ok) {
    return { verdict, parts: [note('info', reasonOrder(cards))] };
  }
  if (verdict.reason === 'dependency') {
    const shortOf = (id: string) => cards.find(c => c.id === id)?.short;
    return {
      verdict,
      parts: [
        note('warning', {
          kind: 'plan_violation',
          card: shortOf(verdict.card) ?? { ar: [{ ar: '?' }] },
          needs: verdict.needs
            .map(shortOf)
            .filter((r): r is Rich => r !== undefined),
        }),
      ],
    };
  }
  return { verdict, parts: [message('warning', 'wrong')] };
}

export function replyForRead(
  f: Frame<'read'>,
  token: string,
): { verdict: ReturnType<typeof checkRead>; parts: ReplyPart[] } {
  const verdict = checkRead(f.targets, token);
  return {
    verdict,
    parts: [
      typed(token),
      verdict.ok
        ? message('success', 'correct')
        : { kind: 'feedback', tone: 'warning', rich: f.notOrderWord },
    ],
  };
}

// ---------------------------------------------------------------------------
// A sentence card of a pick frame.

export interface CardsReply {
  verdict: {
    correct: boolean;
    misconceptionId?: string;
    /** The card's slip, explained now for the first time on this step. */
    explained?: string;
  };
  parts: ReplyPart[];
}

/** Null when the card or the frame's evaluator does not exist (the act is ignored). */
export function replyForCards(
  f: Frame<'cards'>,
  cardId: string,
  c: {
    graph: Graph;
    /** His credited lines by node id. */
    lines: Readonly<Record<string, string>>;
    misconceptions: Misconceptions;
    shown: readonly string[];
  },
): CardsReply | null {
  const card = f.cards.find(x => x.id === cardId);
  const evaluate = card ? evaluatorOf(f.evaluator) : undefined;
  if (!card || !evaluate) {
    return null;
  }
  const verdict = evaluate({
    card,
    cards: f.cards,
    args: f.args,
    graph: c.graph,
    lines: c.lines,
  });
  const parts: ReplyPart[] = [
    { kind: 'student', content: { kind: 'rich', rich: card.text } },
    ...verdict.notes.map(n => note('info', n)),
  ];
  if (verdict.correct) {
    parts.push(message('success', 'correct'));
    return { verdict: { correct: true }, parts };
  }
  const id = card.misconceptionId;
  const lib = id !== undefined ? c.misconceptions.get(id) : undefined;
  // Counted as explained once (a later line with the same slip is not told again).
  const explained =
    card.feedback === undefined &&
    id !== undefined &&
    !c.shown.includes(id) &&
    lib?.feedback
      ? id
      : undefined;
  const text = card.feedback ?? lib?.feedback;
  parts.push(
    text
      ? { kind: 'feedback', tone: 'warning', rich: text }
      : message('warning', 'wrong'),
  );
  return {
    verdict: {
      correct: false,
      ...(id !== undefined && { misconceptionId: id }),
      ...(explained !== undefined && { explained }),
    },
    parts,
  };
}

// ---------------------------------------------------------------------------
// One stage of an authored repair.

export interface RepairStageReply {
  /** The stage is done: the repair moves to the next one. */
  done: boolean;
  /** A list that is not complete yet (one more failure for the list help). */
  listFailed: boolean;
  /** A complete list: how he built it (logged). */
  listComplete?: { byFirstBall: boolean; groups: number };
  parts: ReplyPart[];
}

export function replyForRepairStage(
  stage: Frame<'repair'>['stages'][number],
  resolved: RepairAnswer['stages'][number],
  value: AnswerValue,
  c: {
    listFails: number;
    misconceptions: Misconceptions;
    lines: Readonly<Record<string, string>>;
    /** The longest line kept. */
    lineMax: number;
  },
): RepairStageReply {
  const out: RepairStageReply = { done: false, listFailed: false, parts: [] };
  if (stage.type === 'show' && 'ack' in value) {
    out.done = true;
  } else if (stage.type === 'component' && 'explored' in value) {
    out.done = true;
  } else if (stage.type === 'list' && 'list' in value) {
    const v = checkList(resolved, value.list, c.listFails);
    if (v.complete) {
      out.listComplete = {
        byFirstBall: listedByFirstBall(resolved, value.list),
        groups: v.merged.length,
      };
      out.done = true;
    } else {
      out.listFailed = true;
      const labelOf = (id: string) =>
        resolved.balls?.find(b => b.id === id)?.label ?? id;
      out.parts.push(
        note('info', {
          kind: 'list_help',
          level: v.level ?? 1,
          ...(v.ball !== undefined && { ball: labelOf(v.ball) }),
          ...(v.group && { group: v.group.map(labelOf) }),
        }),
      );
    }
  } else if (
    stage.type === 'line' &&
    'mline' in value &&
    resolved.graph &&
    resolved.table
  ) {
    const raw = value.mline.slice(0, c.lineMax);
    const node = resolved.graph.nodes.find(n => n.id === stage.node);
    out.parts.push(typed(raw));
    const o = evaluateLine({
      raw,
      graph: resolved.graph,
      table: resolved.table,
      card: node?.planCard ?? 'total',
      credited: new Set(),
    }).outcome;
    if (
      (o.kind === 'credit' || o.kind === 'support') &&
      o.node.id === stage.node
    ) {
      out.done = true;
    } else if (o.kind === 'mutation') {
      const text = slipText(c.misconceptions, o.misconceptionId, o.strength);
      out.parts.push(
        text
          ? { kind: 'feedback', tone: 'warning', rich: text }
          : message('warning', 'wrong'),
      );
    } else if (o.kind === 'unreadable') {
      out.parts.push(message('info', 'invalidInput'));
    } else {
      out.parts.push(
        note('info', {
          kind: 'neutral',
          code:
            o.kind === 'unfinished'
              ? 'unfinished'
              : o.kind === 'mismatch'
              ? 'mismatch'
              : 'generic',
          ...(o.kind === 'mismatch' && { line: o.shown }),
        }),
      );
    }
  } else if (stage.type === 'cards' && 'card' in value) {
    const card = stage.cards.find(x => x.id === value.card);
    const evaluate = evaluatorOf(stage.evaluator);
    if (card && evaluate) {
      const verdict = evaluate({
        card,
        cards: stage.cards,
        args: stage.args,
        ...(resolved.graph && { graph: resolved.graph }),
        lines: c.lines,
      });
      out.parts.push(
        { kind: 'student', content: { kind: 'rich', rich: card.text } },
        ...verdict.notes.map(n => note('info', n)),
      );
      if (verdict.correct) {
        out.done = true;
      } else {
        out.parts.push(
          card.feedback
            ? { kind: 'feedback', tone: 'warning', rich: card.feedback }
            : message('warning', 'wrong'),
        );
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The recipe: 3 to 5 sentence cards in his order, next to the clean recipe.

/** Null when the pick is not 3 to 5 distinct cards of the pool (the act is ignored). */
export function replyForRecipe(
  f: Frame<'recipe'>,
  ids: readonly string[],
): { picked: string[]; parts: ReplyPart[] } | null {
  const byId = new Map(f.pool.map(c => [c.id, c]));
  const picked = ids.slice(0, 5);
  if (
    picked.length < 3 ||
    new Set(picked).size !== picked.length ||
    !picked.every(id => byId.has(id))
  ) {
    return null;
  }
  return {
    picked,
    parts: [
      note('info', {
        kind: 'recipe',
        mine: picked.map(id => byId.get(id)!.text),
        clean: f.clean
          .map(id => byId.get(id)?.text)
          .filter((r): r is Rich => r !== undefined),
        ...(f.methodCard && { card: f.methodCard }),
      }),
    ],
  };
}

// ---------------------------------------------------------------------------
// A similar question, reviewed after he submits (nothing is said while he writes).

export function reviewSimilar(
  graph: Graph,
  table: MutationTable,
  lines: readonly string[],
): {
  reviews: { raw: string; outcome: string; id?: string; nodeId?: string }[];
  parts: ReplyPart[];
} {
  const credited = new Set<string>();
  const reviews: {
    raw: string;
    outcome: string;
    id?: string;
    nodeId?: string;
  }[] = [];
  const parts: ReplyPart[] = [];
  for (const raw of lines) {
    const r = reviewLine(graph, table, raw, credited);
    if (r.nodeId && r.outcome === 'credit') {
      credited.add(r.nodeId);
    }
    reviews.push({ raw, ...r });
    parts.push(
      note(r.outcome === 'credit' ? 'success' : 'info', {
        kind: 'review',
        raw,
        ...r,
      }),
    );
  }
  return { reviews, parts };
}
