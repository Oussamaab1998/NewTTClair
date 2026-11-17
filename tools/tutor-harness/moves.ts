/// <reference types="node" />
/**
 * A scripted student against the REAL one-move AI of the hybrid lesson
 * (src/ai/move). The script's acts are played through the conductor, as in
 * the free dry run (conduct.ts); every act that is not instant is sent to
 * the mover, built as the app builds it (src/hybrid/live.ts: an allowance,
 * createMover, routeCall). Each act prints the tier and its reason, the
 * prepared reply, the model calls with their cost, and the AI move or why
 * there is none (the refusal reasons).
 *
 *   npm run tutor -- moves --exercise bac2022p-sc-ex2 --question t2 \
 *                          --script tree-t2 --cap 1 [--dry] [--allowance app]
 *
 * PAID: each non-instant act is one to four model calls. The run keeps a
 * running total and makes a call only when its worst case still fits under
 * --cap (default $1); the first call that would pass it is not made and the
 * run stops there. --dry does everything except the network call (free): it
 * prints what would be sent and an estimate of its cost.
 *
 * --allowance open (default): the cap is the only limit, so every hard
 * moment of the script gets its call. --allowance app: the app's own daily
 * and per-question limits (src/hybrid/allowance.ts), to see what one student
 * really gets.
 *
 * Output: tools/tutor-harness/out/moves-<script>-<time>.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { StudentAct } from '../../src/ai/checks/autoCheck';
import {
  aiCostUsd,
  aiWorstCaseUsd,
  TYPICAL_MOVE_CALL,
} from '../../src/ai/config';
import {
  blocksText,
  createMover,
  type MoveCallLog,
} from '../../src/ai/move/mover';
import { profileDigest } from '../../src/ai/profile/digest';
import { createBudget, type Budget } from '../../src/ai/session/budget';
import type {
  MessagesTransport,
  SendResult,
} from '../../src/ai/transport/messagesApi';
import type { MessagesRequest } from '../../src/ai/transport/wire';
import type { LoadedExercise } from '../../src/content/loader';
import { createAllowance, routeCall } from '../../src/hybrid/allowance';
import {
  act,
  applyFallback,
  applyMove,
  questionCtx,
  startQuestion,
  view,
} from '../../src/hybrid/conductor/conductor';
import type { Mover } from '../../src/hybrid/mover';
import { templates } from '../../src/hybrid/replies/fill';
import { isTouring } from '../../src/hybrid/tour/tour';
import { memoryLedger } from '../../src/planner/llm/costCap';
import { actText, partText, type Script } from './conduct';

export const DEFAULT_CAP_USD = 1;

/** Characters per token of an ESTIMATE (the cap itself uses the worst case). */
const CHARS_PER_TOKEN = 3.2;

/** One model call the mover asked for: made, or why not. */
export interface CallRecord {
  model: string;
  promptChars: number;
  /** The most this request could cost (what the cap is checked against). */
  worstUsd: number;
  /** What it cost (a dry run: the estimate). */
  costUsd: number;
  outcome: 'sent' | 'failed' | 'dry' | 'capped';
}

/**
 * What a call would cost, for a dry run: the tools, the core prompt and the
 * pack written to the cache the first time a model sees them, read from it
 * afterwards; the situation as plain input; a typical output.
 */
function estimateUsd(body: MessagesRequest, seen: Set<string>): number {
  const prefix =
    JSON.stringify(body.tools).length +
    body.system.reduce((n, b) => n + b.text.length, 0);
  const key = `${body.model}|${body.system
    .map(b => `${b.text.length}:${b.text.slice(0, 60)}`)
    .join('|')}`;
  const cold = !seen.has(key);
  seen.add(key);
  const prefixTokens = Math.ceil(prefix / CHARS_PER_TOKEN);
  return aiCostUsd(body.model, {
    input: Math.ceil(JSON.stringify(body.messages).length / CHARS_PER_TOKEN),
    cacheRead: cold ? 0 : prefixTokens,
    cacheWrite5m: 0,
    cacheWrite1h: cold ? prefixTokens : 0,
    output: TYPICAL_MOVE_CALL.output,
  });
}

const notSent = (detail: string): SendResult => ({
  ok: false,
  error: 'disabled',
  retryable: false,
  latencyMs: 0,
  attempts: 0,
  detail,
});

/**
 * The money gate of a run, around the transport: before each call its worst
 * case (every prompt token at the dearest rate, the whole output budget)
 * must fit under what is left of the cap, else the call is NOT made and the
 * gate stays closed. Afterwards the real cost is added (a timed-out call
 * counts its worst case: it may have been billed). With no inner transport
 * (a dry run) no call is ever made and the estimate is added instead.
 */
export function cappedTransport(o: {
  inner: MessagesTransport | null;
  budget: Budget;
  onCall?: (c: CallRecord) => void;
}): MessagesTransport & { capped(): boolean } {
  let closed = false;
  const seen = new Set<string>();
  return {
    capped: () => closed,
    send: async (body, opts) => {
      const promptChars = JSON.stringify(body).length;
      const worstUsd = aiWorstCaseUsd(body.model, promptChars, body.max_tokens);
      const record = (
        outcome: CallRecord['outcome'],
        costUsd: number,
      ): void => {
        o.budget.add(costUsd);
        o.onCall?.({
          model: body.model,
          promptChars,
          worstUsd,
          costUsd,
          outcome,
        });
      };
      if (closed || o.budget.capHit(worstUsd) !== null) {
        closed = true;
        record('capped', 0);
        return notSent('capped');
      }
      if (!o.inner) {
        record('dry', estimateUsd(body, seen));
        return notSent('dry');
      }
      const r = await o.inner.send(body, opts);
      if (!r.ok) {
        record('failed', r.error === 'timeout' ? worstUsd : 0);
        return r;
      }
      let cost = aiCostUsd(r.response.model || body.model, r.response.usage);
      if (!Number.isFinite(cost)) {
        cost = aiCostUsd(body.model, r.response.usage);
      }
      record('sent', Number.isFinite(cost) ? cost : worstUsd);
      return r;
    },
  };
}

export interface MovesOptions {
  loaded: LoadedExercise;
  raw: never;
  questionId: string;
  acts: readonly StudentAct[];
  capUsd: number;
  /** null: a dry run, no network call. */
  transport: MessagesTransport | null;
  /** 'open': the cap is the only limit. 'app': the app's daily and per-question limits too. */
  allowance: 'open' | 'app';
}

export interface MovesReport {
  /** The transcript (Markdown lines). */
  lines: string[];
  /** Acts played (the run may stop early). */
  acts: number;
  /** Model calls made (a dry run: calls that would be made). */
  calls: number;
  /** AI moves shown. */
  moves: number;
  /** Real dollars (a dry run: the estimate). */
  spentUsd: number;
  /** The cap closed the run before a call. */
  stopped: boolean;
}

const usd = (n: number): string => `$${n.toFixed(4)}`;

const NO_LIMIT = Number.MAX_SAFE_INTEGER;

export async function runMoves(o: MovesOptions): Promise<MovesReport> {
  const dry = o.transport === null;
  const ctx = questionCtx(o.loaded, o.raw, o.questionId);
  const budget = createBudget({ sessionCapUsd: o.capUsd });
  const records: CallRecord[] = [];
  const logs: MoveCallLog[] = [];
  const transport = cappedTransport({
    inner: o.transport,
    budget,
    onCall: c => records.push(c),
  });
  // The app's construction (src/hybrid/live.ts): an allowance, the mover, and
  // the tier the allowance lets this act have.
  const allowance = createAllowance(
    o.allowance === 'app'
      ? { ledger: memoryLedger() }
      : {
          ledger: memoryLedger(),
          dailyUsd: NO_LIMIT,
          perQuestion: { light: NO_LIMIT, deep: NO_LIMIT, usd: NO_LIMIT },
        },
  );
  const inner = createMover({
    transport,
    allowance,
    profileDigest: profileDigest(null, ctx.pack.notes),
    onCall: log => logs.push(log),
  });
  const mover: Mover = async (c, req, signal) => {
    const tier = routeCall(req.out, allowance);
    if (!tier) {
      return null;
    }
    return inner(
      c,
      tier === req.out.tier ? req : { ...req, out: { ...req.out, tier } },
      signal,
    );
  };

  let state = startQuestion(ctx);
  const md: string[] = [];
  let played = 0;
  let calls = 0;
  let moves = 0;
  let stopped = false;
  for (const [i, studentAct] of o.acts.entries()) {
    const before = isTouring(ctx, state)
      ? { frameId: 'trip', type: 'map' }
      : view(ctx, state);
    if (!before) {
      md.push(`> the question ended before act ${i + 1}`, '');
      break;
    }
    const r = act(ctx, state, studentAct);
    played += 1;
    md.push(
      `### ${i + 1}. ${before.frameId} (${before.type})`,
      `**Student:** ${actText(studentAct)}`,
    );
    const reply = r.out.reply.map(partText).filter(t => t !== '');
    if (r.out.tier === 'instant') {
      state = r.state;
      md.push(
        `**[instant]** ${r.out.reason}${
          r.out.advanced ? ' → next step' : ''
        } (no AI call)`,
        ...reply,
        '',
      );
      continue;
    }
    records.length = 0;
    logs.length = 0;
    const move = await mover(ctx, {
      act: studentAct,
      out: r.out,
      state: r.state,
    });
    md.push(
      `**[${r.out.tier}:${r.out.reason}]**${
        r.out.advanced ? ' → next step' : ''
      }`,
      'Prepared reply (what he reads when there is no AI move):',
      ...(reply.length > 0 ? reply : ['- (nothing)']),
    );
    const filled = templates(ctx, r.state, r.out);
    if (filled) {
      md.push(`- with his numbers (reply template): ${blocksText(filled)}`);
    }
    for (const [k, c] of records.entries()) {
      const log = c.outcome === 'sent' ? logs.shift() : undefined;
      md.push(
        c.outcome === 'capped'
          ? `- call ${k + 1} NOT made: ${c.model}, its worst case ${usd(
              c.worstUsd,
            )} would pass the cap (${usd(budget.spentUsd())} of ${usd(
              o.capUsd,
            )} spent)`
          : c.outcome === 'dry'
          ? `- call ${k + 1} (dry, not sent): ${c.model}, ${
              c.promptChars
            } characters; estimate ${usd(c.costUsd)}, worst case ${usd(
              c.worstUsd,
            )}`
          : c.outcome === 'failed'
          ? `- call ${k + 1} failed: ${c.model}; counted ${usd(c.costUsd)}`
          : `- call ${k + 1}: ${c.model}, ${
              log
                ? `stop ${log.stopReason}, tools [${log.tools.join(
                    ', ',
                  )}], ${Math.round(log.latencyMs)} ms, in ${
                    log.usage.input
                  } / cache read ${log.usage.cacheRead} / cache write ${
                    log.usage.cacheWrite5m + log.usage.cacheWrite1h
                  } / out ${log.usage.output}, `
                : ''
            }cost ${usd(c.costUsd)}`,
      );
      if (log && log.rejected.length > 0) {
        md.push(...log.rejected.map(x => `  - refused: ${x}`));
      }
    }
    calls += records.filter(c => c.outcome !== 'capped').length;
    if (transport.capped()) {
      stopped = true;
      md.push(
        `> cap reached: the run stops before this call (${usd(
          budget.spentUsd(),
        )} of ${usd(o.capUsd)}).`,
        '',
      );
      break;
    }
    if (move) {
      moves += 1;
      state = applyMove(r.state, move);
      md.push(
        `**AI move** (${move.tier}, ${usd(move.costUsd)}${
          move.case ? `, on the small case ${move.case.id}` : ''
        }): ${blocksText(move.blocks)}`,
      );
    } else {
      state = applyFallback(r.state, r.out);
      md.push(
        `**No AI move**: the prepared reply is shown${
          records.length === 0
            ? ' (the allowance did not permit a call)'
            : dry
            ? ' (dry run)'
            : ''
        }.`,
      );
    }
    md.push(
      `Running total: ${usd(budget.spentUsd())}${
        dry ? ' (estimate)' : ''
      } of ${usd(o.capUsd)}`,
      '',
    );
  }
  return {
    lines: md,
    acts: played,
    calls,
    moves,
    spentUsd: budget.spentUsd(),
    stopped,
  };
}

/** A script by name (tools/tutor-harness/scripts/<name>.json) or by path. */
function readScript(root: string, name: string): Script {
  const candidates = [
    path.join(root, 'tools/tutor-harness/scripts', `${name}.json`),
    path.join(root, 'tools/tutor-harness/scripts', name),
    path.resolve(root, name),
  ];
  const file = candidates.find(f => existsSync(f));
  if (!file) {
    throw new Error(
      `no script ${name} (looked in tools/tutor-harness/scripts)`,
    );
  }
  return JSON.parse(readFileSync(file, 'utf8')) as Script;
}

export async function movesCommand(
  a: Record<string, string>,
  load: (exerciseId: string) => { loaded: LoadedExercise; raw: never },
  root: string,
  outDir: string,
  /** The live transport (asked for only when the run is not dry). */
  live: () => MessagesTransport,
): Promise<void> {
  const name = a.script;
  if (!name) {
    throw new Error('moves needs --script <name or file.json>');
  }
  const script = readScript(root, name);
  const exerciseId = a.exercise ?? script.exercise;
  const questionId = a.question ?? script.question;
  const capUsd = a.cap === undefined ? DEFAULT_CAP_USD : Number(a.cap);
  if (!Number.isFinite(capUsd) || capUsd <= 0) {
    throw new Error('--cap must be a positive number of dollars');
  }
  const dry = a.dry !== undefined;
  const allowance = a.allowance === 'app' ? 'app' : 'open';
  const { loaded, raw } = load(exerciseId);
  const report = await runMoves({
    loaded,
    raw,
    questionId,
    acts: script.acts,
    capUsd,
    transport: dry ? null : live(),
    allowance,
  });
  const label = path.basename(name).replace(/\.json$/, '');
  const md = [
    `# Moves run: ${label}${dry ? ' (dry: no call was made)' : ''}`,
    `Exercise ${exerciseId}, question ${questionId}; cap ${usd(
      capUsd,
    )}; allowance ${allowance}. Every act that is not instant goes to the real mover (src/ai/move).`,
    script.about ? `Script: ${script.about}` : '',
    '',
    ...report.lines,
    '## Totals',
    `- acts played: ${report.acts} of ${script.acts.length}; model calls ${
      dry ? 'that would be made' : 'made'
    }: ${report.calls}; AI moves shown: ${report.moves}`,
    `- ${dry ? 'estimated cost' : 'cost'}: ${usd(report.spentUsd)} of ${usd(
      capUsd,
    )}${report.stopped ? '; STOPPED by the cap' : ''}`,
  ];
  mkdirSync(outDir, { recursive: true });
  const file = path.join(
    outDir,
    `moves-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`,
  );
  writeFileSync(file, md.join('\n'));
  console.log(md.slice(-3).join('\n'));
  console.log(`transcript: ${path.relative(root, file)}`);
}
