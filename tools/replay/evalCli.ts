/// <reference types="node" />
/**
 * `npm run replay -- eval ...` (AI tutor v2, D22). Keys: CLAUDE_API_KEY /
 * OPENAI_API_KEY from the shell, else from .env.llm.local (same parser as
 * tools/llm-config/gen.js); never printed. Outputs go to tools/replay/out/
 * (gitignored): the report, a JSONL of every call (raw outputs included, for
 * local review only), the darija review sample and the spend ledger.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  ANTHROPIC_VERSION,
  anthropicBody,
  createAnthropicTransport,
} from '../../src/planner/llm/anthropic';
import { DEFAULT_OPENAI_BASE_URL } from '../../src/config/llm';
import { modelInfo } from '../../src/planner/llm/models';
import { createOpenAiTransport } from '../../src/planner/llm/openai';
import {
  DEFAULT_MODELS,
  EVAL_TIMEOUT_MS,
  estimate,
  fileLedger,
  formatEstimate,
  formatReport,
  formatReview,
  loadExercises,
  logPoints,
  parseEnv,
  runLive,
  scenarioPoints,
  type CountTokens,
  type DecisionPoint,
  type ScenarioFile,
  type SpendFile,
} from './evalLib';
import { readLog } from './lib';

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'tools', 'replay', 'out');
const SPEND = path.join(OUT, 'spend.json');
const FIRST_RUN_MAX_USD = 5;
const DEFAULT_LOG = 'docs/samples/ex2_session_1.converted.jsonl';

const flag = (args: string[], name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function keys() {
  const envPath = path.join(ROOT, '.env.llm.local');
  const file = existsSync(envPath)
    ? parseEnv(readFileSync(envPath, 'utf8'))
    : {};
  return {
    anthropic: process.env.CLAUDE_API_KEY ?? file.CLAUDE_API_KEY ?? '',
    openai: process.env.OPENAI_API_KEY ?? file.OPENAI_API_KEY ?? '',
    openaiBaseUrl: file.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL,
  };
}

function points(args: string[]): DecisionPoint[] {
  const exercises = loadExercises();
  const dir = path.join(ROOT, 'tools', 'replay', 'scenarios');
  const out: DecisionPoint[] = [];
  for (const f of ['A1.json', '2a.json']) {
    const file = JSON.parse(
      readFileSync(path.join(dir, f), 'utf8'),
    ) as ScenarioFile;
    out.push(...scenarioPoints(file, exercises));
  }
  if (!args.includes('--no-log')) {
    const logPath = flag(args, '--log') ?? DEFAULT_LOG;
    const { events } = readLog(readFileSync(path.join(ROOT, logPath), 'utf8'));
    out.push(...logPoints(events, exercises, path.basename(logPath)));
  }
  return out;
}

/** Anthropic's free token counter (POST /v1/messages/count_tokens; no generation). */
function anthropicCounter(apiKey: string): CountTokens {
  return async (model, system, parts) => {
    const body = anthropicBody({
      requestId: 'count',
      model,
      instructions: system,
      ...(parts.length > 1 && { inputPrefix: parts[0]! }),
      input: parts[parts.length - 1]!,
      format: {
        name: 'x',
        original: { type: 'object' },
        strict: {},
        zod: null as never,
      },
      maxOutputTokens: 1,
      timeoutMs: 30000,
    } as never);
    const res = await fetch(
      'https://api.anthropic.com/v1/messages/count_tokens',
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        // Prompt only (system + messages): the endpoint does not document output_config.
        body: JSON.stringify({
          model,
          system: body.system,
          messages: body.messages,
        }),
      },
    );
    if (!res.ok) {
      let type = 'unknown';
      try {
        const j = (await res.json()) as { error?: { type?: string } };
        type = String(j.error?.type ?? 'unknown')
          .replace(/[^a-z_]/g, '')
          .slice(0, 40);
      } catch {
        // no body
      }
      throw new Error(`count_tokens ${res.status} ${type}`);
    }
    const j = (await res.json()) as { input_tokens?: number };
    if (typeof j.input_tokens !== 'number') {
      throw new Error('count_tokens: no input_tokens');
    }
    return j.input_tokens;
  };
}

function readSpend(): SpendFile {
  try {
    return JSON.parse(readFileSync(SPEND, 'utf8')) as SpendFile;
  } catch {
    return { days: {}, runs: [] };
  }
}

export async function runEval(args: string[]): Promise<void> {
  const models = (flag(args, '--models') ?? DEFAULT_MODELS.join(','))
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  const unknown = models.filter(m => !modelInfo(m));
  if (unknown.length > 0) {
    throw new Error(`no price in models.ts for: ${unknown.join(', ')}`);
  }
  const passes = Number(flag(args, '--passes') ?? 2);
  const pts = points(args);
  const k = keys();
  const bySource = `${
    pts.filter(p => p.source === 'scenario').length
  } scenario + ${pts.filter(p => p.source === 'log').length} logged`;
  const reasons = new Map<string, number>();
  pts.forEach(p => reasons.set(p.reason, (reasons.get(p.reason) ?? 0) + 1));
  process.stdout.write(
    `decision points: ${pts.length} (${bySource}); triggers: ${[...reasons]
      .map(([r, n]) => `${r} ${n}`)
      .join(', ')}\n`,
  );

  if (args.includes('--estimate')) {
    if (
      !k.anthropic &&
      models.some(m => modelInfo(m)?.provider === 'anthropic')
    ) {
      throw new Error('no CLAUDE_API_KEY (shell or .env.llm.local)');
    }
    const rows = await estimate(
      pts,
      models,
      anthropicCounter(k.anthropic),
      passes,
    );
    process.stdout.write(
      `\n${formatEstimate(rows, { points: pts.length, passes })}\n`,
    );
    return;
  }

  if (!args.includes('--live')) {
    throw new Error('usage: eval --estimate | eval --live --cap-usd <n>');
  }
  const capUsd = Number(flag(args, '--cap-usd'));
  if (!(capUsd > 0)) {
    throw new Error('--live needs --cap-usd <n>');
  }
  mkdirSync(OUT, { recursive: true });
  const spend = readSpend();
  if (spend.runs.length === 0 && capUsd > FIRST_RUN_MAX_USD) {
    throw new Error(`the first live run is capped at $${FIRST_RUN_MAX_USD}`);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `run-${stamp}`;
  spend.runs.push({
    id: runId,
    at: new Date().toISOString(),
    capUsd,
    usd: 0,
    models,
  });
  writeFileSync(SPEND, `${JSON.stringify(spend, null, 2)}\n`);
  const day = new Date().toISOString().slice(0, 10);
  const ledger = fileLedger(
    readSpend,
    f => writeFileSync(SPEND, `${JSON.stringify(f, null, 2)}\n`),
    runId,
    day,
  );
  // Eval-only call limit (the app's planner timeout is unchanged).
  const timeoutMs = Number(flag(args, '--timeout-ms') ?? EVAL_TIMEOUT_MS);
  if (!(timeoutMs >= 1000 && timeoutMs <= 60000)) {
    throw new Error('--timeout-ms must be between 1000 and 60000');
  }
  // Eval-only planner output cap (the app keeps LLM_CONFIG).
  const maxOut = flag(args, '--max-output');
  const maxOutputTokens = maxOut !== undefined ? Number(maxOut) : undefined;
  if (maxOutputTokens !== undefined && !(maxOutputTokens >= 100)) {
    throw new Error('--max-output must be at least 100');
  }
  const r = await runLive(pts, models, {
    passes,
    timeoutMs,
    ...(maxOutputTokens !== undefined && { maxOutputTokens }),
    capUsd,
    ledger,
    log: line => process.stdout.write(`${line}\n`),
    transportFor: m => {
      const info = modelInfo(m);
      if (info?.provider === 'anthropic') {
        return k.anthropic
          ? createAnthropicTransport({ apiKey: k.anthropic, captureRaw: true })
          : null;
      }
      return k.openai
        ? createOpenAiTransport({
            apiKey: k.openai,
            baseUrl: k.openaiBaseUrl,
            captureRaw: true,
            useWire: true,
          })
        : null;
    },
    onFirstCall: (row, est) =>
      process.stdout.write(
        `\nFIRST CALL ${row.model}: charged (list price x usage) $${(
          row.costUsd ?? 0
        ).toFixed(6)} vs estimate $${est.toFixed(6)}; usage ${JSON.stringify(
          row.usage,
        )}\n\n`,
      ),
  });
  const spent = ledger.get();
  const report = formatReport(r.rows, r.skipped, {
    points: pts.length,
    passes,
    capUsd,
    spentUsd: spent,
    timeoutMs,
  });
  const base = path.join(OUT, `eval-${stamp}`);
  writeFileSync(`${base}.md`, `${report}\n`);
  writeFileSync(
    `${base}.jsonl`,
    `${r.rows.map(x => JSON.stringify(x)).join('\n')}\n`,
  );
  writeFileSync(`${base}.review.md`, `${formatReview(pts, r.rows)}\n`);
  process.stdout.write(`\n${report}\n\nwrote ${base}.md, .jsonl, .review.md\n`);
}
