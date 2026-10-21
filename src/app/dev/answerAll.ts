/**
 * Debug builds only (`-devActions answerAll`): the next right action for the
 * open card, so a part can be played to its done line without taps (picker
 * and «الورقة» screenshots with a real stored `part_done`). Uses the
 * content's resolved answers; returns null when there is nothing to do.
 */
import type { LoadedExercise } from '../../content/loader';
import { stepKey } from '../../content/loader';
import { fractionToPlain } from '../../engine/format';
import type { JsonObject } from '../../components/contract';
import type {
  AnswerValue,
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
