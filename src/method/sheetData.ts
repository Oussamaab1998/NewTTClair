/**
 * What the sheet shows besides the route: what he found (his own accepted
 * lines, the rule WITH its condition, the bridge to the exam notation) and
 * the paper skeleton. Pure; reads the lesson state and the loaded content.
 */
import { stepKey, type LoadedExercise } from '../content/loader';
import type { MethodFrameStep, Step } from '../content/schema';
import type { LessonState } from '../lesson/session/types';
import {
  buildFindings,
  fillSkeleton,
  type FindingResult,
  type SkeletonRow,
} from './findings';

export interface SheetData {
  found: FindingResult[];
  skeleton: SkeletonRow[];
}

export function sheetFor(
  loaded: LoadedExercise,
  questionId: string,
  groups: readonly { steps: readonly Step[] }[],
  method: LessonState['method'],
): SheetData | null {
  const frames = groups
    .flatMap(g => g.steps)
    .filter((s): s is MethodFrameStep => s.kind === 'mframe');
  const planFrame = frames.find(f => f.sheet !== undefined);
  if (!planFrame?.sheet) {
    return null;
  }
  const lineFrame = frames.find(
    f => f.methodId === planFrame.methodId && f.frame.type === 'lines',
  );
  const answer = lineFrame
    ? loaded.answers.get(stepKey.main(questionId, lineFrame.id))
    : undefined;
  if (answer?.kind !== 'method' || answer.frame !== 'lines') {
    return null;
  }
  const lines = method?.lines ?? {};
  const found = buildFindings({
    findings: planFrame.sheet.findings,
    graph: answer.graph,
    methodId: planFrame.methodId ?? '',
    lines,
    picks: method?.picks ?? {},
    trueCard: (pickStepId, cardId) => {
      const pick = frames.find(f => f.id === pickStepId);
      return (
        pick?.frame.type === 'cards' &&
        pick.frame.cards.some(c => c.id === cardId && c.truth === 'true')
      );
    },
  });
  return {
    found,
    skeleton: fillSkeleton({
      skeleton: planFrame.sheet.skeleton,
      graph: answer.graph,
      lines,
    }),
  };
}
