import a1 from './scenarios/A1.json';
import s2a from './scenarios/2a.json';
import {
  estimate,
  fileLedger,
  formatReport,
  formatReview,
  loadExercises,
  parseEnv,
  readable,
  runLive,
  scenarioPoints,
  type RunRow,
  type ScenarioFile,
  type SpendFile,
} from './evalLib';
import type { LlmTransport } from '../../src/planner/llm/client';

const exercises = loadExercises();
const points = [
  ...scenarioPoints(a1 as ScenarioFile, exercises),
  ...scenarioPoints(s2a as ScenarioFile, exercises),
];
const byId = new Map(points.map(p => [p.id, p]));

describe('scenario fixtures reach their decision point with the expected trigger', () => {
  it('about 10 typical mistakes for A1 and for 2.a; 6 + 6 review samples', () => {
    expect(points.filter(p => p.questionId === 'A1')).toHaveLength(11);
    expect(points.filter(p => p.questionId === '2a')).toHaveLength(10);
    expect(points.filter(p => p.sample && p.questionId === 'A1')).toHaveLength(
      6,
    );
    expect(points.filter(p => p.sample && p.questionId === '2a')).toHaveLength(
      6,
    );
  });

  it.each([
    ['A1-s3-no-negative', 'A1/s3', 'every_mistake'],
    ['A1-s3-twice', 'A1/s3', 'second_struggle'],
    ['A1-s8-exp-gap', 'A1/s8', 'line_wrong'],
    ['A1-s8-missing-parentheses', 'A1/s8', 'line_wrong'],
    ['A1-s8-unknown-line', 'A1/s8', 'line_wrong'],
    ['A1-s8-unreadable', 'A1/s8', 'line_invalid'],
    ['A1-s8-wrong-then-not-sure', 'A1/s8', 'second_struggle'],
    ['A1-s9-odd', 'A1/s9', 'every_mistake'],
    ['2a-s6-ordered', '2a/s6', 'every_mistake'],
    ['2a-s6-unknown', '2a/s6', 'unknown_wrong'],
    ['2a-s9-balls', '2a/s9', 'every_mistake'],
    ['2a-s10-complement', '2a/s10', 'every_mistake'],
    ['2a-s10-wrong-then-not-sure', '2a/s10', 'second_struggle'],
    ['2a-sum-not-one', '2a/sum', 'every_mistake'],
    ['2a-sum-unknown', '2a/sum', 'unknown_wrong'],
  ])('%s at %s: %s', (id, step, reason) => {
    const p = byId.get(id)!;
    expect(p.situation.step.key).toBe(step);
    expect(p.reason).toBe(reason);
  });

  it('a known misconception is in the situation where the content names one', () => {
    expect(
      byId.get('A1-s8-exp-gap')!.situation.step.wrongValues.at(-1),
    ).toMatchObject({
      misconceptionId: 'exponent_rules_gap',
    });
    expect(
      byId.get('2a-s6-ordered')!.situation.step.wrongValues.at(-1),
    ).toMatchObject({
      misconceptionId: 'counts_ordered_pairs',
    });
  });
});

describe('estimate (no generation)', () => {
  it('Anthropic: exact counts per call, cache write once per question then reads; OpenAI approximate', async () => {
    const counted: string[] = [];
    const count = async (model: string, _s: string, parts: string[]) => {
      counted.push(model);
      return parts.length === 1 ? 5000 : 6000;
    };
    const two = points.filter(p => p.questionId === 'A1').slice(0, 2);
    const rows = await estimate(
      two,
      ['claude-haiku-4-5-20251001', 'gpt-6-luna'],
      count,
      2,
    );
    const haiku = rows[0]!;
    expect(haiku).toMatchObject({
      calls: 4,
      avgInput: 6000,
      avgPrefix: 5000,
      cacheable: true,
      counted: 'exact',
    });
    // 1 write (5000 x 1.25) + 3 reads (5000 x 0.1), 1000 uncached x 4, 450 out x 4 at Haiku 4.5 prices.
    const expected =
      (5000 * 1.25 + 3 * 5000 * 0.1 + 4 * 1000 * 1 + 4 * 450 * 5) / 1e6;
    expect(haiku.typicalUsd).toBeCloseTo(expected, 8);
    expect(haiku.worstUsd).toBeGreaterThan(haiku.typicalUsd);
    expect(rows[1]).toMatchObject({ counted: 'approx', cacheable: false });
    expect(counted.every(m => m.startsWith('claude'))).toBe(true);
  });

  it('a prefix under the minimum cacheable length is billed uncached', async () => {
    const rows = await estimate(
      points.slice(0, 1),
      ['claude-haiku-4-5-20251001'],
      async (_m, _s, p) => (p.length === 1 ? 3000 : 3500),
      2,
    );
    expect(rows[0]!.cacheable).toBe(false);
    expect(rows[0]!.typicalUsd).toBeCloseTo(
      (2 * 3500 * 1 + 2 * 450 * 5) / 1e6,
      8,
    );
  });
});

describe('live run (fake transport), report and review', () => {
  const wire = JSON.stringify({
    diagnosis: { misconceptionId: '', description: 'ask', confidence: 0.4 },
    why: 'unclear error',
    action: 'ask_clarify',
    target: '',
    propsJson: '',
    blocks: [
      {
        type: 'text',
        runs: [{ lang: 'ar', text: 'شنوّة اللي موش واضح؟' }],
        latex: '',
      },
      { type: 'text', runs: [{ lang: 'ar', text: 'نحب مثال' }], latex: '' },
    ],
  });
  const fake = (latencyMs: number, error?: 'rate_limited'): LlmTransport => ({
    provider: 'fake',
    checkModel: async id => ({ ok: true, id }),
    respond: async req => {
      const usage = {
        inputTokens: 6000,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 0,
        outputTokens: 120,
        reasoningTokens: 0,
      };
      if (error) {
        return {
          requestId: req.requestId,
          model: req.model,
          ok: false,
          error,
          latencyMs,
          usage: null,
          status: 429,
        };
      }
      const parsed = req.format.wire!.zod.safeParse(JSON.parse(wire));
      return parsed.success
        ? {
            requestId: req.requestId,
            model: req.model,
            ok: true,
            value: parsed.data,
            latencyMs,
            usage,
            raw: wire,
          }
        : {
            requestId: req.requestId,
            model: req.model,
            ok: false,
            error: 'invalid',
            latencyMs,
            usage,
          };
    },
  });

  it('valid vs usable at 3.5 s; a 429 stops that model; the ledger caps the run', async () => {
    let file: SpendFile = {
      days: {},
      runs: [{ id: 'r1', at: 'now', capUsd: 1, usd: 0, models: [] }],
    };
    const ledger = fileLedger(
      () => JSON.parse(JSON.stringify(file)),
      f => (file = f),
      'r1',
      '2026-10-21',
    );
    const few = points.filter(p => p.sample).slice(0, 3);
    let firstCall: number | null = null;
    const r = await runLive(
      few,
      ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5-20251001'],
      {
        transportFor: m =>
          m === 'claude-haiku-5-5'
            ? fake(800)
            : m === 'claude-sonnet-5-5'
            ? fake(6000) // over the planner limit (5 s since 2026-10-22)
            : fake(100, 'rate_limited'),
        ledger,
        capUsd: 1,
        passes: 1,
        onFirstCall: row => (firstCall = row.costUsd ?? null),
      },
    );
    const fast = r.rows.filter(x => x.model === 'claude-haiku-5-5');
    const slow = r.rows.filter(x => x.model === 'claude-sonnet-5-5');
    expect(fast.every(x => x.outcome === 'ok' && x.usable)).toBe(true);
    expect(slow.every(x => x.outcome === 'ok' && !x.usable)).toBe(true);
    expect(
      r.rows.filter(x => x.model === 'claude-haiku-4-5-20251001'),
    ).toHaveLength(1);
    expect(r.skipped).toEqual([
      { model: 'claude-haiku-4-5-20251001', why: 'stopped: rate_limited' },
    ]);
    expect(firstCall).toBeGreaterThan(0);
    expect(file.runs[0]!.usd).toBeGreaterThan(0);
    expect(file.days['2026-10-21']).toBeCloseTo(file.runs[0]!.usd, 10);

    const report = formatReport(r.rows, r.skipped, {
      points: 3,
      passes: 1,
      capUsd: 1,
      spentUsd: file.runs[0]!.usd,
    });
    expect(report).toMatch(/\| claude-haiku-5-5 \| 3 \| 100% \| 100% \|/);
    expect(report).toMatch(/\| claude-sonnet-5-5 \| 3 \| 100% \| 0% \|/);
    expect(report).toMatch(/darija quality/);
    // Latency (2026-10-22): the timeout is chosen from these numbers.
    expect(report).toContain('## Latency (planner)');
    expect(report).toMatch(
      /\| claude-haiku-5-5 \| 3 \| 0 \(0%\) \| 800 ms \| 2 \| 800 \/ 800 ms \|/,
    );
    expect(report).toMatch(
      /\| claude-sonnet-5-5 \| 3 \| 3 \(100%\) \| 6000 ms \| 2 \| 6000 \/ 6000 ms \|/,
    );
    const review = formatReview(few, r.rows);
    expect(review).toContain('شنوّة اللي موش واضح؟');
    expect(review).toContain('darija score (1-5)');
  });

  it('the eval-only planner timeout reaches every call; the report says it, adds "within 3.5 s" and the first calls\' real tokens', async () => {
    let file: SpendFile = {
      days: {},
      runs: [{ id: 'r3', at: 'now', capUsd: 1, usd: 0, models: [] }],
    };
    const ledger = fileLedger(
      () => JSON.parse(JSON.stringify(file)),
      f => (file = f),
      'r3',
      'd',
    );
    const seen: number[] = [];
    const t = fake(800);
    const transport: LlmTransport = {
      ...t,
      respond: req => {
        seen.push(req.timeoutMs);
        return t.respond(req);
      },
    };
    const few = points.filter(p => p.sample).slice(0, 2);
    const r = await runLive(few, ['claude-haiku-5-5'], {
      transportFor: () => transport,
      ledger,
      capUsd: 1,
      passes: 1,
      timeoutMs: 15000,
    });
    expect(seen).toEqual([15000, 15000]);
    // An eval-only output cap reaches every planner call too.
    const caps: number[] = [];
    const t2 = fake(800);
    await runLive(few, ['claude-haiku-5-5'], {
      transportFor: () => ({
        ...t2,
        respond: req => {
          caps.push(req.maxOutputTokens);
          return t2.respond(req);
        },
      }),
      ledger,
      capUsd: 1,
      passes: 1,
      maxOutputTokens: 400,
    });
    expect(caps).toEqual([400, 400]);
    const report = formatReport(r.rows, r.skipped, {
      points: 2,
      passes: 1,
      capUsd: 1,
      spentUsd: 0,
      timeoutMs: 15000,
    });
    expect(report).toContain('measured with a 15 s limit');
    // The planner limit is 5 s since 2026-10-22; 3.5 s kept for comparison.
    expect(report).toMatch(
      /\| warm p50 \/ p95 \| within 5 s \| within 3\.5 s \(old limit\) \|/,
    );
    expect(report).toMatch(/\| claude-haiku-5-5 \| 2 \| 0 \(0%\) \| 800 ms \| 1 \| 800 \/ 800 ms \| 2 \(100%\) \| 2 \(100%\) \|/);
    expect(report).toContain('## Planner token usage (first successful calls)');
    expect(report).toContain('## Request timing');
    // The fake reports 6000 input tokens, none cached, 120 output.
    expect(report).toMatch(/\| claude-haiku-5-5 \| [^|]+ \| 1 \| 6000 \| 0 \| 0 \| 120 \|/);
  });

  it('a capped run makes no call past the cap', async () => {
    let file: SpendFile = {
      days: {},
      runs: [{ id: 'r2', at: 'now', capUsd: 0.000001, usd: 0, models: [] }],
    };
    const ledger = fileLedger(
      () => JSON.parse(JSON.stringify(file)),
      f => (file = f),
      'r2',
      'd',
    );
    const respond = jest.fn();
    const r = await runLive(
      points.slice(0, 2),
      ['claude-sonnet-5-5', 'claude-haiku-5-5'],
      {
        transportFor: () => ({
          provider: 'fake',
          checkModel: async id => ({ ok: true, id }),
          respond,
        }),
        ledger,
        capUsd: 0.000001,
        passes: 2,
      },
    );
    expect(respond).not.toHaveBeenCalled();
    expect(r.capped).toBe(true);
    expect(r.skipped.map(s => s.model)).toEqual([
      'claude-sonnet-5-5',
      'claude-haiku-5-5',
    ]);
  });

  it('readable: French runs marked, math blocks labelled; env parsing never needs the value printed', () => {
    expect(readable(wire)).toEqual([
      'action: ask_clarify',
      'diagnosis: - (ask)',
      '  1. شنوّة اللي موش واضح؟',
      '  2. نحب مثال',
    ]);
    expect(parseEnv('# c\nCLAUDE_API_KEY=abc\nX="y"\n')).toEqual({
      CLAUDE_API_KEY: 'abc',
      X: 'y',
    });
  });
});

describe('simulation report: rejection reasons and near misses (2026-10-22)', () => {
  const row = (over: Partial<RunRow>): RunRow => ({
    model: 'm',
    pass: 1,
    pointId: 'p',
    reason: 'unknown_wrong',
    outcome: 'rejected',
    reasons: [],
    latencyMs: 100,
    usable: false,
    ...over,
  });
  const report = formatReport(
    [
      row({ pointId: 'a', reasons: ['final_answer_early'] }),
      row({ pointId: 'b', reasons: ['option_list'] }),
      row({ pointId: 'c', reasons: ['rtl_formula_in_text'] }),
      row({ pointId: 'd', reasons: ['number_not_allowed', 'text_too_long'] }),
      row({ pointId: 'e', outcome: 'timeout' }),
      row({
        pointId: 'f',
        outcome: 'ok',
        usable: true,
        nearMisses: ['word:aucunne~aucune', 'value-part:10'],
      }),
    ],
    [],
    { points: 6, passes: 1, capUsd: 1, spentUsd: 0 },
  );

  it('counts each rejection reason per model, in named groups', () => {
    expect(report).toContain('## Rejection reasons');
    expect(report).toMatch(/\| leak \(final_answer_early\) \| 1 \|/);
    expect(report).toMatch(/\| option list \(option_list\) \| 1 \|/);
    expect(report).toMatch(/\| rtl_formula_in_text \| 1 \|/);
    expect(report).toMatch(/\| number_not_allowed \| 1 \|/);
    expect(report).toMatch(/\| text_too_long \| 1 \|/);
    expect(report).toMatch(/\| timeout \| 1 \|/);
  });

  it('lists blocks that passed but come close to the answer', () => {
    expect(report).toContain('## Near misses');
    expect(report).toContain('| m | f | word:aucunne~aucune, value-part:10 |');
  });
});
