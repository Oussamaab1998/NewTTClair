/**
 * Debug builds only: a scripted, free stand-in for the AI planner, to check
 * the AI tutor v2 flow in the simulator without a live call (D22):
 *   -devLlm fake      answers after 0.8 s: an ask_clarify (valid at any
 *                     active card), with a diagnosis and a "why" for the trace
 *   -devLlm fakeSlow  never answers in time: the rules answer stays (fallback)
 * Arabic here is test text only (reviewed: false). Token counts are made up
 * (shown as such in the trace: model "fake").
 */
import {
  createFakeClient,
  type PlannerClient,
} from '../../planner/llm/plannerClient';

const ar = (text: string) => ({ ar: [{ ar: text }] });

export function fakeLlmClient(kind: 'fake' | 'fakeSlow'): PlannerClient {
  return createFakeClient({
    model: kind === 'fake' ? 'fake' : 'fake-slow',
    plan: async (pack, c) => {
      const wait = kind === 'fake' ? 800 : c.timeoutMs + 1000;
      await new Promise(r => setTimeout(r, wait));
      return {
        latencyMs: wait,
        value: {
          diagnosis: {
            skillIds: [],
            misconceptionIds: [],
            confidence: 0.4,
            summary: `fake: ${pack.dynamic.aiTrigger ?? 'none'} at ${
              pack.dynamic.situation.step.key
            }`,
          },
          avoid: [],
          why: 'fake client: ask what is unclear',
          next: {
            kind: 'ask_clarify',
            options: [ar('شنوّة اللي موش واضح؟'), ar('نحب مثال بالأرقام')],
          },
        },
      };
    },
  });
}
