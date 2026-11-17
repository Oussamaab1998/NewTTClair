/**
 * The move mode on a probability TREE question (the pack's domain 'tree').
 * The content of bac2022p-sc-ex2 is authored apart, so the questions here
 * are synthetic: the four tree templates on the exam's numbers, the notes of
 * that exercise, and prepared cases registered as an authored file would be.
 * What is checked: the tree prompt, the tool lists and the allowed moves by
 * domain, the checks of a move, the pack text, the situation's tree lines,
 * and the mover end to end on a fake transport. The urn exercise's own bytes
 * are pinned in golden.scEx2.test.ts.
 */
import { CATALOG } from '../../app/exercises';
import {
  act as conduct,
  applyFallback,
  questionCtx,
  startQuestion,
  type QuestionCtx,
} from '../../hybrid/conductor/conductor';
import type { ActOut, ConductorState } from '../../hybrid/conductor/types';
import type { Allowance, MoveRequest } from '../../hybrid/mover';
import { templates } from '../../hybrid/replies/fill';
import '../../method/library';
import { mutationsFor } from '../../method/mutations';
import { buildGraphFor } from '../../method/templates';
import { recordLine, type StudentAct } from '../checks/autoCheck';
import type { GraphRuntime } from '../checks/lines';
import { givenNumbers, type QuestionPack } from '../packs/build';
import { TUTOR_NOTES } from '../packs/notes';
import { bannedSentence } from '../prompt/lexicon';
import {
  newSession,
  restoreRuntime,
  type CaseSpec,
  type SessionState,
} from '../session/state';
import { toolDefinitions } from '../tools/schemas';
import type { MessagesTransport, SendResult } from '../transport/messagesApi';
import type {
  ContentBlock,
  MessagesRequest,
  ToolResultBlock,
} from '../transport/wire';
import { createMover, deepCompute, moveTools } from './mover';
import { movePack, PACK_MAX, treeBlock } from './pack';
import { registerCaseFile } from './prepared';
import { MOVE_PROMPT_MAX, movePrompt, movePromptFor } from './prompt';
import { treeLexicon, treeMovePrompt } from './promptTree';
import { buildSituation, diagnose, SITUATION_MAX } from './situation';
import {
  ALLOWED_MOVES,
  allowedMoves,
  caseHidesSlip,
  checkMove,
  MOVE_TOOL,
  moveToolDefinition,
  type MoveEnv,
} from './tool';

// ---------------------------------------------------------------------------
// Synthetic tree questions (the exam's numbers; the lesson's cards and cases).

const EXERCISE = 'synthetic-tree';
const EXAM = { pA: [2, 3], pFgA: [1, 4], pF: [5, 12] };
/** The small class of the lesson's prepared cases. */
const COUNTS = { n: 25, a: 16, af: 3, naf: 4 };
const STATEMENT =
  "On considère l'arbre de probabilité ci-contre où A et F sont deux évènements tels que la probabilité de F est";
const STATEMENT_MATH = 'p(F) = \\frac{5}{12}';

interface Question {
  template: string;
  wording: string;
  /** [card id, plan-card key = the node it settles], in route order. */
  cards: [string, string][];
  /** The node each prepared case rehearses (S1, S2...). */
  cases: string[];
}

const QUESTIONS: Record<string, Question> = {
  t1: {
    template: 'tree_other_path',
    wording: 'Montrer que $p(\\overline{A} \\cap F) = \\frac{1}{4}$',
    cards: [
      ['c_path', 'a_and_f'],
      ['c_rest', 'na_and_f'],
    ],
    cases: ['a_and_f', 'na_and_f'],
  },
  t2: {
    template: 'tree_conditional',
    wording: 'Calculer alors $p(F/\\overline{A})$',
    cards: [
      ['c_other', 'not_a'],
      ['c_branch', 'f_given_na'],
    ],
    cases: ['not_a', 'f_given_na'],
  },
  t3: {
    template: 'tree_complete',
    wording: "Recopier et compléter l'arbre de probabilité.",
    cards: [
      ['c_first', 'not_a'],
      ['c_low', 'f_given_na'],
      ['c_up', 'nf_given_a'],
      ['c_last', 'nf_given_na'],
    ],
    cases: ['nf_given_a', 'nf_given_na'],
  },
  t4: {
    template: 'tree_reverse',
    wording: 'Calculer $p(\\overline{A}/\\overline{F})$',
    cards: [
      ['c_cond', 'not_f'],
      ['c_path', 'na_and_nf'],
      ['c_back', 'na_given_nf'],
    ],
    cases: ['not_f', 'na_and_nf', 'na_given_nf'],
  },
};
const IDS = Object.keys(QUESTIONS);

const rich = (ar: string) => ({ ar: [{ ar }] });

const caseSpec = (id: string, node: string): CaseSpec => ({
  kind: 'tree',
  template: QUESTIONS[id]!.template,
  node,
  ...COUNTS,
});

// The cases as an authored file registers them (src/content/cases.*.json).
registerCaseFile({
  exerciseId: EXERCISE,
  contentVersion: 'test',
  reviewed: false,
  questions: Object.fromEntries(
    IDS.map(id => [
      id,
      QUESTIONS[id]!.cases.map(node => ({
        card: node,
        spec: caseSpec(id, node),
        use: `the step ${node} as a count over a count`,
        story: rich('قسم فيه تلامذة.'),
        ask: rich('قدّاش الاحتمال؟'),
      })),
    ]),
  ),
});

function mainOf(template: string): GraphRuntime {
  const graph = buildGraphFor(
    { template, args: EXAM as never },
    { inputs: {} },
  );
  return { id: 'main', graph, table: mutationsFor(graph), extra: [] };
}

function ctxOf(id: string): QuestionCtx {
  const q = QUESTIONS[id]!;
  const main = mainOf(q.template);
  const pack: QuestionPack = {
    questionId: id,
    label: id.slice(1),
    wording: q.wording,
    main,
    domain: 'tree',
    plan: q.cards.map(([cardId, key], i) => ({
      id: cardId,
      needs: i === 0 ? [] : [q.cards[i - 1]![0]],
      key,
      text: 'نحسبو الخطوة',
      now: '',
      why: '',
      next: '',
    })),
    read: [],
    recipe: null,
    notes: TUTOR_NOTES['bac2022p-sc-ex2']![id]!,
    given: [
      ...new Set(
        givenNumbers(main, [`${STATEMENT} $${STATEMENT_MATH}$`, q.wording]),
      ),
    ],
  };
  const frames = new Map(
    q.cards.map(([cardId, key]) => [
      `m${id}.${cardId}`,
      {
        id: `m${id}.${cardId}`,
        kind: 'mframe',
        frame: { type: 'lines', key, cardId },
        prompt: rich('اكتب الحساب.'),
        header: {
          now: rich('نحسبو الخطوة'),
          why: rich('نحتاجوها'),
          next: rich('الخطوة الجاية'),
        },
      },
    ]),
  );
  return {
    exerciseId: EXERCISE,
    questionId: id,
    loaded: {
      exercise: {
        id: EXERCISE,
        statement: { fr: STATEMENT, math: STATEMENT_MATH },
        contentVersion: 'test',
      },
      misconceptions: new Map(),
      answers: new Map(),
      values: new Map(),
    },
    content: null,
    pack,
    frames,
    groupSteps: [],
    tour: null,
  } as unknown as QuestionCtx;
}

interface Line {
  raw: string;
  node: string;
  /** 'main' (default) or the id of a case in `cases`. */
  graph?: string;
}

/**
 * A conductor state on the card at index `at`, after his lines (each judged
 * on the node of its card, as the conductor records them; one turn per line).
 */
function stateOn(
  ctx: QuestionCtx,
  at: number,
  lines: Line[],
  over: Partial<ConductorState> & { cases?: Record<string, CaseSpec> } = {},
): ConductorState {
  const { cases, ...rest } = over;
  const fresh = newSession(
    ctx.exerciseId,
    ctx.questionId,
    ctx.pack.main,
    ctx.pack.given,
  );
  Object.assign(fresh.state.cases, cases ?? {});
  const rt = restoreRuntime(fresh.state, ctx.pack.main);
  lines.forEach((l, i) => {
    rt.state.turn = i + 1;
    recordLine(rt, l.raw, {
      kind: 'node',
      graph: l.graph ?? 'main',
      node: l.node,
    });
  });
  return {
    v: 1,
    exerciseId: ctx.exerciseId,
    questionId: ctx.questionId,
    route: [...ctx.frames.keys()],
    at,
    progress: {
      attempts: 0,
      dontKnows: 0,
      hints: 0,
      slips: {},
      shown: [],
      lines: [],
      stage: 0,
      listFails: 0,
    },
    planOrder: null,
    facts: {},
    picks: {},
    nodeLines: {},
    session: rt.state,
    turn: rt.state.turn,
    done: false,
    onCase: null,
    tour: null,
    carried: {},
    ...rest,
  };
}

const request = (
  state: ConductorState,
  act: StudentAct,
  out: Pick<ActOut, 'tier' | 'reason'> & Partial<ActOut>,
): MoveRequest => ({
  act,
  state,
  out: { reply: [], advanced: false, ...out },
});

const line = (raw: string): StudentAct => ({ kind: 'line', raw });

/** Question 2: the first branch found, then the complement of the other node, twice (a trap). */
function trapRequest(): { ctx: QuestionCtx; req: MoveRequest } {
  const ctx = ctxOf('t2');
  const state = stateOn(ctx, 1, [
    { raw: '1-2/3=1/3', node: 'not_a' },
    { raw: '1-1/4=3/4', node: 'f_given_na' },
    { raw: '1-1/4=3/4', node: 'f_given_na' },
  ]);
  state.progress.attempts = 2;
  state.progress.slips = { 'mut.complement_across_nodes': 2 };
  return {
    ctx,
    req: request(state, line('1-1/4=3/4'), {
      tier: 'light',
      reason: 'slip_again',
    }),
  };
}

/** Question 2: a wrong line the engine does not know, on the last card (deep). */
function deepRequest(): { ctx: QuestionCtx; req: MoveRequest } {
  const ctx = ctxOf('t2');
  const state = stateOn(ctx, 1, [
    { raw: '1-2/3=1/3', node: 'not_a' },
    { raw: '(1/4)+(1/3)=7/12', node: 'f_given_na' },
  ]);
  return {
    ctx,
    req: request(state, line('(1/4)+(1/3)=7/12'), {
      tier: 'deep',
      reason: 'undiagnosed',
    }),
  };
}

function envOf(
  ctx: QuestionCtx,
  state: ConductorState,
  o: { allowed?: MoveEnv['allowed']; slip?: string | null } = {},
): MoveEnv {
  const pack = movePack(ctx);
  const session = JSON.parse(JSON.stringify(state.session)) as SessionState;
  for (const c of pack.prepared) {
    session.cases[c.id] = c.spec;
  }
  return {
    rt: restoreRuntime(session, ctx.pack.main),
    pack: ctx.pack,
    experiment: pack.experiment,
    allowed: o.allowed ?? allowedMoves('slip_again', 'light', 'tree'),
    slip: o.slip ?? null,
    prepared: Object.fromEntries(pack.prepared.map(c => [c.id, c.facts])),
  };
}

// ---------------------------------------------------------------------------
// A fake transport (as in move.test.ts).

const USAGE = {
  input: 100,
  cacheRead: 3_000,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 200,
};

let seq = 0;
const tool = (name: string, input: unknown): ContentBlock => ({
  type: 'tool_use',
  id: `toolu_${++seq}`,
  name,
  input,
});
const move = (input: Record<string, unknown>) => tool(MOVE_TOOL, input);
const ASK = { type: 'ar', text: 'الفرعين اللي في سطرك خارجين من نفس العقدة؟' };
const GOOD = move({
  move: 'repair',
  message: [{ type: 'student_line', line_id: 'L3' }, ASK],
});

function fake(responses: ContentBlock[][]) {
  const bodies: MessagesRequest[] = [];
  const transport: MessagesTransport = {
    send: jest.fn(async (body: MessagesRequest): Promise<SendResult> => {
      bodies.push(JSON.parse(JSON.stringify(body)) as MessagesRequest);
      const content = responses.shift();
      if (!content) {
        return {
          ok: false,
          error: 'network',
          retryable: true,
          latencyMs: 1,
          attempts: 1,
        };
      }
      return {
        ok: true,
        latencyMs: 5,
        attempts: 1,
        response: {
          id: 'm',
          model: body.model,
          content,
          stopReason: 'tool_use',
          refusalCategory: null,
          usage: USAGE,
        },
      };
    }),
  };
  return { transport, bodies };
}

const allowance = (): Allowance => ({
  mode: () => 'full',
  permits: () => true,
  permitsHandover: () => true,
  add: () => undefined,
});

/** The is_error result the retry carries (why the first move was refused). */
const refusal = (b: MessagesRequest | undefined): string => {
  const last = b?.messages[b.messages.length - 1]?.content as
    | ToolResultBlock[]
    | undefined;
  return last?.map(x => x.content).join(' ') ?? '';
};

/** The situation: the text of the first user message. */
const situationOf = (b: MessagesRequest | undefined): string => {
  const c = b?.messages[0]?.content;
  const first = Array.isArray(c) ? c[0] : undefined;
  return typeof first?.text === 'string' ? first.text : '';
};

/** Words of the urn exercise that a tree question must never read. */
const URN_WORDS = [
  /\burns?\b/i,
  /\bbox(es)?\b/i,
  /\bballs?\b/i,
  /C\(n/,
  /\bordered\b/i,
];

// ---------------------------------------------------------------------------

describe('tree: the core prompt', () => {
  const prompt = treeMovePrompt();

  it('stays under 10,000 characters and byte-stable', () => {
    expect(prompt.length).toBeLessThanOrEqual(MOVE_PROMPT_MAX);
    expect(treeMovePrompt()).toBe(prompt);
    expect(prompt).toContain('tutor_move');
    expect(prompt).toContain(bannedSentence());
  });

  it('has no word of the urn exercise', () => {
    for (const word of URN_WORDS) {
      expect(prompt).not.toMatch(word);
    }
  });

  it('allows only the prepared cases and no component', () => {
    expect(prompt).toContain(
      'case: a PREPARED small case only: case {kind "prepared", id "S2"}',
    );
    expect(prompt).toContain('Never invent a case or its numbers');
    expect(prompt).toContain('There is NO component move and NO new case');
    expect(prompt).not.toMatch(/props_json|case_id/);
  });

  it("reads the tree's diagnosis and gives the tree's checks", () => {
    for (const word of [
      'unexplained',
      'trap',
      'coincidence',
      'support',
      'other_step',
      'no_match',
      'mismatch',
      'above_one',
      'unreduced',
      'which node do these two branches leave from?',
      'is this number a branch (after A) or a whole path (from the start)?',
      'among whom is this counted: everyone, or only those in A?',
      'the two branches leaving one node: what do they add up to?',
      'can this be a probability?',
    ]) {
      expect(prompt).toContain(word);
    }
    expect(prompt).toContain('Never confirm the value as his result');
  });

  it('keeps events and formulas in math blocks, written as the exam writes them', () => {
    expect(prompt).toContain('p(F/\\overline{A})');
    expect(prompt).toContain('never \\mid');
    expect(prompt).toContain('«الحدث الأوّل», «الفرع», «الطريق»');
    expect(prompt).toContain(
      'arbre, branche, probabilité conditionnelle, sachant',
    );
    expect(prompt).toContain('"3lech nadhrbou"');
  });

  it('takes the shared word list without its entries about balls and draws', () => {
    const words = treeLexicon();
    expect(words).toContain('«قدّاش» for how many');
    expect(words).toContain('«علاش» for why');
    expect(words).not.toMatch(/كورة|تيراج|نجبدو/);
    expect(words.endsWith('.')).toBe(true);
    expect(prompt).toContain(words);
  });

  it('is chosen by the domain; no domain keeps the urn prompt', () => {
    expect(movePromptFor('tree')).toBe(prompt);
    expect(movePromptFor(null)).toBe(movePrompt());
    expect(movePromptFor(undefined)).toBe(movePrompt());
    expect(prompt).not.toBe(movePrompt());
  });
});

describe('tree: the tools', () => {
  it('gives the urn lists, the same objects, when no domain is named', () => {
    for (const compute of [true, false]) {
      const urn = moveTools(compute);
      expect(moveTools(compute)).toBe(urn);
      expect(moveTools(compute, null)).toBe(urn);
      expect(moveTools(compute, undefined)).toBe(urn);
      expect(moveTools(compute, 'tree')).not.toBe(urn);
    }
    expect(moveTools(true).map(t => t.name)).toEqual([
      'evaluate',
      'list_outcomes',
      'test_rule',
      MOVE_TOOL,
    ]);
  });

  it('offers a tree question tutor_move alone, and evaluate on deep', () => {
    expect(moveTools(false, 'tree').map(t => t.name)).toEqual([MOVE_TOOL]);
    expect(moveTools(true, 'tree').map(t => t.name)).toEqual([
      'evaluate',
      MOVE_TOOL,
    ]);
    expect(deepCompute('tree')).toEqual(['evaluate']);
    expect(deepCompute(null)).toEqual([
      'evaluate',
      'list_outcomes',
      'test_rule',
    ]);
    // Byte-stable: the same objects on every call.
    expect(moveTools(true, 'tree')).toBe(moveTools(true, 'tree'));
    expect(moveTools(false, 'tree')).toBe(moveTools(false, 'tree'));
  });

  it('has no component, no new case and no urn word in the tree tools', () => {
    const text = JSON.stringify(moveTools(true, 'tree'));
    for (const word of [...URN_WORDS, /component|props_json|case_id|reds/]) {
      expect(text).not.toMatch(word);
    }
    const def = moveToolDefinition('tree');
    const props = def.input_schema.properties as Record<
      string,
      { enum?: string[] }
    >;
    expect(Object.keys(props).sort()).toEqual(['case', 'message', 'move']);
    expect(props.move!.enum).toEqual([
      'say',
      'repair',
      'case',
      'scaffold',
      'probe',
      'readback',
      'escalate',
    ]);
    expect(JSON.stringify(props.case)).toContain('"prepared"');
    expect(JSON.stringify(props.case)).not.toMatch(/"box"|"urn"/);
    // The urn definition is the one built with no argument.
    expect(moveToolDefinition(null)).toEqual(moveToolDefinition());
    expect(JSON.stringify(moveToolDefinition())).toContain('props_json');
  });

  it('keeps the input of evaluate (only its description is the tree one)', () => {
    const shared = toolDefinitions().find(t => t.name === 'evaluate')!;
    const mine = moveTools(true, 'tree').find(t => t.name === 'evaluate')!;
    expect(mine.input_schema).toEqual(shared.input_schema);
    expect(mine.description).not.toBe(shared.description);
  });
});

describe('tree: the allowed moves', () => {
  const reasons = Object.keys(ALLOWED_MOVES) as (keyof typeof ALLOWED_MOVES)[];

  it.each(reasons)('%s: the urn list without the component move', reason => {
    for (const tier of ['light', 'deep'] as const) {
      const urn = allowedMoves(reason, tier);
      const tree = allowedMoves(reason, tier, 'tree');
      expect(tree).toEqual(urn.filter(m => m !== 'component'));
      expect(tree.length).toBeGreaterThan(0);
      expect(allowedMoves(reason, tier, null)).toEqual(urn);
    }
    expect(allowedMoves(reason, 'deep', 'tree')).not.toContain('escalate');
  });
});

describe('tree: the checks of a move', () => {
  const { ctx, req } = trapRequest();
  const env = (o: Parameters<typeof envOf>[2] = {}) => envOf(ctx, req.state, o);

  it('passes a repair that shows his line and asks one thing', () => {
    const r = checkMove(GOOD.input, env());
    expect(r).toMatchObject({ ok: true, kind: 'repair', component: null });
    expect(r.ok && r.blocks[0]).toMatchObject({
      type: 'student_line',
      raw: '1-1/4=3/4',
    });
  });

  it('accepts a prepared tree case and makes none', () => {
    const e = env();
    const r = checkMove(
      { move: 'case', message: [ASK], case: { kind: 'prepared', id: 'S2' } },
      e,
    );
    expect(r).toMatchObject({ ok: true, kind: 'case', caseId: 'S2' });
    expect(r.ok && r.made).toBeNull();
    expect(Object.keys(e.rt.state.cases).sort()).toEqual(['S1', 'S2']);
  });

  it.each([
    [{ kind: 'box', n: 4, k: 2 }],
    [{ kind: 'urn', reds: 2, blacks: 3, k: 2, j: 1 }],
  ])('refuses a new case %j, and builds none', spec => {
    const e = env();
    const r = checkMove({ move: 'case', message: [ASK], case: spec }, e);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reasons.join(' ')).toMatch(/only a prepared case/);
    expect(Object.keys(e.rt.state.cases).sort()).toEqual(['S1', 'S2']);
  });

  it('refuses a component, on any move', () => {
    const component = {
      name: 'ProbabilityTree',
      props_json: '{}',
      case_id: null,
    };
    const repair = checkMove(
      { move: 'repair', message: [ASK], component },
      env(),
    );
    expect(!repair.ok && repair.reasons.join(' ')).toMatch(
      /no component on a tree question/,
    );
    const asMove = checkMove(
      { move: 'component', message: [ASK], component },
      env(),
    );
    expect(!asMove.ok && asMove.reasons.join(' ')).toMatch(
      /move "component" is not allowed here/,
    );
  });

  it('refuses a case that is not in the pack, and one that hides his slip', () => {
    const unknown = checkMove(
      { move: 'case', message: [ASK], case: { kind: 'prepared', id: 'S4' } },
      env(),
    );
    expect(!unknown.ok && unknown.reasons.join(' ')).toMatch(
      /no prepared case S4/,
    );
    // The engine's facts of a tree case name the slips it cannot show (P12).
    const e = env({ slip: 'complement_across_nodes' });
    const hiding = {
      ...e,
      prepared: {
        ...e.prepared,
        S2: {
          ...e.prepared.S2!,
          coincidences: ['complement_across_nodes at f_given_na'],
        },
      },
    };
    const r = checkMove(
      { move: 'case', message: [ASK], case: { kind: 'prepared', id: 'S2' } },
      hiding,
    );
    expect(!r.ok && r.reasons.join(' ')).toMatch(
      /his slip complement_across_nodes gives the right number/,
    );
    expect(
      caseHidesSlip(
        ['complement_across_nodes at f_given_na'],
        'complement_across_nodes',
      ),
    ).toBe(true);
    expect(
      caseHidesSlip(
        ['complement_across_nodes at f_given_na'],
        'divides_by_total',
      ),
    ).toBe(false);
  });

  it('asks a case move for a prepared case', () => {
    const r = checkMove({ move: 'case', message: [ASK] }, env());
    expect(!r.ok && r.reasons).toEqual([
      'a case move needs a prepared case (S1..S4)',
    ]);
  });
});

describe('tree: the question pack', () => {
  it.each(IDS)('%s: its tree, its traps and its cases, under 8,000', id => {
    const ctx = ctxOf(id);
    const pack = movePack(ctx);
    expect(pack.domain).toBe('tree');
    expect(pack.experiment).toBeNull();
    expect(pack.text.length).toBeLessThanOrEqual(PACK_MAX);
    expect(pack.text).toContain(`(id "${id}")`);
    // What the statement gives: the three fractions, whole (two are on the figure only).
    expect(ctx.pack.given).toEqual(['2/3', '1/4', '5/12']);
    expect(pack.text).toContain(
      '- Given: p(A) = 2/3 (the first branch, drawn on top), p(F/A) = 1/4 (the branch to F after it), p(F) = 5/12',
    );
    expect(pack.text).toContain('p(F/\\overline{A}) is "F knowing not A"');
    expect(pack.text).toContain('- "proof" on a node');
    // Every trap of the engine's table, with a way it is written.
    const traps = ctx.pack.main!.table.traps ?? [];
    expect(traps.length).toBeGreaterThan(0);
    for (const t of traps) {
      expect(pack.text).toContain(`  - ${t.id} at ${t.nodeId}: ${t.exprs[0]}`);
    }
    // Every node says what it is and how the exam writes it.
    for (const n of ctx.pack.main!.graph.nodes) {
      expect(pack.text).toContain(`- ${n.id} = `);
      expect(pack.text).toContain(`the exam writes ${n.label}`);
    }
    expect(pack.text).not.toMatch(/\(ratio\)/);
    // No urn wording, no component, no C(n,k) gate (the plan cards are
    // still "ordered" by him: the pack's own word, not a kind of draw).
    for (const word of [
      /\burns?\b/i,
      /\bbox(es)?\b/i,
      /\bballs?\b/i,
      /C\(n/,
      /ordered draws|drawn together/,
    ]) {
      expect(pack.text).not.toMatch(word);
    }
    expect(pack.text).not.toMatch(/Components that fit|notation gate/);
    // Its own prepared cases, with the engine's values.
    expect(pack.prepared.map(c => c.id)).toEqual(
      QUESTIONS[id]!.cases.map((_, i) => `S${i + 1}`),
    );
    expect(pack.text).toContain(
      `- S1: tree of whole counts: 25 people, 16 in A (3 of them in F), 9 not in A (4 of them in F); it rehearses the step ${
        QUESTIONS[id]!.cases[0]
      }.`,
    );
    for (const c of pack.prepared) {
      expect(Object.keys(c.facts.values)).toEqual(
        ctx.pack.main!.graph.nodes.map(n => n.id),
      );
    }
    expect(movePack(ctx)).toBe(pack);
  });

  it('builds the tree block from the graph alone', () => {
    const block = treeBlock(mainOf('tree_conditional')).join('\n');
    expect(block).toMatch(/^Tree: two events/);
    expect(block).toContain(
      '  - complement_across_nodes at f_given_na: 1-(1/4)',
    );
    expect(block).toContain('  - coincidence at f_given_na: (5/12)+(1/3)');
    // A small case counted whole has no trap and asks for no proof.
    const counted = buildGraphFor(
      { template: 'tree_conditional', args: { counts: COUNTS } },
      { inputs: {} },
    );
    const small = treeBlock({
      id: 'S1',
      graph: counted,
      table: mutationsFor(counted),
      extra: [],
    }).join('\n');
    expect(small).not.toMatch(/Traps|"proof"/);
  });

  it('names the given branch as the statement writes it when the sides are exchanged', () => {
    const graph = buildGraphFor(
      {
        template: 'tree_other_path',
        args: { pA: [1, 8], pFgA: [4, 5], pF: [2, 5], swap: true },
      },
      { inputs: {} },
    );
    const block = treeBlock({
      id: 'main',
      graph,
      table: mutationsFor(graph),
      extra: [],
    }).join('\n');
    expect(block).toContain('p(\\overline{A}) = 1/8 (the first branch');
    expect(block).toContain('p(F/\\overline{A}) = 4/5');
  });
});

describe('tree: the situation', () => {
  it('says a slip is a trap, and what to ask then', () => {
    const { ctx, req } = trapRequest();
    const d = diagnose(ctx, req);
    expect(d.slip).toBe('complement_across_nodes');
    const text = buildSituation({
      ctx,
      req,
      tier: 'light',
      allowed: allowedMoves('slip_again', 'light', 'tree'),
      memory: null,
      profile: null,
    });
    expect(text).toContain(
      'slip complement_across_nodes at f_given_na (confirmed, a trap: the right value by a wrong road)',
    );
    expect(text).toContain('Seen 2 time(s) on this step.');
    expect(text).toContain(
      'Trap: this wrong road lands on the right value of f_given_na',
    );
    expect(text).toContain('Step he acted on: mt2.c_branch');
    expect(text).toContain(
      'Allowed moves: repair, case, scaffold, probe, escalate.',
    );
    expect(text).not.toContain('component');
    expect(text.length).toBeLessThanOrEqual(SITUATION_MAX);
  });

  it('says a right value with no calculation is not credited', () => {
    const ctx = ctxOf('t2');
    const state = stateOn(ctx, 1, [
      { raw: '1-2/3=1/3', node: 'not_a' },
      { raw: '3/4', node: 'f_given_na' },
    ]);
    expect(state.session.lines[1]!.match).toEqual({
      verdict: 'unexplained',
      node: 'f_given_na',
    });
    const req = request(state, line('3/4'), {
      tier: 'light',
      reason: 'free_text',
    });
    const d = diagnose(ctx, req);
    expect(d.slip).toBeNull();
    expect(d.lines.join('\n')).toContain(
      'unexplained f_given_na (the right value, no calculation: not credited)',
    );
    expect(d.lines.join('\n')).toContain(
      'Unexplained: his number is the right value of f_given_na, written with no calculation. It is NOT credited',
    );
  });

  it('says which prepared case he is on and the step it rehearses', () => {
    const ctx = ctxOf('t2');
    const spec = caseSpec('t2', 'f_given_na');
    const state = stateOn(
      ctx,
      1,
      [
        { raw: '1-2/3=1/3', node: 'not_a' },
        // Four of the whole class: the path, not the branch.
        { raw: '4/25', node: 'f_given_na', graph: 'S2' },
      ],
      { onCase: 'S2', cases: { S2: spec } },
    );
    const text = buildSituation({
      ctx,
      req: request(state, line('4/25'), {
        tier: 'light',
        reason: 'case_line',
      }),
      tier: 'light',
      allowed: allowedMoves('case_line', 'light', 'tree'),
      memory: null,
      profile: null,
    });
    expect(text).toContain(
      'reason case_line (a line he wrote on the small case he is on',
    );
    expect(text).toContain(
      'Small case:\nHe is on the small case S2: tree of whole counts: 25 people, 16 in A (3 of them in F), 9 not in A (4 of them in F); it rehearses the step f_given_na. For: the step f_given_na as a count over a count',
    );
    expect(text).toContain('L2 «4/25» (on the small case S2)');
    expect(text).toContain('slip intersection_for_conditional at f_given_na');
    expect(text).toContain('Allowed moves: say, probe, case, scaffold.');
  });

  it("says what a line the case does not read is on the question's own step", () => {
    // Question 3, the small class open on the upper missing branch: he goes
    // back to the question's numbers and redoes the quotient of another branch.
    const ctx = ctxOf('t3');
    const state = stateOn(
      ctx,
      2,
      [
        { raw: '1-2/3=1/3', node: 'not_a' },
        { raw: '(1/4)/(1/3)=3/4', node: 'f_given_na' },
        { raw: '(1/4)/(1/3)=3/4', node: 'nf_given_a', graph: 'S1' },
      ],
      { onCase: 'S1', cases: { S1: caseSpec('t3', 'nf_given_a') } },
    );
    expect(state.session.lines[2]!.match).toEqual({ verdict: 'no_match' });
    const d = diagnose(
      ctx,
      request(state, line('(1/4)/(1/3)=3/4'), {
        tier: 'light',
        reason: 'case_line',
      }),
    );
    expect(d.lines.join('\n')).toContain(
      "On the question's own step (not judged there while the small case is open) the same line is: slip quotient_for_complement at nf_given_a (confirmed, a trap: the right value by a wrong road).",
    );
    // A line that is nothing on the question either adds no such line.
    const lost = stateOn(
      ctx,
      2,
      [{ raw: '13/25', node: 'nf_given_a', graph: 'S1' }],
      { onCase: 'S1', cases: { S1: caseSpec('t3', 'nf_given_a') } },
    );
    expect(
      diagnose(
        ctx,
        request(lost, line('13/25'), { tier: 'light', reason: 'case_line' }),
      ).lines.join('\n'),
    ).not.toContain("On the question's own step");
  });

  it('lists his results of the earlier questions', () => {
    const ctx = ctxOf('t4');
    const state = stateOn(ctx, 0, [], {
      carried: {
        't2/not_a': { line: '1-2/3=1/3', value: '1/3' },
        't3/nf_given_na': { line: '1-3/4=1/4', value: '1/4' },
      },
    });
    const text = buildSituation({
      ctx,
      req: request(
        state,
        { kind: 'dont_know' },
        {
          tier: 'deep',
          reason: 'stuck_again',
        },
      ),
      tier: 'deep',
      allowed: allowedMoves('stuck_again', 'deep', 'tree'),
      memory: null,
      profile: null,
    });
    expect(text).toContain(
      'Earlier results he may reuse:\nt2/not_a = 1/3 (his line «1-2/3=1/3»)\nt3/nf_given_na = 1/4 (his line «1-3/4=1/4»)',
    );
    expect(text).toContain('Allowed moves: scaffold, case, probe.');
    expect(text).not.toContain('Small case:');
  });
});

describe('tree: the mover', () => {
  it('sends the tree prompt, the tree pack and tutor_move alone on a light call', async () => {
    const { ctx, req } = trapRequest();
    const { transport, bodies } = fake([[GOOD]]);
    const m = await createMover({ transport, allowance: allowance() })(
      ctx,
      req,
    );
    expect(m).toMatchObject({ tier: 'light', component: null });
    expect(m?.blocks[0]).toMatchObject({ type: 'student_line' });
    const b = bodies[0]!;
    expect(b.model).toBe('claude-haiku-5-5');
    expect(b.system[0]!.text).toBe(treeMovePrompt());
    expect(b.system[1]!.text).toBe(movePack(ctx).text);
    expect(b.system[1]!.text).toContain('Tree: two events');
    expect(b.tools).toEqual(moveTools(false, 'tree'));
    expect(situationOf(b)).toContain(
      'Allowed moves: repair, case, scaffold, probe, escalate.',
    );
  });

  it('lets a message write a fraction the figure gives', async () => {
    const { ctx, req } = trapRequest();
    const { transport, bodies } = fake([
      [
        move({
          move: 'repair',
          message: [
            { type: 'math', latex: 'p(F) = \\frac{5}{12}' },
            { type: 'ar', text: 'العدد هذا فرع ولا طريق كامل؟' },
          ],
        }),
      ],
    ]);
    const m = await createMover({ transport, allowance: allowance() })(
      ctx,
      req,
    );
    expect(m?.blocks[0]).toEqual({
      type: 'math',
      latex: 'p(F) = \\frac{5}{12}',
    });
    expect(bodies).toHaveLength(1);
  });

  it('refuses the calculation of the step, then shows the prepared reply', async () => {
    const { ctx, req } = trapRequest();
    const leak = move({
      move: 'repair',
      message: [
        {
          type: 'math',
          latex: '\\frac{1}{4} \\div \\frac{1}{3} = \\frac{3}{4}',
        },
        ASK,
      ],
    });
    const { transport, bodies } = fake([[leak], [leak]]);
    const m = await createMover({ transport, allowance: allowance() })(
      ctx,
      req,
    );
    expect(m).toBeNull();
    expect(bodies).toHaveLength(2);
    expect(refusal(bodies[1])).toMatch(
      /is the calculation of "f_given_na", which he has not found yet/,
    );
  });

  it('answers a component or a new case with the reason, and shows the fixed move', async () => {
    const { ctx, req } = trapRequest();
    const { transport, bodies } = fake([
      [
        move({
          move: 'case',
          message: [ASK],
          case: { kind: 'box', n: 4, k: 2 },
          component: { name: 'Urn', props_json: '{}', case_id: 'new' },
        }),
      ],
      [GOOD],
    ]);
    const m = await createMover({ transport, allowance: allowance() })(
      ctx,
      req,
    );
    expect(m?.blocks).toHaveLength(2);
    expect(refusal(bodies[1])).toMatch(/no component on a tree question/);
    expect(refusal(bodies[1])).toMatch(/only a prepared case/);
  });

  it('gives a deep call evaluate alone, and puts him on a prepared case', async () => {
    const { ctx, req } = deepRequest();
    const { transport, bodies } = fake([
      [
        tool('evaluate', { lines: ['(1/4)+(1/3)'] }),
        tool('list_outcomes', {
          case_id: 'main',
          what: 'groups',
          reds_exactly: null,
        }),
      ],
      [
        move({
          move: 'case',
          message: [
            { type: 'ar', text: 'نشوفوها في قسم صغير. قدّاش الاحتمال؟' },
          ],
          case: { kind: 'prepared', id: 'S2' },
        }),
      ],
    ]);
    const m = await createMover({ transport, allowance: allowance() })(
      ctx,
      req,
    );
    expect(m).toMatchObject({
      tier: 'deep',
      case: { id: 'S2', spec: caseSpec('t2', 'f_given_na') },
    });
    const b = bodies[0]!;
    expect(b.model).toBe('claude-sonnet-5-5');
    expect(b.tools.map(t => t.name)).toEqual(['evaluate', MOVE_TOOL]);
    const results = bodies[1]!.messages[2]!.content as ToolResultBlock[];
    expect(results[0]!.is_error).toBeUndefined();
    expect(results[1]).toMatchObject({
      is_error: true,
      content: 'No tool "list_outcomes" here.',
    });
  });

  it('counts his results of the earlier questions as numbers he has', async () => {
    const ctx = ctxOf('t4');
    const show = move({
      move: 'probe',
      message: [
        { type: 'math', latex: 'p(\\overline{A}) = \\frac{1}{3}' },
        { type: 'ar', text: 'العدد هذا فرع ولا طريق كامل؟' },
      ],
    });
    const stuck = (carried: ConductorState['carried']) =>
      request(
        stateOn(ctx, 1, [], { carried }),
        { kind: 'dont_know' },
        {
          tier: 'deep',
          reason: 'stuck_again',
        },
      );
    // Opened alone: that branch is a value of this question he has not found.
    const alone = fake([[show], [show]]);
    expect(
      await createMover({
        transport: alone.transport,
        allowance: allowance(),
      })(ctx, stuck({})),
    ).toBeNull();
    expect(refusal(alone.bodies[1])).toMatch(/1\/3 is the value of "not_a"/);
    // Found in question 2: his own number.
    const after = fake([[show]]);
    const m = await createMover({
      transport: after.transport,
      allowance: allowance(),
    })(ctx, stuck({ 't2/not_a': { line: '1-2/3=1/3', value: '1/3' } }));
    expect(m?.blocks).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// The exercise itself (its content, its cases, the real conductor).

describe('bac2022p-sc-ex2: the real exercise', () => {
  const TREE = 'bac2022p-sc-ex2';
  const entry = CATALOG.find(e => e.id === TREE)!;
  const loaded = entry.result.ok ? entry.result.loaded : null;
  const real = (q: string) => questionCtx(loaded!, entry.raw as never, q);

  it.each(IDS)('%s: its pack is a tree pack under 8,000 characters', id => {
    const ctx = real(id);
    expect(ctx.pack.domain).toBe('tree');
    expect(ctx.pack.notes?.hybridOnly).toBe(true);
    const pack = movePack(ctx);
    expect(pack.domain).toBe('tree');
    expect(pack.text.length).toBeLessThanOrEqual(PACK_MAX);
    expect(pack.text).toContain(`exercise ${TREE}`);
    expect(pack.text).toContain(`(id "${id}")`);
    expect(pack.text).toContain('Tree: two events');
    expect(pack.text).toContain('- Given: p(A) = 2/3');
    // Each plan card says which step of the graph it is.
    for (const c of ctx.pack.plan) {
      expect(pack.text).toContain(`- ${c.id} (step ${c.key}) «`);
    }
    expect(pack.text).toContain(
      'Route notes (how this question usually goes):',
    );
    for (const t of ctx.pack.main!.table.traps ?? []) {
      expect(pack.text).toContain(`  - ${t.id} at ${t.nodeId}: `);
    }
    for (const word of [
      /\burns?\b/i,
      /\bballs?\b/i,
      /C\(n/,
      /Components that fit/,
    ]) {
      expect(pack.text).not.toMatch(word);
    }
    // Its prepared cases are the lesson's own (src/content/cases.*.json).
    expect(pack.prepared.length).toBeGreaterThanOrEqual(2);
    for (const c of pack.prepared) {
      expect(c.spec.kind).toBe('tree');
      expect(pack.text).toContain(`- ${c.id}: tree of whole counts: `);
    }
    // Only this question.
    for (const other of IDS.filter(x => x !== id)) {
      expect(pack.text).not.toContain(`(id "${other}")`);
    }
  });

  it('gives the figure fractions as numbers of the statement, whole', () => {
    for (const id of IDS) {
      const given = real(id).pack.given;
      expect(given).toEqual(expect.arrayContaining(['2/3', '1/4', '5/12']));
      expect(given).not.toContain('5');
      expect(given).not.toContain('12');
    }
  });

  it("lets the lesson's reply templates through the tree reading", () => {
    /** The template the lesson shows after `acts`, for the last one. */
    const filled = (q: string, acts: StudentAct[]) => {
      const ctx = real(q);
      let state = startQuestion(ctx);
      let blocks: ReturnType<typeof templates> = null;
      for (const a of acts) {
        const r = conduct(ctx, state, a);
        blocks = templates(ctx, r.state, r.out);
        state = applyFallback(r.state, r.out);
      }
      return blocks;
    };
    const start: StudentAct = { kind: 'continue' };
    const rule: StudentAct = { kind: 'choice', optionId: 'k_quot' };
    // The trap of question 2: his line, then one question (no number).
    const trap = filled('t2', [
      start,
      line('1-2/3=1/3'),
      rule,
      line('1-1/4=3/4'),
    ]);
    expect(trap?.[0]).toMatchObject({ type: 'student_line', raw: '1-1/4=3/4' });
    // A quotient upside down: his own value (4/3) in a math block.
    const above = filled('t2', [
      start,
      line('1-2/3=1/3'),
      rule,
      line('(1/3)/(1/4)=4/3'),
    ]);
    expect(above).toEqual(
      expect.arrayContaining([{ type: 'math', latex: '\\frac{4}{3}' }]),
    );
    // Question 1, not simplified yet: the result as the statement prints it.
    const split: StudentAct = { kind: 'choice', optionId: 'k_sum' };
    const target = filled('t1', [
      start,
      line('2/3*1/4=1/6'),
      split,
      line('5/12-1/6=3/12'),
    ]);
    expect(target).toEqual(
      expect.arrayContaining([
        { type: 'math', latex: 'p(\\overline{A} \\cap F) = \\frac{1}{4}' },
      ]),
    );
  });

  it('sends the tree prompt and tools for a moment of the real lesson', async () => {
    // Question 2: the first branch, the right rule, then the trap, twice.
    const ctx = real('t2');
    const acts: StudentAct[] = [
      { kind: 'continue' },
      line('1-2/3=1/3'),
      { kind: 'choice', optionId: 'k_quot' },
      line('1-1/4=3/4'),
    ];
    let state = startQuestion(ctx);
    for (const a of acts) {
      const r = conduct(ctx, state, a);
      state = applyFallback(r.state, r.out);
    }
    const again = line('1-1/4=3/4');
    const r = conduct(ctx, state, again);
    expect(r.out).toMatchObject({ tier: 'light', reason: 'slip_again' });
    const his = r.state.session.lines[r.state.session.lines.length - 1]!;
    const { transport, bodies } = fake([
      [
        move({
          move: 'repair',
          message: [{ type: 'student_line', line_id: his.id }, ASK],
        }),
      ],
    ]);
    const m = await createMover({ transport, allowance: allowance() })(ctx, {
      act: again,
      out: r.out,
      state: r.state,
    });
    expect(m?.blocks[0]).toMatchObject({
      type: 'student_line',
      raw: '1-1/4=3/4',
    });
    const b = bodies[0]!;
    expect(b.system[0]!.text).toBe(treeMovePrompt());
    expect(b.system[1]!.text).toBe(movePack(ctx).text);
    expect(b.tools).toEqual(moveTools(false, 'tree'));
    const situation = situationOf(b);
    expect(situation).toContain(
      'slip complement_across_nodes at f_given_na (confirmed, a trap: the right value by a wrong road)',
    );
    expect(situation).toContain(
      'Trap: this wrong road lands on the right value',
    );
    expect(situation).toContain(
      'Allowed moves: repair, case, scaffold, probe, escalate.',
    );
    expect(situation.length).toBeLessThanOrEqual(SITUATION_MAX);
  });
});
