/**
 * The `moves` command of the tutor harness: a script against the real mover.
 * No test makes a network call: the cap is tested on a fake transport, the
 * run with --dry (no transport) on the urn exercise. The four tree scripts
 * are checked line by line with the engine on the exam's numbers; their run
 * through the conductor waits for the exercise in the catalog.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { StudentAct } from '../../src/ai/checks/autoCheck';
import { mathSegments } from '../../src/ai/checks/freeText';
import { matchOnGraph, readLine } from '../../src/ai/checks/lines';
import { aiCostUsd, aiWorstCaseUsd } from '../../src/ai/config';
import { MOVE_TOOL } from '../../src/ai/move/tool';
import { createBudget } from '../../src/ai/session/budget';
import { caseRuntime } from '../../src/ai/session/state';
import type {
  MessagesTransport,
  SendResult,
} from '../../src/ai/transport/messagesApi';
import type {
  ContentBlock,
  MessagesRequest,
} from '../../src/ai/transport/wire';
import { CATALOG } from '../../src/app/exercises';
import { evaluateLine } from '../../src/method/frame';
import '../../src/method/library';
import { mutationsFor } from '../../src/method/mutations';
import { buildGraphFor } from '../../src/method/templates';
import { COINCIDENCE } from '../../src/method/templatesTree';
import { args, DEFAULT_EXERCISE, load } from './cli';
import type { Script } from './conduct';
import {
  cappedTransport,
  DEFAULT_CAP_USD,
  runMoves,
  type CallRecord,
} from './moves';

/**
 * The old hints path (a step without a help ladder, src/content/help):
 * this file switch the ladders off, so «ما نعرفش» gives the hints and the AI as before.
 */
const mockLadders = { off: true };
jest.mock('../../src/content/help/help', () => {
  const actual = jest.requireActual<
    typeof import('../../src/content/help/help')
  >('../../src/content/help/help');
  return {
    ...actual,
    ladderFor: (...a: Parameters<typeof actual.ladderFor>) =>
      mockLadders.off ? null : actual.ladderFor(...a),
  };
});

const script = (name: string): Script =>
  JSON.parse(
    readFileSync(path.join(__dirname, 'scripts', `${name}.json`), 'utf8'),
  ) as Script;

const USAGE = {
  input: 1_000,
  cacheRead: 5_000,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 300,
};

/** A transport that answers every call with `content` (and counts the calls). */
function fake(content: ContentBlock[] | 'timeout' | 'network') {
  const bodies: MessagesRequest[] = [];
  const transport: MessagesTransport = {
    send: jest.fn(async (body: MessagesRequest): Promise<SendResult> => {
      bodies.push(body);
      if (typeof content === 'string') {
        return {
          ok: false,
          error: content,
          retryable: false,
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

const body = (model = 'claude-haiku-5-5'): MessagesRequest => ({
  model,
  max_tokens: 2_000,
  system: [{ type: 'text', text: 'x'.repeat(9_000) }],
  messages: [{ role: 'user', content: [{ type: 'text', text: 'situation' }] }],
  tools: [],
  thinking: { type: 'adaptive' },
  output_config: { effort: 'low' },
});
const worst = (b: MessagesRequest) =>
  aiWorstCaseUsd(b.model, JSON.stringify(b).length, b.max_tokens);

describe('harness arguments and exercises', () => {
  it('reads a flag with no value', () => {
    expect(
      args(['--script', 'tree-t1', '--dry', '--cap', '0.5', '--dry2']),
    ).toEqual({ script: 'tree-t1', dry: 'true', cap: '0.5', dry2: 'true' });
    expect(args(['pack', '--question', '1'])).toEqual({ question: '1' });
  });

  it('looks an exercise up in the catalog of the app', () => {
    expect(DEFAULT_EXERCISE).toBe('bac2022c-sc-ex2');
    const { loaded } = load(DEFAULT_EXERCISE);
    expect(loaded.exercise.id).toBe(DEFAULT_EXERCISE);
    expect(() => load('no-such-exercise')).toThrow(
      /unknown exercise no-such-exercise; the catalog has .*bac2022c-sc-ex2/,
    );
  });
});

describe('the cap of a moves run', () => {
  it('sends a call that fits and adds what it cost', async () => {
    const { transport, bodies } = fake([]);
    const budget = createBudget({ sessionCapUsd: DEFAULT_CAP_USD });
    const seen: CallRecord[] = [];
    const t = cappedTransport({
      inner: transport,
      budget,
      onCall: c => seen.push(c),
    });
    const r = await t.send(body(), { timeoutMs: 1 });
    expect(r.ok).toBe(true);
    expect(bodies).toHaveLength(1);
    const cost = aiCostUsd('claude-haiku-5-5', USAGE);
    expect(budget.spentUsd()).toBeCloseTo(cost, 12);
    expect(seen).toEqual([
      expect.objectContaining({ outcome: 'sent', costUsd: cost }),
    ]);
    expect(t.capped()).toBe(false);
  });

  it('does NOT make the call whose worst case would pass the cap, and stays closed', async () => {
    const { transport, bodies } = fake([]);
    const dear = body('claude-sonnet-5-5');
    // Room for the worst case of a Haiku call, not of a Sonnet call.
    const capUsd = (worst(body()) + worst(dear)) / 2;
    const budget = createBudget({ sessionCapUsd: capUsd });
    const seen: CallRecord[] = [];
    const t = cappedTransport({
      inner: transport,
      budget,
      onCall: c => seen.push(c),
    });
    const r = await t.send(dear, { timeoutMs: 1 });
    expect(r).toMatchObject({ ok: false, detail: 'capped' });
    expect(t.capped()).toBe(true);
    // A cheaper call after that is not made either: the run is over.
    expect(await t.send(body(), { timeoutMs: 1 })).toMatchObject({
      ok: false,
      detail: 'capped',
    });
    expect(bodies).toHaveLength(0);
    expect(budget.spentUsd()).toBe(0);
    expect(seen.map(c => c.outcome)).toEqual(['capped', 'capped']);
  });

  it('stops at the call that would pass the cap, after the ones that fit', async () => {
    const { transport, bodies } = fake([]);
    const one = aiCostUsd('claude-haiku-5-5', USAGE);
    // Two real calls fit; before the third, spent + worst case is over the cap.
    const budget = createBudget({
      sessionCapUsd: 2 * one + worst(body()) - 1e-9,
    });
    const t = cappedTransport({ inner: transport, budget });
    expect((await t.send(body(), { timeoutMs: 1 })).ok).toBe(true);
    expect((await t.send(body(), { timeoutMs: 1 })).ok).toBe(true);
    expect(await t.send(body(), { timeoutMs: 1 })).toMatchObject({
      ok: false,
      detail: 'capped',
    });
    expect(bodies).toHaveLength(2);
    expect(budget.spentUsd()).toBeCloseTo(2 * one, 12);
  });

  it('counts the worst case of a timed-out call, nothing for one that never left', async () => {
    const budget = createBudget({ sessionCapUsd: DEFAULT_CAP_USD });
    const timeout = cappedTransport({
      inner: fake('timeout').transport,
      budget,
    });
    await timeout.send(body(), { timeoutMs: 1 });
    expect(budget.spentUsd()).toBeCloseTo(worst(body()), 12);
    const offline = createBudget({ sessionCapUsd: DEFAULT_CAP_USD });
    await cappedTransport({
      inner: fake('network').transport,
      budget: offline,
    }).send(body(), { timeoutMs: 1 });
    expect(offline.spentUsd()).toBe(0);
  });

  it('a dry run sends nothing and adds an estimate: the first call writes the cache', async () => {
    const budget = createBudget({ sessionCapUsd: DEFAULT_CAP_USD });
    const seen: CallRecord[] = [];
    const t = cappedTransport({
      inner: null,
      budget,
      onCall: c => seen.push(c),
    });
    expect(await t.send(body(), { timeoutMs: 1 })).toMatchObject({
      ok: false,
      detail: 'dry',
    });
    await t.send(body(), { timeoutMs: 1 });
    expect(seen.map(c => c.outcome)).toEqual(['dry', 'dry']);
    const [cold, warm] = seen.map(c => c.costUsd);
    expect(cold!).toBeGreaterThan(warm!);
    expect(warm!).toBeGreaterThan(0);
    expect(cold!).toBeLessThanOrEqual(seen[0]!.worstUsd);
    expect(budget.spentUsd()).toBeCloseTo(cold! + warm!, 12);
  });
});

describe('a moves run on the urn exercise (dry and faked: no network)', () => {
  const { loaded, raw } = load(DEFAULT_EXERCISE);
  const owner = script('owner-q1');
  const hard = (lines: string[]) =>
    lines.filter(l => /^\*\*\[(light|deep):/.test(l)).length;

  it('plays the script dry: every hard moment is priced, none is called', async () => {
    const r = await runMoves({
      loaded,
      raw,
      questionId: owner.question,
      acts: owner.acts,
      capUsd: DEFAULT_CAP_USD,
      transport: null,
      allowance: 'open',
    });
    expect(r.acts).toBe(owner.acts.length);
    expect(r.stopped).toBe(false);
    expect(r.moves).toBe(0);
    expect(hard(r.lines)).toBeGreaterThanOrEqual(2);
    // One priced call per hard moment (a real run may add a retry or a compute hop).
    expect(r.calls).toBe(hard(r.lines));
    expect(r.spentUsd).toBeGreaterThan(0);
    expect(r.spentUsd).toBeLessThan(DEFAULT_CAP_USD);
    const text = r.lines.join('\n');
    expect(text).toContain('**[instant]**');
    expect(text).toContain('(dry, not sent): claude-sonnet-5-5');
    expect(text).toContain(
      'Prepared reply (what he reads when there is no AI move):',
    );
    expect(text).toContain(
      '**No AI move**: the prepared reply is shown (dry run).',
    );
    expect(text).toMatch(/Running total: \$0\.\d{4} \(estimate\) of \$1\.0000/);
  });

  it('stops before the first call when the cap has no room for it', async () => {
    const r = await runMoves({
      loaded,
      raw,
      questionId: owner.question,
      acts: owner.acts,
      capUsd: 0.000001,
      transport: null,
      allowance: 'open',
    });
    expect(r.stopped).toBe(true);
    expect(r.calls).toBe(0);
    expect(r.spentUsd).toBe(0);
    expect(r.acts).toBeLessThan(owner.acts.length);
    expect(hard(r.lines)).toBe(1);
    expect(r.lines.join('\n')).toMatch(
      /call 1 NOT made: .* would pass the cap[\s\S]*cap reached: the run stops before this call/,
    );
  });

  it('shows the AI move, the cost of each call and why a move was refused', async () => {
    const ask = {
      type: 'tool_use',
      id: 'toolu_1',
      name: MOVE_TOOL,
      // Two questions in one message: refused, then the same again.
      input: {
        move: 'probe',
        message: [{ type: 'ar', text: 'شنوّة يعدّ السطر متاعك؟ وعلاش؟' }],
        component: null,
        case: null,
      },
    } as ContentBlock;
    const refused = await runMoves({
      loaded,
      raw,
      questionId: owner.question,
      acts: owner.acts.slice(0, 3),
      capUsd: DEFAULT_CAP_USD,
      transport: fake([ask]).transport,
      allowance: 'open',
    });
    const text = refused.lines.join('\n');
    expect(refused.moves).toBe(0);
    expect(refused.calls).toBeGreaterThanOrEqual(2);
    expect(text).toMatch(
      /- call 1: claude-(haiku|sonnet)-5-5, stop tool_use, tools \[tutor_move\]/,
    );
    expect(text).toContain('  - refused: 2 questions in one message');
    expect(refused.spentUsd).toBeGreaterThan(0);

    const good = {
      ...ask,
      input: {
        move: 'probe',
        message: [{ type: 'ar', text: 'شنوّة يعدّ السطر متاعك؟' }],
        component: null,
        case: null,
      },
    } as ContentBlock;
    const shown = await runMoves({
      loaded,
      raw,
      questionId: owner.question,
      acts: owner.acts.slice(0, 3),
      capUsd: DEFAULT_CAP_USD,
      transport: fake([good]).transport,
      allowance: 'open',
    });
    expect(shown.moves).toBeGreaterThanOrEqual(1);
    expect(shown.lines.join('\n')).toMatch(
      /\*\*AI move\*\* \((light|deep), \$0\.\d{4}\): شنوّة يعدّ السطر متاعك؟/,
    );
  });

  it("keeps the app's own limits with --allowance app", async () => {
    // Fourteen sentences with a calculation: each one is a hard moment.
    const claim: StudentAct = { kind: 'free', text: 'ya3ni 10*3 = 30' };
    const acts: StudentAct[] = [{ kind: 'continue' }, ...Array(14).fill(claim)];
    const good = {
      type: 'tool_use',
      id: 'toolu_2',
      name: MOVE_TOOL,
      input: {
        move: 'probe',
        message: [{ type: 'ar', text: 'شنوّة يعدّ السطر متاعك؟' }],
        component: null,
        case: null,
      },
    } as ContentBlock;
    const run = (allowance: 'open' | 'app') =>
      runMoves({
        loaded,
        raw,
        questionId: owner.question,
        acts,
        capUsd: DEFAULT_CAP_USD,
        transport: fake([good]).transport,
        allowance,
      });
    // The harness's own allowance: every hard moment gets its move.
    const open = await run('open');
    expect(open.moves).toBe(14);
    // The app's: two deep calls and ten light ones for a question, then none.
    const app = await run('app');
    expect(app.moves).toBe(12);
    expect(app.lines.join('\n')).toContain(
      'the prepared reply is shown (the allowance did not permit a call)',
    );
  });
});

// ---------------------------------------------------------------------------
// The tree scripts: what each act is, by the engine, on the exam's numbers.

const TREE = 'bac2022p-sc-ex2';
const EXAM = { pA: [2, 3], pFgA: [1, 4], pF: [5, 12] };
const TEMPLATES: Record<string, string> = {
  t1: 'tree_other_path',
  t2: 'tree_conditional',
  t3: 'tree_complete',
  t4: 'tree_reverse',
};
/** The lesson's small class and the steps it has a prepared case for (docs/exercises/BAC2022P_SC_EX2.md). */
const CLASS = { n: 25, a: 16, af: 3, naf: 4 };
const CASE_STEPS = [
  'a_and_f',
  'na_and_f',
  'not_a',
  'f_given_na',
  'nf_given_a',
  'nf_given_na',
  'not_f',
  'na_and_nf',
  'na_given_nf',
];
/** The right card of each pick (a plan card with no line). */
const RIGHT_PICK: Record<string, string> = { split: 'k_sum', rule: 'k_quot' };

/**
 * What the engine says of each scripted act, walking the plan cards as the
 * conductor does (src/hybrid/conductor/conductor.ts): a credit moves to the
 * next card, a pick waits for its right card, a second «ما نعرفش» on a step
 * with a prepared case opens it, and a line is judged on the open case first.
 */
function engineSays(question: string, acts: readonly StudentAct[]): string[] {
  const template = TEMPLATES[question]!;
  const graph = buildGraphFor(
    { template, args: EXAM as never },
    { inputs: {} },
  );
  const table = mutationsFor(graph);
  const cards = graph.cards ?? [];
  const hasLine = (card: string | undefined) =>
    graph.nodes.some(n => n.planCard === card && n.main);
  const credited = new Set<string>();
  const opened = new Set<string>();
  let at = 0;
  let stuck = 0;
  let open: string | null = null;
  const next = () => {
    at += 1;
    stuck = 0;
  };
  return acts.map((a, i) => {
    const card = cards[at]!;
    switch (a.kind) {
      case 'continue':
        return i === 0 ? 'trip' : 'continue';
      case 'free':
        return mathSegments(a.text).length > 0 ? 'claim' : 'free';
      case 'choice': {
        expect(hasLine(card)).toBe(false);
        const right = RIGHT_PICK[card] === a.optionId;
        if (right) {
          next();
        }
        return `pick ${a.optionId} (${right ? 'right' : 'wrong'})`;
      }
      case 'dont_know': {
        stuck += open === null ? 1 : 0;
        const opens =
          open === null &&
          stuck === 2 &&
          hasLine(card) &&
          CASE_STEPS.includes(card) &&
          !opened.has(card);
        if (opens) {
          open = card;
          opened.add(card);
          return `dont_know (the small class opens: ${card})`;
        }
        return 'dont_know';
      }
      case 'line': {
        expect(hasLine(card)).toBe(true);
        const ev = evaluateLine({ raw: a.raw, graph, table, card, credited });
        // The conductor would stop to ask how an ambiguous division is meant.
        expect(ev.readback).toBeNull();
        const o = ev.outcome;
        if (open !== null) {
          const small = caseRuntime('S', {
            kind: 'tree',
            template,
            node: open,
            ...CLASS,
          })!;
          const m = matchOnGraph(small, readLine(a.raw).chain, new Set(), open);
          if (m.verdict === 'credit') {
            open = null;
            return 'on the small class: credit';
          }
          if (m.verdict === 'slip') {
            return `on the small class: slip ${m.slip}`;
          }
          const back = ['credit', 'support', 'unreadable', 'unfinished'];
          if (!back.includes(o.kind) && o.kind !== 'mismatch') {
            return 'on the small class: no match';
          }
          open = null;
        }
        if (o.kind === 'credit') {
          credited.add(o.node.id);
          if (o.completes && !o.unsimplified) {
            next();
          }
          return `credit ${o.node.id}`;
        }
        if (o.kind === 'mutation') {
          const trap =
            o.id === COINCIDENCE ||
            (table.traps ?? []).some(
              c => c.id === o.id && c.nodeId === o.nodeId,
            );
          return `${trap ? 'trap' : 'slip'} ${o.id} at ${o.nodeId}`;
        }
        return o.kind === 'generic' ? `undiagnosed at ${card}` : o.kind;
      }
      default:
        return a.kind;
    }
  });
}

describe('the tree scripts', () => {
  const names = ['tree-t1', 'tree-t2', 'tree-t3', 'tree-t4'];

  it.each(names)('%s: each act is what the script says it is', name => {
    const s = script(name);
    expect(s.exercise).toBe(TREE);
    expect(Object.keys(TEMPLATES)).toContain(s.question);
    expect(s.acts.length).toBeGreaterThanOrEqual(6);
    expect(s.acts.length).toBeLessThanOrEqual(10);
    expect(engineSays(s.question, s.acts)).toEqual(s.expect);
  });

  it('together they reach every hard moment asked for', () => {
    const all = names.flatMap(n => script(n).expect ?? []);
    const count = (re: RegExp) => all.filter(x => re.test(x)).length;
    // A known slip repeated, a trap, a line nobody expects, «ما نعرفش»
    // several times, a typed question, a wrong pick twice, a line on a case.
    expect(count(/^slip /)).toBeGreaterThanOrEqual(6);
    expect(count(/^trap /)).toBeGreaterThanOrEqual(3);
    expect(count(/^undiagnosed /)).toBeGreaterThanOrEqual(2);
    expect(count(/^dont_know/)).toBeGreaterThanOrEqual(6);
    expect(count(/the small class opens/)).toBe(2);
    expect(count(/^on the small class: no match$/)).toBe(2);
    expect(count(/^free$/)).toBeGreaterThanOrEqual(3);
    expect(count(/^claim$/)).toBe(1);
    expect(count(/^pick .* \(wrong\)$/)).toBe(2);
    for (const n of names) {
      const acts = script(n).acts;
      // The same line twice in a row: the second time is not instant.
      expect(
        acts.some(
          (a, i) =>
            a.kind === 'line' &&
            acts[i + 1]?.kind === 'line' &&
            (acts[i + 1] as { raw: string }).raw === a.raw,
        ),
      ).toBe(true);
    }
  });

  /** The hard moments of a run (tier and reason), as the transcript tags them. */
  const hard = (lines: string[]): string[] =>
    lines.flatMap(l => {
      const m = /^\*\*\[(light|deep):(\w+)\]\*\*/.exec(l);
      return m ? [`${m[1]} ${m[2]}`] : [];
    });

  /**
   * The moments each script is written to reach, as the real conductor tags
   * them on the exercise's content (the other acts are instant). A script
   * that stops reaching one of them must be rewritten, not this list.
   */
  const HARD: Record<string, string[]> = {
    'tree-t1': [
      'light slip_again',
      'light free_text',
      'deep undiagnosed',
      'light case_line',
    ],
    'tree-t2': [
      'deep stuck_again',
      'light pick_again',
      'light slip_again',
      'light free_text',
    ],
    'tree-t3': ['light slip_again', 'deep claim', 'light case_line'],
    'tree-t4': [
      'light slip_again',
      'deep slip_third',
      'light free_text',
      'deep undiagnosed',
    ],
  };

  // The run through the conductor needs the exercise's content.
  const entry = CATALOG.find(e => e.id === TREE);
  const ready = entry?.result.ok === true;
  (ready ? it.each(names) : it.skip.each(names))(
    '%s: plays dry through the conductor and the mover',
    async name => {
      const s = script(name);
      const { loaded, raw } = load(TREE);
      const r = await runMoves({
        loaded,
        raw,
        questionId: s.question,
        acts: s.acts,
        capUsd: DEFAULT_CAP_USD,
        transport: null,
        allowance: 'open',
      });
      expect(r.acts).toBe(s.acts.length);
      expect(hard(r.lines)).toEqual(HARD[name]);
      // Dry: one priced call per hard moment, no move, far under the cap.
      expect(r.calls).toBe(HARD[name]!.length);
      expect(r.moves).toBe(0);
      expect(r.spentUsd).toBeGreaterThan(0);
      expect(r.spentUsd).toBeLessThan(DEFAULT_CAP_USD / 4);
      // The tree prompt and tools go out, never the urn's.
      const text = r.lines.join('\n');
      expect(text).toMatch(/\(dry, not sent\): claude-(haiku|sonnet)-5-5/);
    },
  );
});
