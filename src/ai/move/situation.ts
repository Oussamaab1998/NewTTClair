/**
 * The situation of the move mode (plan v2 A5): the user message of one move
 * call, at most 4,000 characters (tested). Model-facing English; his own
 * words and lines verbatim. It says why the AI is called (the conductor's
 * reason and the engine's diagnosis), the step he acted on (now / why /
 * next), his lines L1.. with their engine values, his act, the last
 * exchanges (the mover's own memory: ConductorState keeps none), what was
 * already tried, earlier results, a short profile digest, the allowed moves,
 * and the prepared reply rendered as text.
 */
import type { StudentAct } from '../checks/autoCheck';
import { mathSegments } from '../checks/freeText';
import { plain, readLine } from '../checks/lines';
import type { MethodFrameStep, Rich } from '../../content/schema';
import { view, type QuestionCtx } from '../../hybrid/conductor/conductor';
import type {
  ConductorState,
  DeepReason,
  LightReason,
  Reason,
} from '../../hybrid/conductor/types';
import type { AiTier, MoveRequest } from '../../hybrid/mover';
import type { ReplyPart } from '../../method/replies';
import type { MethodNote } from '../../method/note';
import { richText } from '../packs/build';
import type { StudentLine } from '../session/state';
import type { MoveKind } from './tool';

export const SITUATION_MAX = 4_000;

const REASON_TEXT: Readonly<Record<LightReason | DeepReason, string>> = {
  free_text: 'he wrote free text on this step',
  case_line:
    'a line he wrote on the small case of your last move (the engine judged it on that case)',
  slip_no_reply: 'a known slip with no prepared explanation',
  slip_again: 'the same known slip a second time on this step',
  pick_again: 'a wrong card again on this pick',
  component_result: 'what he did with a component',
  similar_other: 'a line of his similar question the engine could not label',
  undiagnosed: 'a wrong line the engine does not recognise',
  stuck_again: 'a second «ما نعرفش» on this step',
  claim: 'a sentence with his own calculation or rule: test it',
  slip_third: 'the same known slip a third time on this step',
};

/** One act the mover answered (or let the prepared reply answer). */
export interface Exchange {
  turn: number;
  frameId: string;
  reason: Reason;
  tier: AiTier;
  act: string;
  /** What he was shown, compressed. */
  shown: string;
  by: 'ai' | 'prepared';
  move: MoveKind | null;
  /** The small case of the move, in words. */
  caseLabel: string | null;
}

/** The mover's memory of one question (ConductorState stores no exchanges). */
export interface MoveMemory {
  exchanges: Exchange[];
  lastTurn: number;
}

const clip = (s: string, n: number): string =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

const rt = (r: Rich | undefined | null): string =>
  r ? richText(r).replace(/\s+/g, ' ').trim() : '';

// ---------------------------------------------------------------------------
// His act, the prepared reply and the AI's blocks as short text.

export function actText(a: StudentAct, step?: MethodFrameStep): string {
  switch (a.kind) {
    case 'free':
      return `free text «${a.text}»`;
    case 'dont_know':
      return 'tapped «ما نعرفش»';
    case 'continue':
      return 'tapped continue';
    case 'line':
      return `line «${a.raw}»${
        a.readback ? ` (he said he meant it ${a.readback})` : ''
      }`;
    case 'formula':
      return `formula «${a.raw}»`;
    case 'choice': {
      const f = step?.frame;
      const card =
        f?.type === 'cards'
          ? f.cards.find(c => c.id === a.optionId)
          : undefined;
      return `picked ${a.optionId}${card ? ` «${rt(card.text)}»` : ''}`;
    }
    case 'order':
      return `ordered [${a.ids.join(', ')}]`;
    case 'tap_word':
      return `tapped the word «${a.token}»`;
    case 'list':
      return `listed ${a.groups.length} groups: ${a.groups
        .slice(0, 12)
        .map(g => g.join(''))
        .join(', ')}`;
    case 'component':
      return `used the component: ${a.events
        .slice(-6)
        .map(e => e.name)
        .join(', ')}${
        a.result
          ? `; result ${clip(
              JSON.stringify({
                correct: a.result.correct,
                details: a.result.details,
              }),
              300,
            )}`
          : ''
      }`;
  }
}

function noteText(n: MethodNote): string {
  switch (n.kind) {
    case 'reason_order':
      return `why this order: ${n.clauses
        .map(c => `«${rt(c.card)}» after ${c.needs.map(x => `«${rt(x)}»`)}`)
        .join('; ')}`;
    case 'recap':
      return `recap: found «${rt(n.found)}»${
        n.line ? ` with his line «${n.line}»` : ''
      }${n.next ? `, next «${rt(n.next)}»` : ''}`;
    case 'credit':
      return `credit ${n.nodeId}${n.support ? ' (a supporting step)' : ''}${
        n.unsimplified ? ', not simplified' : ''
      }`;
    case 'plan_violation':
      return `«${rt(n.card)}» needs ${n.needs.map(x => `«${rt(x)}»`)}`;
    case 'neutral':
      return `note ${n.code}${n.line ? ` on «${n.line}»` : ''}${
        n.check ? `, check ${n.check}` : ''
      }`;
    case 'claim_result':
      return `claim tested: ${n.rows
        .map(
          r =>
            `${r.label ?? ''} predicted ${r.predicted}, actual ${r.actual}${
              r.holds ? '' : ' (breaks)'
            }`,
        )
        .join('; ')}`;
    case 'list_help':
      return `list help, level ${n.level}`;
    case 'recipe':
      return 'his recipe beside the clean one';
    case 'review':
      return `review «${n.raw}»: ${n.outcome}${n.nodeId ? ` ${n.nodeId}` : ''}${
        n.id ? ` ${n.id}` : ''
      }`;
    case 'target':
      return `his result «${n.line}» against the exam's «${rt(n.target)}»`;
  }
}

export function replyText(parts: readonly ReplyPart[]): string {
  return parts
    .map(p => {
      switch (p.kind) {
        case 'student':
          return p.content.kind === 'typed'
            ? `[his line «${p.content.raw}»]`
            : `[his answer «${rt(p.content.rich)}»]`;
        case 'note':
          return `[${noteText(p.note)}]`;
        case 'feedback':
          return `«${rt(p.rich)}»`;
        case 'message':
          return `[app: ${p.message}]`;
      }
    })
    .join(' ');
}

/** His raw lines inside the prepared reply (a similar question's lines are not in the session). */
export function replyLines(parts: readonly ReplyPart[]): string[] {
  return parts.flatMap(p =>
    p.kind === 'student' && p.content.kind === 'typed'
      ? [p.content.raw]
      : p.kind === 'note' && p.note.kind === 'review'
      ? [p.note.raw]
      : [],
  );
}

// ---------------------------------------------------------------------------
// The engine's diagnosis.

/** The frame he acted on (the route moved on after a credit or a review). */
export function actedFrame(
  ctx: QuestionCtx,
  req: MoveRequest,
): MethodFrameStep | undefined {
  const s = req.state;
  const id = req.out.advanced ? s.route[s.at - 1] : s.route[s.at];
  return id === undefined ? undefined : ctx.frames.get(id);
}

const bare = (id: string): string => id.replace(/^mut\./, '');

function lineSummary(l: StudentLine): string {
  const v = l.verdict;
  const parts: string[] = [];
  if (!v.readable) {
    parts.push(`unreadable${v.reason ? ` (${v.reason})` : ''}`);
  } else {
    parts.push(v.sides.map(s => `${s.text} [${s.value}]`).join(' = '));
    if (v.equal === false) {
      parts.push('an "=" does not hold');
    }
    if (v.unfinished) {
      parts.push('no result written');
    }
    if (v.readback) {
      parts.push(`ambiguous: grouped reading ${v.readback.grouped}`);
    }
    if (v.checks.above_one) {
      parts.push('above one');
    }
    if (v.checks.unreduced_written) {
      parts.push('not simplified');
    }
  }
  const m = l.match;
  if (m) {
    parts.push(
      m.verdict === 'slip'
        ? `slip ${m.slip} at ${m.node} (${m.strength})`
        : m.verdict === 'known_wrong'
        ? `known wrong ${bare(m.misconception)}`
        : m.verdict === 'ambiguous'
        ? `ambiguous slips ${m.slips.join(', ')}`
        : m.verdict === 'no_match'
        ? 'no match'
        : `${m.verdict} ${m.node}`,
    );
  }
  return clip(`${l.id} «${clip(l.raw, 120)}»: ${parts.join('; ')}`, 240);
}

export interface Diagnosis {
  lines: string[];
  /** The slip he made (bare id), when the engine names one. */
  slip: string | null;
}

export function diagnose(ctx: QuestionCtx, req: MoveRequest): Diagnosis {
  const { act: a, out, state } = req;
  const lines: string[] = [];
  let slip: string | null = null;
  const p = state.progress;
  const step = actedFrame(ctx, req);
  const describe = (id: string) => {
    const m =
      ctx.loaded.misconceptions.get(id) ??
      ctx.loaded.misconceptions.get(`mut.${id}`);
    return m ? `: ${m.description}` : '';
  };
  if (a.kind === 'line') {
    const mine = state.session.lines.filter(l => l.turn === state.turn);
    const last = mine[mine.length - 1];
    if (last) {
      lines.push(`His line ${lineSummary(last)}`);
      if (last.match?.verdict === 'slip') {
        slip = last.match.slip;
      } else if (last.match?.verdict === 'known_wrong') {
        slip = bare(last.match.misconception);
      }
    }
    const seen = Object.entries(p.slips).sort((x, y) => y[1] - x[1]);
    const same = seen.find(([id]) => slip !== null && bare(id) === slip);
    const top = same ?? seen[0] ?? null;
    if (top && out.reason.startsWith('slip_')) {
      slip = bare(top[0]);
      lines.push(
        `Slip ${slip}${describe(top[0])} Seen ${top[1]} time(s) on this step.`,
      );
    } else if (slip) {
      lines.push(`Slip ${slip}${describe(slip)}`);
    }
  } else if (a.kind === 'choice' && step?.frame.type === 'cards') {
    const card = step.frame.cards.find(c => c.id === a.optionId);
    if (card) {
      lines.push(
        `He picked «${rt(card.text)}» (${card.truth}${
          card.misconceptionId ? `, slip ${bare(card.misconceptionId)}` : ''
        }); wrong picks on this step: ${p.attempts}.`,
      );
      slip = card.misconceptionId ? bare(card.misconceptionId) : null;
    }
  } else if (a.kind === 'free') {
    const segs = mathSegments(a.text).slice(0, 4);
    for (const seg of segs) {
      const c = readLine(seg).chain;
      lines.push(
        c.kind === 'unreadable'
          ? `In his text: «${seg}» (unreadable)`
          : c.kind === 'chain'
          ? `In his text: «${seg}»: sides ${c.sides
              .map(x => plain(x.value))
              .join(' = ')}, ${
              c.equal ? 'every "=" holds' : 'an "=" does not hold'
            }`
          : `In his text: «${seg}» = ${plain(c.side.value)}`,
      );
    }
  } else if (a.kind === 'dont_know') {
    lines.push(
      `«ما نعرفش» on this step: ${p.dontKnows}; hints of the ladder shown: ${p.hints}.`,
    );
  } else if (a.kind === 'component' && a.result) {
    lines.push(
      `Component result: correct ${String(a.result.correct)}; ${clip(
        JSON.stringify(a.result.details),
        300,
      )}`,
    );
  }
  if (out.reason === 'similar_other') {
    lines.push(
      'His lines on the similar question, as the engine reviewed them, are in the prepared reply below (other = not recognised).',
    );
  }
  return { lines, slip };
}

// ---------------------------------------------------------------------------
// The situation.

function stepLines(
  ctx: QuestionCtx,
  req: MoveRequest,
  step: MethodFrameStep | undefined,
): string[] {
  if (!step) {
    return ['Step: none (the question is over).'];
  }
  const f = step.frame;
  const out = [
    `Step he acted on: ${step.id} (${f.type}${
      f.type === 'lines' ? `, plan card ${f.cardId}` : ''
    }).`,
  ];
  if (step.header) {
    out.push(
      `Now «${rt(step.header.now)}». Why «${rt(step.header.why)}». Next «${rt(
        step.header.next,
      )}».`,
    );
  }
  if (f.type !== 'similar') {
    out.push(`Prompt: «${clip(rt(step.prompt), 300)}»`);
  }
  if (f.type === 'cards') {
    out.push(
      `Cards: ${f.cards
        .map(c => `${c.id} «${clip(rt(c.text), 90)}» (${c.truth})`)
        .join('; ')}`,
    );
  }
  if (f.type === 'similar') {
    out.push(`Similar question (${f.slot.kind}): ${rt(f.slot.statement)}`);
    const note = ctx.pack.notes?.route.find(r => /^Similar\b/.test(r));
    if (note) {
      out.push(`Route note: ${clip(note, 500)}`);
    }
  }
  if (f.type === 'repair') {
    const st = f.stages[req.state.progress.stage];
    if (st) {
      out.push(
        `Repair stage ${req.state.progress.stage + 1} of ${f.stages.length}: ${
          st.type
        }${
          'prompt' in st && st.prompt ? ` «${clip(rt(st.prompt), 200)}»` : ''
        }`,
      );
    }
  }
  if (req.out.advanced) {
    const next = view(ctx, req.state);
    out.push(
      next === null
        ? 'The engine moved on: the question is over.'
        : next.header
        ? `The engine moved on: the next step is «${rt(next.header.now)}».`
        : `The engine moved on: the next step is ${next.frameId} (${next.type}).`,
    );
  }
  return out;
}

/** Results of earlier questions this one builds on (his own, carried). */
function earlierResults(ctx: QuestionCtx): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const step of ctx.frames.values()) {
    for (const [name, ref] of Object.entries(step.inputs ?? {})) {
      const part = ref.from.split('/')[0] ?? '';
      const key = `${part}/${ref.node}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      for (const [k, a] of ctx.loaded.answers) {
        if (
          k.startsWith(`${part}/`) &&
          a.kind === 'method' &&
          a.frame === 'lines'
        ) {
          const n = a.graph.nodes.find(x => x.id === ref.node);
          if (n) {
            out.push(
              `${name} = ${plain(n.value)} (his ${
                ref.node
              } of question ${part})`,
            );
            break;
          }
        }
      }
    }
  }
  return out;
}

function earned(state: ConductorState): string[] {
  return Object.entries(state.nodeLines).map(
    ([node, raw]) => `${node} «${clip(raw, 80)}»`,
  );
}

function tried(
  req: MoveRequest,
  step: MethodFrameStep | undefined,
  memory: MoveMemory | null,
): string[] {
  const out: string[] = [];
  const p = req.state.progress;
  if (!req.out.advanced) {
    out.push(
      `On this step: wrong tries ${p.attempts}, «ما نعرفش» ${
        p.dontKnows
      }, hints shown ${p.hints}${
        p.shown.length > 0
          ? `, slips already explained: ${p.shown.map(bare).join(', ')}`
          : ''
      }.`,
    );
  }
  const moves = (memory?.exchanges ?? []).filter(
    e => e.by === 'ai' && e.frameId === step?.id && e.move !== null,
  );
  if (moves.length > 0) {
    out.push(
      `AI moves already made here: ${moves
        .map(
          e =>
            `${e.move}${e.caseLabel ? ` (${e.caseLabel})` : ''} at turn ${
              e.turn
            }`,
        )
        .join('; ')}.`,
    );
  }
  return out;
}

interface Section {
  title: string;
  lines: string[];
  /** Removed first when the situation is too long (0: never). */
  drop: number;
}

export interface SituationInput {
  ctx: QuestionCtx;
  req: MoveRequest;
  tier: AiTier;
  allowed: readonly MoveKind[];
  memory: MoveMemory | null;
  /** The profile digest (src/ai/profile/digest.ts), when the app has one. */
  profile: string | null;
  /** The light tier handed this moment over (escalate). */
  escalated?: boolean;
  diagnosis?: Diagnosis;
}

export function buildSituation(o: SituationInput): string {
  const { ctx, req } = o;
  const reason = req.out.reason as LightReason | DeepReason;
  const step = actedFrame(ctx, req);
  const diag = o.diagnosis ?? diagnose(ctx, req);
  const lines = req.state.session.lines;
  const sections: Section[] = [
    {
      title: `Move request: tier ${o.tier}, reason ${reason} (${
        REASON_TEXT[reason] ?? reason
      })${o.escalated ? '. The light tutor handed this moment to you' : ''}.`,
      lines: [],
      drop: 0,
    },
    { title: 'Engine diagnosis:', lines: diag.lines, drop: 0 },
    { title: 'Step:', lines: stepLines(ctx, req, step), drop: 0 },
    {
      title: 'His act (verbatim):',
      lines: [clip(actText(req.act, step), 800)],
      drop: 0,
    },
    {
      title:
        'His lines (show them with student_line / compare by id; never write the id):',
      lines: lines.slice(-6).map(lineSummary),
      drop: 3,
    },
    {
      title: 'Earned this question (his credited lines):',
      lines: earned(req.state),
      drop: 4,
    },
    {
      title: 'Earlier results he may reuse:',
      lines: earlierResults(ctx),
      drop: 5,
    },
    {
      title: 'Last exchanges (oldest first):',
      lines: (o.memory?.exchanges ?? [])
        .slice(-4)
        .map(
          e =>
            `- turn ${e.turn} ${e.frameId}: he ${clip(e.act, 120)} -> ${
              e.reason
            }; shown (${e.by}${e.move ? ` ${e.move}` : ''}): ${clip(
              e.shown,
              180,
            )}`,
        ),
      drop: 6,
    },
    { title: 'Already tried:', lines: tried(req, step, o.memory), drop: 2 },
    {
      title: 'Student profile:',
      lines: o.profile ? [clip(o.profile, 600)] : [],
      drop: 7,
    },
    {
      title: `Allowed moves: ${o.allowed.join(', ')}.`,
      lines: [],
      drop: 0,
    },
    {
      title: `Prepared reply (shown if you make no valid move${
        req.out.hintPending
          ? '; it ends with the next hint of the ladder, which your move keeps for later'
          : ''
      }):`,
      lines: [clip(replyText(req.out.reply) || '(nothing)', 900)],
      drop: 1,
    },
    { title: 'Answer with one tutor_move call.', lines: [], drop: 0 },
  ];
  const render = (ss: Section[]) =>
    ss
      .filter(s => s.lines.length > 0 || !s.title.endsWith(':'))
      .map(s => [s.title, ...s.lines].join('\n'))
      .join('\n');
  let kept = sections;
  let text = render(kept);
  // Too long: drop the least needed sections first.
  for (let level = 7; level >= 1 && text.length > SITUATION_MAX; level--) {
    kept = kept.filter(s => s.drop !== level);
    text = render(kept);
  }
  return text.length > SITUATION_MAX
    ? `${text.slice(0, SITUATION_MAX - 1)}…`
    : text;
}
