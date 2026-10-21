/**
 * Local queue of student reports (docs/FEEDBACK_AND_TRUST.md) and of tutor
 * questions the app could not answer from verified content. Persisted in a
 * KeyValueStore (MMKV in the app); exported as JSONL through the share sheet,
 * read back by `npm run replay -- reports <file>`.
 * Context is attached automatically; the attached events never carry the
 * student's free text (ask text, quotes), only ids, kinds and numbers.
 */
import { z } from 'zod';

import { JsonObjectSchema, type JsonObject } from '../components/contract';
import type { KeyValueStore } from '../storage/kv';
import { EventSchema, type Event } from './events';

export const QUEUE_KEY = 'queue.reports.v1';
/** Oldest entries are dropped beyond this (export regularly). */
export const QUEUE_MAX = 300;
export const LAST_EVENTS = 20;

const Id = z.string().min(1);

export const DeviceContextSchema = z.strictObject({
  appVersion: z.string().max(40),
  platform: z.string().max(20),
  osVersion: z.string().max(40),
  locale: z.string().max(20),
});
export type DeviceContext = z.infer<typeof DeviceContextSchema>;

/** An event reduced to what helps reproduce a problem. */
export const SlimEventSchema = z.strictObject({
  t: z.string(),
  ts: z.number(),
  questionId: z.string(),
  stepId: z.string(),
  data: JsonObjectSchema,
});
export type SlimEvent = z.infer<typeof SlimEventSchema>;

export type ReportEvent = Extract<Event, { t: 'report' }>;
/** The `report` member of the event union (same validation as the log). */
const ReportEventSchema = EventSchema.options.find(
  o => o.shape.t.value === 'report',
) as unknown as z.ZodType<ReportEvent>;

export type FeedbackEvent = Extract<Event, { t: 'feedback' }>;
const FeedbackEventSchema = EventSchema.options.find(
  o => o.shape.t.value === 'feedback',
) as unknown as z.ZodType<FeedbackEvent>;

const Context = z.strictObject({
  device: DeviceContextSchema,
  lastEvents: z.array(SlimEventSchema).max(LAST_EVENTS),
  /** AI blocks: the LLM request that produced the block. */
  llmRequestId: Id.optional(),
  /** Component props of the reported block. */
  componentSpec: JsonObjectSchema.optional(),
});

export const QueueEntrySchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('report'),
    id: Id,
    event: ReportEventSchema,
    context: Context,
  }),
  z.strictObject({
    kind: z.literal('feedback'),
    id: Id,
    event: FeedbackEventSchema,
    context: Context,
  }),
  z.strictObject({
    kind: z.literal('question'),
    id: Id,
    ts: z.number(),
    exerciseId: Id,
    contentVersion: Id,
    questionId: Id,
    stepId: Id,
    /** The student's question (local only; exported for the teacher). */
    text: z.string().min(1).max(500),
    snapshot: JsonObjectSchema.optional(),
    context: Context,
  }),
]);
export type QueueEntry = z.infer<typeof QueueEntrySchema>;

/** Keys of events whose value is the student's own words. */
const FREE_TEXT_KEYS = new Set(['text', 'quoted', 'detail']);
const DROP_KEYS = new Set([
  'id',
  't',
  'ts',
  'sessionId',
  'studentId',
  'exerciseId',
  'contentVersion',
  'questionId',
  'stepId',
]);

export function slimEvent(e: Event): SlimEvent {
  const data: JsonObject = {};
  for (const [k, v] of Object.entries(e)) {
    if (!DROP_KEYS.has(k) && !FREE_TEXT_KEYS.has(k) && v !== undefined) {
      data[k] = v as JsonObject[string];
    }
  }
  return {
    t: e.t,
    ts: e.ts,
    questionId: e.questionId,
    stepId: e.stepId,
    data: JSON.stringify(data).length <= 1500 ? data : { truncated: true },
  };
}

export class LocalQueue {
  private entries: QueueEntry[];
  private readonly listeners = new Set<() => void>();

  constructor(private readonly store: KeyValueStore) {
    this.entries = LocalQueue.read(store);
  }

  /** Stored entries that no longer validate are dropped, never crash. */
  private static read(store: KeyValueStore): QueueEntry[] {
    const raw = store.getString(QUEUE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const list: unknown = JSON.parse(raw);
      return Array.isArray(list)
        ? list.flatMap(x => {
            const r = QueueEntrySchema.safeParse(x);
            return r.success ? [r.data] : [];
          })
        : [];
    } catch {
      return [];
    }
  }

  add(entry: QueueEntry): QueueEntry {
    const valid = QueueEntrySchema.parse(entry);
    this.entries = [...this.entries, valid].slice(-QUEUE_MAX);
    this.store.set(QUEUE_KEY, JSON.stringify(this.entries));
    for (const l of this.listeners) {
      l();
    }
    return valid;
  }

  all(): readonly QueueEntry[] {
    return this.entries;
  }

  count(kind?: QueueEntry['kind']): number {
    return kind
      ? this.entries.filter(e => e.kind === kind).length
      : this.entries.length;
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  toJsonl(): string {
    return this.entries.map(e => JSON.stringify(e)).join('\n');
  }

  clear() {
    this.entries = [];
    this.store.remove(QUEUE_KEY);
    for (const l of this.listeners) {
      l();
    }
  }
}

export function contextFor(
  log: readonly Event[],
  device: DeviceContext,
  extra: { llmRequestId?: string; componentSpec?: JsonObject } = {},
) {
  return {
    device,
    lastEvents: log.slice(-LAST_EVENTS).map(slimEvent),
    ...(extra.llmRequestId !== undefined && {
      llmRequestId: extra.llmRequestId,
    }),
    ...(extra.componentSpec !== undefined && {
      componentSpec: extra.componentSpec,
    }),
  };
}

/** Parses an exported JSONL file; bad lines are reported, not fatal. */
export function readQueueExport(text: string): {
  entries: QueueEntry[];
  errors: { line: number; issue: string }[];
} {
  const entries: QueueEntry[] = [];
  const errors: { line: number; issue: string }[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) {
      return;
    }
    try {
      const r = QueueEntrySchema.safeParse(JSON.parse(line));
      if (r.success) {
        entries.push(r.data);
      } else {
        errors.push({
          line: i + 1,
          issue: r.error.issues[0]?.path.join('.') ?? 'invalid',
        });
      }
    } catch {
      errors.push({ line: i + 1, issue: 'not JSON' });
    }
  });
  return { entries, errors };
}
