/**
 * The exercise context of a teacher call, from the lesson's question and his
 * state: the statement, the question, the step he is on, his credited lines,
 * his results of earlier questions, and the values he has not found yet (the
 * answer is refused if it holds one, or, on a tree, the calculation of one).
 * Built on each question he asks (his state moves between two questions).
 */
import type { Rich } from '../../content/schema';
import { view, type QuestionCtx } from '../../hybrid/conductor/conductor';
import type { ConductorState } from '../../hybrid/conductor/types';
import { numbersIn } from '../../planner/llm/numbers';
import { plain } from '../checks/lines';
import { experimentOf } from '../move/pack';
import { nodeMeaning, richText } from '../packs/build';
import { restoreRuntime, type SessionState } from '../session/state';
import { forbiddenValues, type VerifyContext } from '../verify/message';
import type { TeacherContext } from './types';

/** The longest context text (statement and lines clipped first). */
export const CONTEXT_MAX = 3_000;

const clip = (s: string, n: number): string =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

/** The session a teacher answer is checked against (a copy: the lesson's state is never touched). */
function verifyContext(ctx: QuestionCtx, state: ConductorState): VerifyContext {
  const session = JSON.parse(JSON.stringify(state.session)) as SessionState;
  // A tree keeps its quantities from one question to the next: his results
  // of the earlier questions are numbers he has (as the mover reads them).
  if (ctx.pack.domain === 'tree') {
    for (const c of Object.values(state.carried ?? {})) {
      for (const p of numbersIn(c.value).map(plain)) {
        if (!session.given.includes(p)) {
          session.given.push(p);
        }
      }
    }
  }
  return {
    rt: restoreRuntime(session, ctx.pack.main),
    pack: ctx.pack,
    experiment: experimentOf(ctx),
  };
}

/** The values of the question he must not be given (never revealed by the teacher). */
function hiddenLines(c: VerifyContext): string[] {
  const g = c.rt.graphs.get('main')?.graph;
  if (!g) {
    return [];
  }
  return forbiddenValues(c, Number.POSITIVE_INFINITY).map(f => {
    const node = g.nodes.find(n => n.id === f.node);
    const what = node ? node.label ?? nodeMeaning(g, node) : f.node;
    return `${what} = ${plain(f.value)}`;
  });
}

export function teacherContext(
  ctx: QuestionCtx,
  state: ConductorState,
): TeacherContext {
  const verify = verifyContext(ctx, state);
  const hidden = hiddenLines(verify);
  const ex = ctx.loaded.exercise;
  const out: string[] = [
    `Exercise ${ex.id}, question ${ctx.pack.label} (id ${ctx.questionId}).`,
    `Statement (exam French): ${clip(richText(ex.statement as Rich), 1_200)}`,
    `Question (exam French): ${clip(ctx.pack.wording, 400)}`,
  ];
  const frame = view(ctx, state);
  if (state.done) {
    out.push('He has finished this question.');
  } else if (frame) {
    const now = frame.header ? richText(frame.header.now) : '';
    const prompt = frame.prompt ? richText(frame.prompt) : '';
    out.push(
      `The step he is on: ${[now, prompt]
        .filter(Boolean)
        .map(x => `«${clip(x, 200)}»`)
        .join(' ')}`,
    );
  }
  const lines = Object.entries(state.nodeLines);
  if (lines.length > 0) {
    out.push(
      'His credited lines on this question:',
      ...lines.map(([node, raw]) => `- ${node}: «${clip(raw, 80)}»`),
    );
  }
  const carried = Object.entries(state.carried ?? {});
  if (carried.length > 0) {
    out.push(
      'His results of earlier questions:',
      ...carried.map(([key, c]) => `- ${key} = ${c.value}`),
    );
  }
  const text = out.join('\n');
  return {
    exerciseId: ctx.exerciseId,
    questionId: ctx.questionId,
    text: clip(text, CONTEXT_MAX),
    hidden,
    verify,
  };
}
