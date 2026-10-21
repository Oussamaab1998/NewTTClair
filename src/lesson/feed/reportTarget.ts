/**
 * What a Report button on a feed item refers to (docs/FEEDBACK_AND_TRUST.md):
 * a stable block id, the source, the trust label, and where to find the
 * component snapshot. Where the student reaches it: `reportPath` (DESIGN.md §3,
 * product owner 2026-10-21). AI blocks always show a visible Report button.
 */
import type { JsonObject } from '../../components/contract';
import type { LessonContent } from '../session/lesson';
import { stepForRef } from '../session/lesson';
import type { FeedItem, TrustLabel } from '../session/types';

export interface ReportTarget {
  blockId: string;
  source: 'lesson' | 'ai' | 'component';
  trust: TrustLabel;
  /** Snapshot registry key (component blocks and question cards). */
  snapshotKey?: string;
  componentSpec?: JsonObject;
  /** The visible button instead of the "..." menu. */
  prominent: boolean;
  /** Feed item key (UI events). */
  itemKey: string;
  /** AI blocks: the LLM request that produced them. */
  llmRequestId?: string;
}

const reviewedCache = new WeakMap<object, Set<string>>();

/** Block ids whose authored trust says reviewed (walks the exercise JSON once). */
export function reviewedBlockIds(content: LessonContent): Set<string> {
  const ex = content.loaded.exercise;
  const cached = reviewedCache.get(ex);
  if (cached) {
    return cached;
  }
  const out = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node !== null && typeof node === 'object') {
      const o = node as Record<string, unknown>;
      const trust = o.trust as { reviewed?: unknown } | undefined;
      if (typeof o.blockId === 'string' && trust?.reviewed === true) {
        out.add(o.blockId);
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(ex);
  reviewedCache.set(ex, out);
  return out;
}

function lessonLabel(content: LessonContent, blockId?: string): TrustLabel {
  return blockId !== undefined && reviewedBlockIds(content).has(blockId)
    ? 'lesson_reviewed'
    : 'lesson_unreviewed';
}

/** Null for items that are not content (student bubbles, dividers). */
export function reportTarget(
  item: FeedItem,
  content: LessonContent,
): ReportTarget | null {
  const runtimeId = `rt:${content.question.id}:${item.key}`;
  const base = (blockId: string | undefined) => {
    const trust: TrustLabel = item.trust ?? lessonLabel(content, blockId);
    return {
      blockId: blockId ?? runtimeId,
      trust,
      source: (trust === 'ai_generated' ? 'ai' : 'lesson') as 'ai' | 'lesson',
      prominent: trust === 'ai_generated',
      itemKey: item.key,
      ...(item.llmRequestId !== undefined && {
        llmRequestId: item.llmRequestId,
      }),
    };
  };
  switch (item.kind) {
    case 'student':
    case 'variant_start':
    case 'deep_dive_start':
    case 'return':
    case 'done':
    case 'thinking':
      return null;
    case 'tutor':
    case 'math':
      return base(item.blockId);
    case 'component': {
      const b = base(item.blockId);
      return {
        ...b,
        source: b.source === 'ai' ? 'ai' : 'component',
        snapshotKey: item.blockId,
        componentSpec: {
          component: item.spec.component,
          props: item.spec.props,
        },
      };
    }
    case 'question': {
      const step = stepForRef(content, item.ref);
      const b = base(step.blockId);
      const isComponent = step.kind === 'component';
      return {
        ...b,
        source: isComponent ? 'component' : b.source,
        snapshotKey: item.key,
        ...(isComponent && {
          componentSpec: {
            component: step.component.component,
            props: step.component.props,
          },
        }),
        prominent: b.prominent || item.status === 'active',
      };
    }
    default:
      return base(undefined);
  }
}

/**
 * How a block's trust label and Report are reached (DESIGN.md §3, no per-block icon):
 * - text: the tutor long-press menu (explain / why / example), Report last;
 * - longpress: a long-press on the block opens its menu (trust label + Report);
 * - title: a long-press on a choice card's title (its buttons stay plain taps);
 * - card: the question card's single "⋯";
 * - owner: interactive visuals (taps, sliders, scroll: no long-press) are a row
 *   in the "⋯" of the card that owns them (`visualOwners`).
 * null: not content (student bubbles, dividers, done, thinking).
 * AI blocks also keep their visible Report button and trust line.
 */
export type ReportPath = 'text' | 'longpress' | 'title' | 'card' | 'owner';

export function reportPath(item: FeedItem): ReportPath | null {
  switch (item.kind) {
    case 'student':
    case 'variant_start':
    case 'deep_dive_start':
    case 'return':
    case 'done':
    case 'thinking':
      return null;
    case 'tutor':
      return item.longPress && item.blockId !== undefined
        ? 'text'
        : 'longpress';
    case 'statement':
    case 'math':
    case 'feedback':
    case 'hint':
    case 'answer':
    case 'ask_answer':
    case 'writeup':
    case 'component_fallback':
      return 'longpress';
    case 'choice_card':
      return 'title';
    case 'question':
      return 'card';
    case 'component':
      return 'owner';
    default: {
      const never: never = item;
      return never;
    }
  }
}

/**
 * Visual component key -> the question card whose "⋯" carries its Report: the
 * next question card after it in the feed, or, for a visual with no card
 * after it (the end of a part), the last card before it.
 */
export function visualOwners(items: readonly FeedItem[]): Map<string, string> {
  const owners = new Map<string, string>();
  let lastCard: string | undefined;
  let waiting: string[] = [];
  for (const item of items) {
    if (item.kind === 'component') {
      waiting.push(item.key);
    } else if (item.kind === 'question') {
      for (const v of waiting) {
        owners.set(v, item.key);
      }
      waiting = [];
      lastCard = item.key;
    }
  }
  if (lastCard !== undefined) {
    for (const v of waiting) {
      owners.set(v, lastCard);
    }
  }
  return owners;
}
