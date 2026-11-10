/**
 * Prepared replies with his own numbers (plan v2 A4). A template matches the
 * act the conductor just answered (its frame or card, the reason, what the
 * engine read in his line) and is filled from his lines, the statement's
 * numbers and the nodes he earned, never from a value he has not found. The
 * filled message goes through verifyAsk like an AI message; a slot that
 * cannot be filled, or a rejection, gives null and the conductor's own reply
 * (out.reply) is shown.
 *
 * A reply that ends with the next hint (hintPending) is kept as it is: the
 * hint counts only when it is shown (applyFallback), so a template never
 * replaces it.
 */
import { plain } from '../../ai/checks/lines';
import type { SessionState, StudentLine } from '../../ai/session/state';
import { restoreRuntime } from '../../ai/session/state';
import { AskStudentSchema, type Block } from '../../ai/tools/schemas';
import { verifyAsk, type RenderBlock } from '../../ai/verify/message';
import scEx2 from '../../content/replyTemplates.sc-ex2.json';
import type { MethodFrameStep } from '../../content/schema';
import { multiplyBackCheck } from '../../method/checks';
import { evalChain, lineLatex } from '../../method/lineChain';
import type { QuestionCtx } from '../conductor/conductor';
import type { ActOut, ConductorState } from '../conductor/types';
import type { Templates } from '../mover';
import {
  ReplyTemplateFileSchema,
  type LineKind,
  type LineRef,
  type ReplyTemplate,
  type ReplyTemplateFile,
  type Segment,
  type When,
} from './schema';

/** What the templates know about the act just answered. */
export interface ActSeen {
  frameId: string;
  step: MethodFrameStep;
  /** The card key of a lines frame. */
  card: string | null;
  /** His line of this act (a line on a lines frame), null otherwise. */
  line: StudentLine | null;
  kind: LineKind | null;
  /** The node his line settles, earns or slips on. */
  node: string | null;
  misconceptionId: string | null;
  /** Hints used on the frame after the act. */
  hints: number;
}

function kindOf(l: StudentLine): LineKind | null {
  const v = l.verdict;
  if (!v.readable) {
    return null;
  }
  if (v.unfinished) {
    return 'unfinished';
  }
  if (v.equal === false) {
    return 'mismatch';
  }
  const m = l.match;
  switch (m?.verdict) {
    case 'credit':
      return m.unsimplified
        ? 'unsimplified'
        : m.derivation === 'absent'
        ? 'bare'
        : 'credit';
    case 'support':
      return 'support';
    case 'slip':
    case 'known_wrong':
      return 'slip';
    default:
      return null;
  }
}

/** The act's frame (the one before when the route moved) and his line of this act. */
export function seen(
  ctx: QuestionCtx,
  state: ConductorState,
  out: ActOut,
): ActSeen | null {
  const frameId = state.route[out.advanced ? state.at - 1 : state.at];
  const step = frameId === undefined ? undefined : ctx.frames.get(frameId);
  if (frameId === undefined || !step) {
    return null;
  }
  const card = step.frame.type === 'lines' ? step.frame.key : null;
  // The conductor records his line on the turn of the act (none for a readback question).
  const last = state.session.lines[state.session.lines.length - 1];
  const line =
    card !== null && last && last.turn === state.turn && last.graph === 'main'
      ? last
      : null;
  const kind = line ? kindOf(line) : null;
  const m = line?.match;
  return {
    frameId,
    step,
    card,
    line,
    kind,
    node: m && 'node' in m ? m.node : null,
    misconceptionId:
      kind !== 'slip'
        ? null
        : m?.verdict === 'slip'
        ? `mut.${m.slip}`
        : m?.verdict === 'known_wrong'
        ? m.misconception
        : null,
    hints: state.progress.hints,
  };
}

export function matches(w: When, a: ActSeen, out: ActOut): boolean {
  return (
    w.reasons.includes(out.reason) &&
    (w.frame === undefined || w.frame === a.frameId) &&
    (w.card === undefined || w.card === a.card) &&
    (w.misconception === undefined || w.misconception === a.misconceptionId) &&
    (w.line === undefined || w.line === a.kind) &&
    (w.node === undefined || w.node === a.node) &&
    (w.hints === undefined || w.hints === a.hints)
  );
}

/**
 * One of his lines: this act's, the one that earned a node (credited, or a
 * right intermediate), or his right line on a small case.
 */
function lineFor(
  ref: LineRef,
  a: ActSeen,
  s: SessionState,
): StudentLine | null {
  if (ref === 'act') {
    return a.line;
  }
  const [where, node] = ref.split(':');
  const earned = new Set(s.credited.main ?? []);
  for (let i = s.lines.length - 1; i >= 0; i--) {
    const l = s.lines[i]!;
    const m = l.match;
    if (!m || !('node' in m) || m.node !== node) {
      continue;
    }
    if (
      where === 'node' &&
      l.graph === 'main' &&
      ((m.verdict === 'credit' && earned.has(m.node)) ||
        m.verdict === 'support')
    ) {
      return l;
    }
    if (
      where === 'case' &&
      l.graph !== null &&
      l.graph !== 'main' &&
      m.verdict === 'credit'
    ) {
      return l;
    }
  }
  return null;
}

/** The message block of one segment; null when it cannot be filled. */
function blockFor(
  seg: Segment,
  ctx: QuestionCtx,
  s: SessionState,
  a: ActSeen,
): Block[] | null {
  if ('ar' in seg) {
    return [{ type: 'ar', text: seg.ar }];
  }
  if ('fr' in seg) {
    return [{ type: 'fr', text: seg.fr }];
  }
  if ('line' in seg) {
    const l = lineFor(seg.line, a, s);
    return l ? [{ type: 'student_line', line_id: l.id }] : null;
  }
  if ('compare' in seg) {
    const x = lineFor(seg.compare[0], a, s);
    const y = lineFor(seg.compare[1], a, s);
    return x && y && x.id !== y.id
      ? [{ type: 'compare', line_ids: [x.id, y.id] }]
      : null;
  }
  if ('value' in seg) {
    // Only a finished line whose "=" holds: its value is his own result.
    const v = lineFor(seg.value, a, s)?.verdict;
    return v?.readable && !v.unfinished && v.equal !== false && v.value
      ? [{ type: 'math', latex: lineLatex(v.value) }]
      : null;
  }
  if ('check' in seg) {
    const l = lineFor(seg.check, a, s);
    const chain = l ? evalChain(l.raw) : null;
    const back = chain?.kind === 'chain' ? multiplyBackCheck(chain) : null;
    return back ? [{ type: 'math', latex: lineLatex(back.expr) }] : null;
  }
  if ('target' in seg) {
    const t = a.step.target;
    if (!t || t.ar !== undefined) {
      return null;
    }
    const out: Block[] = [];
    if (t.fr !== undefined) {
      out.push({ type: 'fr', text: t.fr });
    }
    if (t.math !== undefined) {
      out.push({ type: 'math', latex: t.math });
    }
    return out;
  }
  // A value of the exercise, only when the question's statement shows it.
  const v = ctx.loaded.values.get(seg.given);
  const p = v ? plain(v) : null;
  return p !== null && s.given.includes(p)
    ? [{ type: 'math', latex: lineLatex(p) }]
    : null;
}

/** One template filled for this act, checked by verifyAsk; null when it cannot be. */
export function fill(
  t: ReplyTemplate,
  ctx: QuestionCtx,
  state: ConductorState,
  out: ActOut,
): RenderBlock[] | null {
  const a = out.hintPending ? null : seen(ctx, state, out);
  if (!a) {
    return null;
  }
  const message: Block[] = [];
  for (const seg of t.say) {
    const blocks = blockFor(seg, ctx, state.session, a);
    if (!blocks) {
      return null;
    }
    message.push(...blocks);
  }
  const ask = AskStudentSchema.safeParse({
    message,
    input: { kind: 'continue' },
    intent: 'other',
  });
  if (!ask.success) {
    return null;
  }
  const r = verifyAsk(ask.data, {
    rt: restoreRuntime(state.session, ctx.pack.main),
    pack: ctx.pack,
    experiment: null,
  });
  return r.ok && r.component === null ? r.blocks : null;
}

/** The first template that matches this act and fills, with its id. */
export function pick(
  file: ReplyTemplateFile,
  ctx: QuestionCtx,
  state: ConductorState,
  out: ActOut,
): { id: string; blocks: RenderBlock[] } | null {
  if (file.exerciseId !== ctx.exerciseId || out.hintPending) {
    return null;
  }
  const a = seen(ctx, state, out);
  if (!a) {
    return null;
  }
  for (const t of file.templates) {
    if (!matches(t.when, a, out)) {
      continue;
    }
    const blocks = fill(t, ctx, state, out);
    if (blocks) {
      return { id: t.id, blocks };
    }
  }
  return null;
}

/** The template files by exercise; a file that does not parse gives no templates (tests catch it). */
const parsed = ReplyTemplateFileSchema.safeParse(scEx2);
export const TEMPLATE_FILES: readonly ReplyTemplateFile[] = parsed.success
  ? [parsed.data]
  : [];

export const templates: Templates = (ctx, state, out) => {
  const file = TEMPLATE_FILES.find(f => f.exerciseId === ctx.exerciseId);
  return file ? pick(file, ctx, state, out)?.blocks ?? null : null;
};
