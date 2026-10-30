/**
 * Debug builds only (`-devActions answerAll`): the next right action for the
 * open card, so a part can be played to its done line without taps (picker
 * and «الورقة» screenshots with a real stored `part_done`). Uses the
 * content's resolved answers; returns null when there is nothing to do.
 */
import type { LoadedExercise, ResolvedAnswer } from '../../content/loader';
import { stepKey } from '../../content/loader';
import { fractionToPlain } from '../../engine/format';
import type { JsonObject } from '../../components/contract';
import type { GraphNode } from '../../method/graph';
import type {
  AnswerValue,
  AskRef,
  CardPurpose,
  LessonState,
} from '../../lesson/session/types';

type RightAction =
  | { type: 'answer'; value: AnswerValue }
  | { type: 'gate_passed'; stepId: string }
  | { type: 'card_choice'; purpose: CardPurpose; choice: string }
  | { type: 'component_result'; correct: true; details: JsonObject };

export function nextRightAction(
  state: LessonState,
  loaded: LoadedExercise,
): RightAction | null {
  if (state.finished || state.pending) {
    return null;
  }
  if (state.gate) {
    return { type: 'gate_passed', stepId: state.gate.stepId };
  }
  // A blocking planner card (self-report...): «موش توّا» when offered (no
  // transfer variant on the way), else its first choice.
  const card = [...state.items]
    .reverse()
    .find(i => i.kind === 'choice_card' && i.status === 'open');
  if (card?.kind === 'choice_card') {
    const choice = card.choices.includes('dismissed')
      ? 'dismissed'
      : card.choices[0]!;
    return { type: 'card_choice', purpose: card.purpose, choice };
  }
  const frame = state.stack[state.stack.length - 1];
  const ref = frame?.ref;
  if (!ref) {
    return null;
  }
  // Any open card: main step, variant (transfer, simpler twin...) or mini.
  const key =
    ref.scope === 'main'
      ? stepKey.main(ref.questionId, ref.stepId)
      : ref.scope === 'mini'
      ? stepKey.mini(ref.deepDiveId)
      : stepKey.variant(ref.variantId);
  const answer = loaded.answers.get(key);
  if (answer?.kind === 'method') {
    return methodRightAction(answer, loaded, ref, state);
  }
  switch (answer?.kind) {
    case 'option':
      return { type: 'answer', value: { optionId: answer.optionId } };
    case 'number':
      return { type: 'answer', value: { raw: fractionToPlain(answer.value) } };
    case 'lines':
      // The goal line itself ends the step (accepted, marked jumped_to_goal).
      return { type: 'answer', value: { line: answer.spec.goal } };
    default: {
      // A task component (EventPicker, LawBuilder): its own engine check, here
      // simply reported solved.
      const step =
        ref.scope === 'main'
          ? loaded.exercise.parts
              .find(p => p.id === ref.questionId)
              ?.groups.flatMap(g => g.steps)
              .find(st => st.id === ref.stepId)
          : ref.scope === 'variant'
          ? loaded.exercise.variants.find(v => v.id === ref.variantId)?.step
          : undefined;
      return step?.kind === 'component'
        ? { type: 'component_result', correct: true, details: {} }
        : null;
    }
  }
}

/** The right act of a method frame: a plan that respects the dependencies, the right word, the next expected line, the true card, the clean recipe. */
function methodRightAction(
  answer: Extract<ResolvedAnswer, { kind: 'method' }>,
  loaded: LoadedExercise,
  ref: AskRef,
  state: LessonState,
): RightAction | null {
  const step =
    ref.scope === 'main'
      ? loaded.exercise.parts
          .find(p => p.id === ref.questionId)
          ?.groups.flatMap(g => g.steps)
          .find(st => st.id === ref.stepId)
      : ref.scope === 'variant'
      ? loaded.exercise.variants.find(v => v.id === ref.variantId)?.step
      : undefined;
  if (step?.kind !== 'mframe') {
    return null;
  }
  const f = step.frame;
  const frame = state.stack[state.stack.length - 1];
  const act = (value: AnswerValue): RightAction => ({ type: 'answer', value });
  const lineOf = (n: Pick<GraphNode, 'forms' | 'value'>) =>
    `${n.forms[0]} = ${fractionToPlain(n.value)}`;
  if (f.type === 'plan') {
    // The authored order is a valid order (cards only need earlier cards).
    return act({ plan: f.cards.map(c => c.id) });
  }
  if (f.type === 'read') {
    return act({ token: f.targets[0]!.token });
  }
  if (f.type === 'cards') {
    const right = f.cards.find(c => c.truth === 'true');
    return right ? act({ card: right.id }) : null;
  }
  if (f.type === 'recipe') {
    return act({ recipe: f.clean });
  }
  if (f.type === 'lines' && answer.frame === 'lines') {
    const have = new Set(state.method?.credited ?? []);
    const next = answer.graph.nodes.find(
      n => n.planCard === f.key && n.role !== 'support' && !have.has(n.id),
    );
    return next && next.forms[0] ? act({ mline: lineOf(next) }) : null;
  }
  if (f.type === 'similar' && answer.frame === 'similar') {
    const nodes = answer.graph.nodes.filter(
      n => n.role !== 'support' && n.forms[0],
    );
    const done = frame?.lines?.length ?? 0;
    const next = nodes[done];
    return next ? act({ sline: lineOf(next) }) : act({ submit: true });
  }
  if (f.type === 'repair' && answer.frame === 'repair') {
    const at = frame?.stage ?? 0;
    const st = f.stages[at];
    const rs = answer.stages[at];
    if (!st || !rs) {
      return null;
    }
    if (st.type === 'show') {
      return act({ ack: true });
    }
    if (st.type === 'component') {
      return act({ explored: true });
    }
    if (st.type === 'list') {
      return act({ list: rs.groups ?? [] });
    }
    if (st.type === 'cards') {
      const right = st.cards.find(c => c.truth === 'true');
      return right ? act({ card: right.id }) : null;
    }
    const node = rs.graph?.nodes.find(n => n.id === st.node);
    return node && node.forms[0] ? act({ mline: lineOf(node) }) : null;
  }
  return null;
}
