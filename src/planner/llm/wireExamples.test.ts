import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent } from '../../lesson/session/lesson';
import { validateDecision } from '../planner';
import { planInstructions } from './prompts';
import { WIRE_ACTIONS, plannerWire } from './wireFormat';
import { WIRE_EXAMPLES } from './wireExamples';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const c1b = buildContent(r.loaded, '1b');

describe('one correct example per action kind (cached prompt prefix)', () => {
  it('covers every action the wire format allows', () => {
    expect([...new Set(WIRE_EXAMPLES.map(e => e.action))].sort()).toEqual(
      [...WIRE_ACTIONS].sort(),
    );
  });

  it.each(WIRE_EXAMPLES.map(e => [e.action, e] as const))(
    '%s: parses with the wire format and passes content validation',
    (_a, e) => {
      const parsed = plannerWire().zod.safeParse(e);
      expect(parsed.success).toBe(true);
      // As consult.ts does: "why" and "followUp" never reach the Decision.
      const output: Record<string, unknown> = { ...parsed.data! };
      delete output.why;
      delete output.followUp;
      const d = validateDecision(
        { ...output, ruleId: 'llm' },
        c1b.menu,
        'llm',
      );
      expect(d.diagnosis.summary).not.toMatch(/invalid|unknown/);
      expect(d.source).toBe('llm');
    },
  );

  it('ask_clarify: options only (the card asks the question), at most 3; NumericTwin: a calculator expression, no LaTeX or words', () => {
    const clarify = WIRE_EXAMPLES.find(e => e.action === 'ask_clarify')!;
    expect(clarify.blocks.length).toBeLessThanOrEqual(3);
    const twin = WIRE_EXAMPLES.find(e => e.target === 'NumericTwin')!;
    const props = JSON.parse(twin.propsJson) as { template: string };
    expect(props.template).toMatch(/^[a-z0-9+\-*/^() ]+$/);
  });

  it('are in the planner prompt, with the new rules', () => {
    const p = planInstructions();
    for (const e of WIRE_EXAMPLES) {
      expect(p).toContain(JSON.stringify(e));
    }
    expect(p).toMatch(/dynamic\.offeredComponents/);
    expect(p).toMatch(/no LaTeX inside text runs/i);
    expect(p).toMatch(/never English words/i);
    expect(p).toMatch(/never call a wrong value close/i);
  });
});
