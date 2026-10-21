/**
 * LLM planner behind the `Planner` interface (orchestrate.ts `decide`): any
 * failure or rejection throws, so `decide()` answers with the rules planner.
 * The lesson itself uses the provisional flow in useLesson + consult.ts.
 */
import type { LessonContent } from '../../lesson/session/lesson';
import type { Planner } from '../planner';
import type { Decision } from '../schema';
import type { Situation } from '../situation';
import { consultWith } from './consult';
import type { PlannerClient } from './plannerClient';
import type { LlmCallRecord } from './runtime';

export class LlmPlannerError extends Error {
  constructor(readonly record: LlmCallRecord) {
    super(`llm planner: ${record.outcome}`);
  }
}

export interface LlmPlannerOptions {
  client: PlannerClient;
  content: LessonContent;
  timeoutMs: number;
  newRequestId: () => string;
  onRecord?: (r: LlmCallRecord) => void;
}

export function createLlmPlanner(o: LlmPlannerOptions): Planner {
  return {
    id: `llm:${o.client.id}`,
    async decide(situation: Situation): Promise<Decision> {
      const { decision, record } = await consultWith(
        o.client,
        o.content,
        situation,
        { requestId: o.newRequestId(), timeoutMs: o.timeoutMs },
      );
      o.onRecord?.(record);
      if (!decision) {
        throw new LlmPlannerError(record);
      }
      return decision;
    },
  };
}
