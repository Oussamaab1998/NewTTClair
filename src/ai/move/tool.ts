/**
 * The one tool of the move mode (plan v2 A5): `tutor_move`, the next thing
 * the student reads at a hard moment, and maybe a component he uses or a
 * small case he works on. Sent without strict mode (as every tutor tool) and
 * validated here with zod. A move is shown only when it passes, in order:
 * 1. its shape (zod);
 * 2. the moves allowed for the reason the conductor gave;
 * 3. its parts (a component move has a component, a readback shows his line);
 * 4. its case: a prepared one (S1..S4) or a new one made by make_case, never
 *    one where his own slip gives the right number (P12);
 * 5. verifyAsk (src/ai/verify/message.ts): numbers, leaks, notation, line
 *    ids, non-Tunisian words, one question, and the component's props
 *    (resolveSpec) and what it would reveal.
 * A tree question (the pack's domain) has its own tool definition and fewer
 * moves: the lesson draws the tree itself, so no component, and only the
 * prepared cases (never a new one).
 */
import { z } from 'zod';

import type { Experiment } from '../../engine/calls';
import type { DeepReason, LightReason } from '../../hybrid/conductor/types';
import type { AiTier } from '../../hybrid/mover';
import { zodToJsonSchema } from '../../planner/llm/strictSchema';
import type { QuestionDomain, QuestionPack } from '../packs/build';
import type { CaseSpec, SessionRuntime } from '../session/state';
import { COMPUTE } from '../tools/compute';
import { BlockSchema, type AskStudent } from '../tools/schemas';
import type { ToolDefinition } from '../transport/wire';
import {
  verifyAsk,
  type RenderBlock,
  type ShownComponent,
} from '../verify/message';
import { unstringify } from '../session/loop';

export const MOVE_TOOL = 'tutor_move';

export const MOVE_KINDS = [
  'say',
  'repair',
  'component',
  'case',
  'scaffold',
  'probe',
  'readback',
  'escalate',
] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

/**
 * The moves each reason allows. `escalate` (hand the moment to the deep
 * tier) exists only on the light tier; it is dropped from the list on a deep
 * call. A remark after a component or a free sentence never opens a detour.
 */
export const ALLOWED_MOVES: Readonly<
  Record<LightReason | DeepReason, readonly MoveKind[]>
> = {
  free_text: ['say', 'probe', 'readback', 'scaffold', 'component', 'escalate'],
  // Inside a detour: stay on the case or link it back to the question.
  case_line: ['say', 'probe', 'case', 'component', 'scaffold'],
  slip_no_reply: [
    'repair',
    'case',
    'component',
    'probe',
    'scaffold',
    'escalate',
  ],
  slip_again: ['repair', 'case', 'component', 'scaffold', 'probe', 'escalate'],
  pick_again: ['repair', 'case', 'component', 'say', 'escalate'],
  component_result: ['say', 'probe'],
  similar_other: ['say', 'probe', 'readback', 'repair', 'escalate'],
  undiagnosed: ['probe', 'readback', 'repair', 'case', 'scaffold', 'component'],
  stuck_again: ['scaffold', 'case', 'component', 'probe'],
  claim: ['case', 'probe', 'say', 'repair', 'component', 'readback'],
  slip_third: ['repair', 'case', 'component', 'scaffold'],
};

/** A tree question has no component move (the lesson draws the tree itself). */
export function allowedMoves(
  reason: LightReason | DeepReason,
  tier: AiTier,
  domain?: QuestionDomain | null,
): MoveKind[] {
  return ALLOWED_MOVES[reason].filter(
    m =>
      (tier === 'light' || m !== 'escalate') &&
      (domain !== 'tree' || m !== 'component'),
  );
}

/** Moves that may carry a component. */
const WITH_COMPONENT: ReadonlySet<MoveKind> = new Set([
  'component',
  'case',
  'repair',
]);

export const PREPARED_IDS = ['S1', 'S2', 'S3', 'S4'] as const;

const CaseSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('prepared'),
    id: z.enum(PREPARED_IDS).describe('A prepared case of the pack.'),
  }),
  z.strictObject({
    kind: z.literal('box'),
    n: z.number().int().min(2).max(8),
    k: z.number().int().min(1).max(4),
  }),
  z.strictObject({
    kind: z.literal('urn'),
    reds: z.number().int().min(0).max(12),
    blacks: z.number().int().min(0).max(12),
    k: z.number().int().min(1).max(5),
    j: z.number().int().min(0).max(5),
  }),
]);

export const TutorMoveSchema = z.strictObject({
  move: z.enum(MOVE_KINDS),
  message: z
    .array(BlockSchema)
    .max(6)
    .describe(
      'What he reads, in order. His lines only as student_line / compare blocks. Empty only for escalate.',
    ),
  component: z
    .strictObject({
      name: z.string().min(1).max(40),
      props_json: z.string().min(2).max(4000),
      case_id: z
        .string()
        .regex(/^(S[1-4]|new)$/)
        .nullable()
        .describe(
          'For components that draw the urn: a prepared case (S1..S4), "new" for the case of this move, or null for the exercise urn.',
        ),
    })
    .nullable()
    .default(null),
  case: CaseSchema.nullable()
    .default(null)
    .describe(
      'The small case of this move: a prepared one, or a new box (letters) or red/black urn (j = reds wanted) that the engine builds and checks.',
    ),
});
export type TutorMove = z.infer<typeof TutorMoveSchema>;

const DESCRIPTION =
  'Your one move: what the student reads now (one short message, one thing to do that fits the step he is on) and, when the move needs it, a component he uses or a small case. Call it exactly once. A refused move comes back once with the reasons.';

/** The moves of a tree question, as its tool lists them. */
export const TREE_MOVE_KINDS = [
  'say',
  'repair',
  'case',
  'scaffold',
  'probe',
  'readback',
  'escalate',
] as const;

/**
 * `tutor_move` as a tree question's model sees it: no component fields and
 * only a prepared case. What comes back is still read with TutorMoveSchema
 * (checkMove), so a component or a new case is answered with its reason.
 */
const TreeMoveSchema = z.strictObject({
  move: z.enum(TREE_MOVE_KINDS),
  message: z
    .array(BlockSchema)
    .max(6)
    .describe(
      'What he reads, in order. His lines only as student_line / compare blocks. Empty only for escalate.',
    ),
  case: z
    .strictObject({
      kind: z.literal('prepared'),
      id: z.enum(PREPARED_IDS).describe('A prepared case of the pack.'),
    })
    .nullable()
    .default(null)
    .describe(
      'For a case move: the prepared small case of the pack he works on. Null for every other move.',
    ),
});

const TREE_DESCRIPTION =
  'Your one move on this probability tree question: what the student reads now (one short message, one thing to do that fits the step he is on) and, for a case move, the prepared small case he works on. Call it exactly once. A refused move comes back once with the reasons.';

export function moveToolDefinition(
  domain?: QuestionDomain | null,
): ToolDefinition {
  const tree = domain === 'tree';
  const schema = zodToJsonSchema(tree ? TreeMoveSchema : TutorMoveSchema);
  delete schema.$schema;
  return {
    name: MOVE_TOOL,
    description: tree ? TREE_DESCRIPTION : DESCRIPTION,
    input_schema: schema,
  };
}

/** What the engine says about a small case (make_case on a scratch session). */
export interface CaseFacts {
  values: Record<string, string>;
  coincidences: string[];
  reused: string[];
}

/** Box coincidences (make_case names them by count) and the slip each one hides. */
const BOX_COINCIDENCE_SLIP: Readonly<Record<string, string>> = {
  'groups = ordered/k': 'divide_by_k_not_k_factorial',
  'n*k = groups': 'n_times_k',
  'balls n = groups': 'n_for_count',
};

/** Does this case give the right number by his own slip (P12)? */
export function caseHidesSlip(
  coincidences: readonly string[],
  slip: string | null,
): boolean {
  if (slip === null) {
    return false;
  }
  return coincidences.some(
    c => c.split(' at ')[0] === slip || BOX_COINCIDENCE_SLIP[c] === slip,
  );
}

const issuesOf = (e: { issues: { path: PropertyKey[]; message: string }[] }) =>
  e.issues
    .slice(0, 6)
    .map(i => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join('; ');

/** Everything a move is checked against (a copy of the session: checks may add a case). */
export interface MoveEnv {
  rt: SessionRuntime;
  pack: QuestionPack;
  experiment: Experiment | null;
  allowed: readonly MoveKind[];
  /** The slip the engine saw in his act, when any. */
  slip: string | null;
  /** The engine's facts about each prepared case, by id. */
  prepared: Readonly<Record<string, CaseFacts>>;
}

export type MoveCheck =
  | {
      ok: true;
      kind: MoveKind;
      blocks: RenderBlock[];
      component: ShownComponent | null;
      /** The case of this move (prepared or new), for what was tried. */
      caseId: string | null;
      /** A new case this move made (kept in the mover's memory). */
      made: { id: string; spec: CaseSpec } | null;
    }
  | { ok: false; reasons: string[] };

export function checkMove(input: unknown, env: MoveEnv): MoveCheck {
  const parsed = TutorMoveSchema.safeParse(unstringify(input));
  if (!parsed.success) {
    return {
      ok: false,
      reasons: [`invalid input: ${issuesOf(parsed.error)}`],
    };
  }
  const m = parsed.data;
  const reasons: string[] = [];
  if (!env.allowed.includes(m.move)) {
    return {
      ok: false,
      reasons: [
        `move "${m.move}" is not allowed here; allowed: ${env.allowed.join(
          ', ',
        )}`,
      ],
    };
  }
  if (m.move === 'escalate') {
    return {
      ok: true,
      kind: m.move,
      blocks: [],
      component: null,
      caseId: null,
      made: null,
    };
  }
  // A tree question: the lesson draws the tree, and its cases are prepared.
  const tree = env.pack.domain === 'tree';
  if (m.message.length === 0) {
    reasons.push('the message is empty: write what he reads');
  }
  if (tree && m.component) {
    reasons.push(
      'no component on a tree question: the lesson draws the tree itself. Send the move without a component',
    );
  }
  if (tree && m.case && m.case.kind !== 'prepared') {
    reasons.push(
      'on a tree question only a prepared case of the pack (case {kind "prepared", id "S1".."S4"}), never a new one',
    );
  }
  if (m.move === 'component' && !m.component) {
    reasons.push('a component move needs a component');
  }
  if (m.move === 'case' && !m.case) {
    reasons.push(
      tree
        ? 'a case move needs a prepared case (S1..S4)'
        : 'a case move needs a case (prepared S1..S4 or a new one)',
    );
  }
  if (!tree && m.component && !WITH_COMPONENT.has(m.move)) {
    reasons.push(
      `a component goes with a component, case or repair move, not "${m.move}"`,
    );
  }
  if (
    m.move === 'readback' &&
    !m.message.some(b => b.type === 'student_line')
  ) {
    reasons.push('a readback shows his line (student_line block)');
  }

  // A prepared case (named by the case or drawn by the component).
  const preparedOk = (where: string, id: string): boolean => {
    const facts = env.prepared[id];
    if (!facts || env.rt.state.cases[id] === undefined) {
      reasons.push(`${where}: no prepared case ${id} for this question`);
      return false;
    }
    if (caseHidesSlip(facts.coincidences, env.slip)) {
      reasons.push(
        `${where}: on ${id} his slip ${env.slip} gives the right number (P12); use another case`,
      );
      return false;
    }
    return true;
  };

  // The case: prepared, or made now by the engine.
  let caseId: string | null = null;
  let made: { id: string; spec: CaseSpec } | null = null;
  if (m.case?.kind === 'prepared') {
    if (preparedOk('case', m.case.id)) {
      caseId = m.case.id;
    }
  } else if (m.case && !tree) {
    const spec: CaseSpec = m.case;
    const r = COMPUTE.make_case!({ rt: env.rt, experiment: env.experiment }, {
      case: spec,
      purpose: 'smaller',
    } as never);
    if (!r.ok) {
      reasons.push(`case: ${r.error}`);
    } else {
      const res = r.result as { case_id: string; coincidences: string[] };
      if (caseHidesSlip(res.coincidences, env.slip)) {
        reasons.push(
          `case: on this case his slip ${env.slip} gives the right number (P12); change the numbers`,
        );
      } else {
        caseId = res.case_id;
        made = { id: res.case_id, spec };
      }
    }
  }
  let componentCase: string | null = null;
  if (tree) {
    // No component: nothing to draw a case with.
  } else if (m.component?.case_id === 'new') {
    if (made === null) {
      reasons.push('component: case_id "new" needs a new case in this move');
    } else {
      componentCase = made.id;
    }
  } else if (m.component?.case_id) {
    if (
      m.component.case_id === caseId ||
      preparedOk('component', m.component.case_id)
    ) {
      componentCase = m.component.case_id;
    }
  }
  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const ask: AskStudent = {
    message: m.message,
    input: m.component
      ? {
          kind: 'component',
          name: m.component.name,
          props_json: m.component.props_json,
          case_id: componentCase,
        }
      : { kind: 'free' },
    intent: 'other',
  };
  const v = verifyAsk(ask, {
    rt: env.rt,
    pack: env.pack,
    experiment: env.experiment,
  });
  if (!v.ok) {
    return { ok: false, reasons: v.reasons };
  }
  return {
    ok: true,
    kind: m.move,
    blocks: v.blocks,
    component: v.component,
    caseId,
    made,
  };
}
