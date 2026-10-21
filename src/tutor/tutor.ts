/**
 * Tutor drawer answers (Phase 4 Step 6). Order:
 * 1. verified content: an ask chip of this question that matches the question;
 * 2. the LLM, when on: blocks checked by the engine (verify.ts), labelled
 *    ai_generated, unverifiable math marked "may contain a mistake";
 * 3. otherwise (LLM off, failing, capped, or nothing usable): the question is
 *    saved to the local queue and a neutral line is shown. Never a made-up
 *    answer; nothing about the AI or credit is shown.
 */
import type { Rich } from '../content/schema';
import type { LessonContent } from '../lesson/session/lesson';
import { buildTutorPack, type TutorTurn } from '../planner/llm/contextPack';
import {
  recordOf,
  type LlmCallRecord,
  type LlmRuntime,
} from '../planner/llm/runtime';
import type { JsonObject } from '../components/contract';
import { verifyTutorBlocks, type CheckedBlock } from './verify';

export type TutorAnswer =
  | { source: 'verified'; chipId: string; parts: Rich[] }
  | {
      source: 'ai';
      requestId: string;
      blocks: CheckedBlock[];
      counts: { verified: number; unverified: number; dropped: number };
      needsTeacher: boolean;
    }
  | { source: 'saved' };

export interface TutorRequest {
  content: LessonContent;
  question: string;
  stepKey: string | null;
  hintsUsed: number;
  hintCount: number;
  skills: Record<string, { status: string; representationsTried: string[] }>;
  components?: JsonObject;
  history: TutorTurn[];
}

/** Letters and digits only, lower case, Arabic diacritics removed. */
export function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(w => w.length > 1);
}

/** An ask chip whose label shares most of its words with the question. */
export function matchChip(
  content: LessonContent,
  question: string,
): { chipId: string; parts: Rich[] } | null {
  const q = new Set(normalize(question));
  if (q.size === 0) {
    return null;
  }
  let best: { chipId: string; parts: Rich[]; score: number } | null = null;
  for (const chip of content.question.askChips ?? []) {
    const label = chip.label;
    const words = normalize(
      [
        ...(label.ar ?? []).map(r => ('ar' in r ? r.ar : r.fr)),
        label.fr ?? '',
        label.math ?? '',
      ].join(' '),
    );
    if (words.length === 0) {
      continue;
    }
    const shared = words.filter(w => q.has(w)).length;
    const score = shared / words.length;
    if (score >= 0.75 && (!best || score > best.score)) {
      best = { chipId: chip.id, parts: chip.answer, score };
    }
  }
  return best && { chipId: best.chipId, parts: best.parts };
}

export interface TutorOutcome {
  answer: TutorAnswer;
  /** Present when the LLM was asked (or a call was skipped). */
  record?: LlmCallRecord;
}

export async function answerQuestion(
  req: TutorRequest,
  llm:
    | { runtime: LlmRuntime; newRequestId: () => string; timeoutMs: number }
    | undefined,
): Promise<TutorOutcome> {
  const chip = matchChip(req.content, req.question);
  if (chip) {
    return { answer: { source: 'verified', ...chip } };
  }
  const client = llm?.runtime.client;
  if (!llm || !client) {
    return { answer: { source: 'saved' } };
  }
  const requestId = llm.newRequestId();
  const skipped = (outcome: 'disabled' | 'capped'): TutorOutcome => ({
    answer: { source: 'saved' },
    record: {
      requestId,
      purpose: 'tutor',
      model: client.model,
      outcome,
      statusClass: 'none',
      latencyMs: 0,
    },
  });
  if (llm.runtime.mode() !== 'llm') {
    return skipped('disabled');
  }
  if (!llm.runtime.take()) {
    return skipped('capped');
  }
  const pack = buildTutorPack(req.content, {
    stepKey: req.stepKey,
    hintsUsed: req.hintsUsed,
    hintCount: req.hintCount,
    skills: req.skills,
    ...(req.components && { components: req.components }),
    history: req.history,
    studentText: req.question,
  });
  const r = await client.tutor(pack, { requestId, timeoutMs: llm.timeoutMs });
  const out = await tutorOutcome(req, r, requestId);
  if (llm.runtime.devRaw && r.raw !== undefined && out.record) {
    llm.runtime.devRaw.add({
      requestId,
      purpose: 'tutor',
      model: r.model,
      outcome: out.record.outcome,
      reasons: out.record.reasons ?? [],
      raw: r.raw,
    });
  }
  return out;
}

async function tutorOutcome(
  req: TutorRequest,
  r: Awaited<ReturnType<NonNullable<LlmRuntime['client']>['tutor']>>,
  requestId: string,
): Promise<TutorOutcome> {
  if (!r.ok) {
    return { answer: { source: 'saved' }, record: recordOf('tutor', r) };
  }
  const v = verifyTutorBlocks(r.value.blocks, {
    content: req.content,
    stepKey: req.stepKey,
    hintsUsed: req.hintsUsed,
    hintCount: req.hintCount,
  });
  const reasons = v.dropped.map(d => `dropped:${d.reason}`);
  if (v.blocks.length === 0) {
    return {
      answer: { source: 'saved' },
      record: recordOf('tutor', r, 'rejected', reasons),
    };
  }
  return {
    answer: {
      source: 'ai',
      requestId,
      blocks: v.blocks,
      counts: v.counts,
      needsTeacher: r.value.needsTeacher,
    },
    record: recordOf(
      'tutor',
      r,
      'ok',
      reasons.length > 0 ? reasons : undefined,
    ),
  };
}
